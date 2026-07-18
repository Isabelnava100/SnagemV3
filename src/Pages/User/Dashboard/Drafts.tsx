import {
  ActionIcon,
  Badge,
  Button,
  Flex,
  Group,
  Image,
  Paper,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { Draft } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { clickable } from "../../../lib/a11y";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit } from "../../../icons";
import { getDrafts } from "../../../queries/dashboard";
import formatter from "../../../utils/date";

export default function Drafts() {
  const { user } = useAuth();
  const { data, isPending: isLoading, isError } = useQuery({
    queryKey: ["get-drafts", user?.uid],
    queryFn: () => getDrafts(user?.uid as string),
  });
  const { isOverLg } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  if (!data.length)
    return <EmptyMessage title="No drafts" description="You currently have no drafts created" />;

  return (
    <Stack>
      <DraftsHeader count={data.length} />
      <SimpleGrid cols={isOverLg ? 2 : 1}>
        {data.map((draft) => (
          <SingleDraft key={draft.id} {...draft} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/** Draft limits (Q3): 60 max, warning from 55, clear-all offered from 40. */
function DraftsHeader(props: { count: number }) {
  const { count } = props;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const clearMutation = useMutation({
    mutationFn: async () => {
      const { deleteAllDrafts } = await import("../../forum/mutations");
      await deleteAllDrafts(user!.uid);
    },
    onSuccess: () => {
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["get-drafts", user?.uid] });
    },
  });

  return (
    <Flex justify="space-between" align="center" gap={10} wrap="wrap">
      <Text c={count >= 55 ? "#E54156" : "dimmed"} fz={13}>
        {count}/60 drafts
        {count >= 60
          ? ". You're at the limit; delete drafts to save new ones."
          : count >= 55
            ? ". You'll run out of draft space soon."
            : ""}
      </Text>
      {count >= 40 &&
        (confirming ? (
          <Group gap={6}>
            <Text fz={13} c="white">
              Delete ALL {count} drafts?
            </Text>
            <ActionIcon
              variant="light"
              color="red"
              loading={clearMutation.isPending}
              onClick={() => clearMutation.mutateAsync()}
              title="Yes, delete all"
            >
              ✓
            </ActionIcon>
            <ActionIcon variant="light" color="gray" onClick={() => setConfirming(false)} title="Cancel">
              ✕
            </ActionIcon>
          </Group>
        ) : (
          <Text
            fz={13}
            c="#E54156"
            td="underline"
            style={{ cursor: "pointer" }}
            {...clickable(() => setConfirming(true))}
          >
            Clear all drafts
          </Text>
        ))}
    </Flex>
  );
}

/** Per-draft delete with a confirmation warning (drafts can't be recovered). */
function DeleteDraft(props: { draftId: string }) {
  const { draftId } = props;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { deleteDraft } = await import("../../forum/mutations");
      await deleteDraft(user.uid, draftId);
    },
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["get-drafts", user?.uid] });
    },
  });

  return (
    <Popover opened={opened} onChange={close} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          color="red"
          variant="filled"
          radius="xl"
          size="lg"
          title="Delete draft"
          onClick={open}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20">
        <Stack gap={8}>
          <Text c="white" fz={14}>
            Delete this draft? This can&apos;t be undone.
          </Text>
          <Group gap={8} justify="flex-end">
            <Button size="xs" color="gray" variant="light" onClick={close}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="red"
              loading={removeMutation.isPending}
              onClick={() => removeMutation.mutateAsync()}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function SingleDraft(props: Draft) {
  const { isOverSm } = useMediaQuery();
  return (
    <Paper bg="#3E3D3D" radius={15} py={0} pos="relative" sx={{ overflow: "hidden" }}>
      <Flex
        justify="space-between"
        sx={{ flexDirection: isOverSm ? "row" : "column" }}
        align="stretch"
      >
        {/* Delete lives in the dark text area, outside the colored panel, so it
            never stacks on top of the edit pencil. */}
        <Flex
          justify="space-between"
          align="flex-start"
          py={10}
          pl={18}
          pr={12}
          gap={10}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Stack gap={6} style={{ minWidth: 0 }}>
            <Title order={3} size={20} c="white">
              {props.title_thread}
            </Title>
            <Badge
              w="fit-content"
              variant="light"
              color={props.thread_id && props.thread_id !== "new-thread" ? "cyan.0" : "pink.0"}
            >
              {props.thread_id && props.thread_id !== "new-thread" ? "Post draft" : "Thread draft"}
            </Badge>
          </Stack>
          <DeleteDraft draftId={props.id} />
        </Flex>
        <Stack
          bg={props.color}
          sx={{
            borderTopLeftRadius: isOverSm ? 100 : undefined,
            borderRadius: isOverSm ? undefined : 15,
          }}
          align={isOverSm ? "end" : undefined}
          px={isOverSm ? 20 : undefined}
          py={isOverSm ? 10 : undefined}
          miw={200}
          w={isOverSm ? undefined : "100%"}
        >
          <Flex
            justify="center"
            sx={{ flexDirection: isOverSm ? "column" : "row-reverse" }}
            align={isOverSm ? "end" : "center"}
            px={7}
            py={8}
            gap={isOverSm ? 10 : 15}
          >
            <ActionIcon
              variant="transparent"
              size="xl"
              component={Link}
              to={
                props.thread_id && props.thread_id !== "new-thread"
                  ? `/Forum/${props.location_db}/thread/${props.thread_id}/post?draft=${props.id}`
                  : `/Forum/${props.location_db || "Main-Forum"}/new?draft=${props.id}`
              }
              title="Continue this draft"
            >
              <Image src={Edit} alt="Draft icon" width={45} />
            </ActionIcon>
            <Text ta="end" c="#151515" fw={500}>
              Draft saved at:
              <br />
              {formatter.format(new Date((props.date_saved?.seconds ?? 0) * 1000))}
            </Text>
          </Flex>
        </Stack>
      </Flex>
    </Paper>
  );
}
