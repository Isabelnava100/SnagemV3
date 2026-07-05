import {
  Avatar,
  Box,
  Flex,
  Group,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { clickable } from "../../../lib/a11y";
import { getItemImageURL } from "../../../helpers";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getItems } from "../../../queries/dashboard";
import { getMysteryBoxes } from "../../../queries/game";

/**
 * Items tab (moved off the dashboard top block). Categories stack vertically
 * on mobile and lay out in a responsive grid on desktop, no more sideways
 * scrolling. Mystery-box items open the reveal pop-up.
 */
export default function Items() {
  const { user } = useAuth();
  const { isOverLg } = useMediaQuery();
  const { data, isPending: isLoading } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user?.uid as string),
  });
  const { data: boxConfigs } = useQuery({
    queryKey: ["mystery-boxes"],
    queryFn: getMysteryBoxes,
  });
  const [mysteryItem, setMysteryItem] = React.useState<{ id: string; name: string } | null>(null);

  const isMysteryBox = (itemId: string, name: string, category: string) =>
    !!boxConfigs?.[itemId] || /mystery|box/i.test(name) || /mystery|box/i.test(category);

  if (isLoading) return <SectionLoader />;

  const categories = [...new Set((data ?? []).map((item) => item.category))].sort();

  if (!categories.length) {
    return (
      <EmptyMessage
        title="No items yet"
        description="Earn items by participating in the Forums, completing Missions, buying at the Marketplace or playing Activities. Legacy user? Ask an admin to import your old items."
      />
    );
  }

  return (
    <Stack gap={14}>
      <Title order={2} c="white" size={isOverLg ? 24 : 20} fw={400}>
        Your Items
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing={14}>
        {categories.map((categoryName) => (
          <Stack key={categoryName} gap={8}>
            <Title
              order={3}
              size={isOverLg ? 20 : 16}
              c="white"
              bg="#7e2c75a1"
              px={16}
              py={8}
              style={{ borderRadius: 12 }}
            >
              {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
            </Title>
            <ScrollArea.Autosize mah={280}>
              <Stack gap={8}>
                {(data ?? [])
                  .filter((item) => item.category === categoryName)
                  .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                  .map((item) => {
                    const box = isMysteryBox(item.id, item.name, item.category);
                    // Show the admin's custom box name to players when set.
                    const displayName = boxConfigs?.[item.id]?.name || item.name;
                    return (
                      <Box
                        key={item.id}
                        bg="#3e3d3dba"
                        {...(box
                          ? {
                              ...clickable(() => setMysteryItem({ id: item.id, name: displayName })),
                              "aria-label": `Open ${displayName}`,
                            }
                          : {})}
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          cursor: box ? "pointer" : undefined,
                        }}
                      >
                        <Flex w="100%" justify="space-between" align="center">
                          <Group px={14} py={8} gap={8} wrap="nowrap">
                            <Avatar src={getItemImageURL(item.filePath)} alt={displayName} size={36} />
                            <Text c="white" fz={15} lineClamp={1}>
                              {displayName}
                            </Text>
                          </Group>
                          <Box bg="#525151" py={8} px={18} style={{ borderTopLeftRadius: 40, flexShrink: 0 }}>
                            <Text c="white" fz={isOverLg ? 26 : 20}>
                              x{item.quantity}
                            </Text>
                          </Box>
                        </Flex>
                      </Box>
                    );
                  })}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        ))}
      </SimpleGrid>

      <MysteryBoxModal
        item={mysteryItem}
        openable={!!mysteryItem && !!boxConfigs?.[mysteryItem.id]}
        onClose={() => setMysteryItem(null)}
      />
    </Stack>
  );
}

function MysteryBoxModal(props: {
  item: { id: string; name: string } | null;
  openable: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [result, setResult] = React.useState("");
  const [error, setError] = React.useState("");

  const openMutation = useMutation({
    mutationFn: async () => {
      const { callOpenMysteryBox } = await import("../../forum/functionsClient");
      return callOpenMysteryBox(props.item!.id);
    },
    onSuccess: ({ reward }) => {
      setResult(`The box pops open... you got ${reward.qty}x ${reward.name}!`);
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["get-currencies", user?.uid] });
    },
    onError: async (err) => {
      const { callableMessage } = await import("../../forum/functionsClient");
      setError(callableMessage(err, "The box would not open. Try again."));
    },
  });

  const close = () => {
    setResult("");
    setError("");
    props.onClose();
  };

  return (
    <Modal
      opened={!!props.item}
      onClose={close}
      title={<Text fw={700}>{props.item?.name}</Text>}
      centered
      radius={12}
    >
      {result ? (
        <Text fz={15} c="green.0">
          {result}
        </Text>
      ) : (
        <Stack gap={10}>
          <Text fz={14}>Something is rattling inside...</Text>
          {props.openable ? (
            <GradientButtonPrimary
              radius="xl"
              loading={openMutation.isPending}
              onClick={() => openMutation.mutateAsync()}
            >
              Open the Box
            </GradientButtonPrimary>
          ) : (
            <Text fz={13} c="dimmed">
              This box cannot be opened yet. An admin still needs to fill it.
            </Text>
          )}
          {error && (
            <Text fz={13} c="#E35C65">
              {error}
            </Text>
          )}
        </Stack>
      )}
    </Modal>
  );
}
