import { ActionIcon, Badge, Box, Group, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import {
  NAV_BAR_LIMIT_DESKTOP,
  NAV_BAR_LIMIT_MOBILE,
  resolveNavOrder,
} from "../../../../lib/navConfig";
import { getSettings } from "../../../../queries/settings";

/**
 * Reorder the navigation. The top items pin to the nav bar (4 on desktop, 4 on
 * mobile); everything below the line lives in the Menu drawer. The same order
 * drives both platforms. Saved to users/{uid}.settings.navOrder.
 */
export default function Navigation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isPending } = useQuery({
    queryKey: ["get-settings", user?.uid],
    queryFn: () => getSettings(user!.uid),
    enabled: !!user,
  });

  const [order, setOrder] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    if (settings !== undefined) {
      setOrder(resolveNavOrder((settings as { navOrder?: string[] })?.navOrder));
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async (next: string[]) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { getDb } = await import("../../../../context/firebase");
      const db = await getDb();
      await setDoc(doc(db, "users", user!.uid), { settings: { navOrder: next } }, { merge: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get-settings", user?.uid] }),
  });

  const move = (index: number, dir: -1 | 1) => {
    if (!order) return;
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    setOrder(next);
    save.mutate(next);
  };

  if (isPending || !order) return <SectionLoader />;

  return (
    <Box className="bg-[#17151c] border border-[#2a2637] max-w-full flex-1 overflow-auto p-4">
      <Stack gap={12} maw={520}>
        <Text c="white" fw={700} fz={18}>
          Customize your navigation
        </Text>
        <Text fz={14} c="dimmed">
          Drag the order with the arrows. The top {NAV_BAR_LIMIT_DESKTOP} pin to the desktop
          nav bar and the top {NAV_BAR_LIMIT_MOBILE} to the mobile bar; the rest live in the
          Menu drawer. One order is shared across desktop and mobile.
        </Text>
        <Stack gap={6} role="list">
          {order.map((label, i) => {
            const onDesktopBar = i < NAV_BAR_LIMIT_DESKTOP;
            const onMobileBar = i < NAV_BAR_LIMIT_MOBILE;
            return (
              <React.Fragment key={label}>
                {i === NAV_BAR_LIMIT_MOBILE && <Divider text="Below: mobile drawer" />}
                {i === NAV_BAR_LIMIT_DESKTOP && <Divider text="Below: desktop drawer" />}
                <Group
                  role="listitem"
                  justify="space-between"
                  wrap="nowrap"
                  p={10}
                  style={{
                    borderRadius: 0,
                    background: onDesktopBar ? "#2b3550" : "#141318",
                    border: "1px solid #3a3742",
                  }}
                >
                  <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Text fz={13} c="dimmed" w={22} ta="right">
                      {i + 1}
                    </Text>
                    <Text c="white" fz={15} lineClamp={1}>
                      {label}
                    </Text>
                    {onMobileBar ? (
                      <Badge size="xs" color="teal" variant="light">
                        Bar
                      </Badge>
                    ) : onDesktopBar ? (
                      <Badge size="xs" color="blue" variant="light">
                        Desktop bar
                      </Badge>
                    ) : null}
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Move ${label} up`}
                    >
                      <IconChevronUp size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      disabled={i === order.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`Move ${label} down`}
                    >
                      <IconChevronDown size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </React.Fragment>
            );
          })}
        </Stack>
        {save.isError && (
          <Text fz={14} c="#E54156" role="status" aria-live="polite">
            Could not save the order. Try again.
          </Text>
        )}
      </Stack>
    </Box>
  );
}

function Divider(props: { text: string }) {
  return (
    <Group gap={8} align="center" my={2}>
      <Box style={{ flex: 1, height: 1, background: "#4a4750" }} />
      <Text fz={12} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
        {props.text}
      </Text>
      <Box style={{ flex: 1, height: 1, background: "#4a4750" }} />
    </Group>
  );
}
