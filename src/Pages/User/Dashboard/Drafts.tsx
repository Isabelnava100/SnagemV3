import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Paper,
  Popover,
  SimpleGrid,
  Stack,
  Text,
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
      <Text c={count >= 55 ? "#E54156" : "#b6b1bc"} fz={14}>
        {count} of 60 draft slots used.
        {count >= 60
          ? " You're at the limit; delete drafts to save new ones."
          : count >= 55
            ? " You'll run out of draft space soon."
            : ""}
      </Text>
      {count >= 40 &&
        (confirming ? (
          <Group gap={6}>
            <Text fz={14} c="white">
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
            fz={14}
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
        {/* Mockup delete button: transparent square with a dim border, trash
            glyph kept from the original build. */}
        <ActionIcon
          variant="default"
          radius={0}
          size={34}
          title="Delete draft"
          aria-label="Delete draft"
          onClick={open}
          style={{
            flexShrink: 0,
            background: "transparent",
            border: "1px solid #2a2637",
            color: "#b6b1bc",
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20">
        <Stack gap={8}>
          <Text c="white" fz={16}>
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
  const { isOverXs } = useMediaQuery();
  const isPost = props.thread_id && props.thread_id !== "new-thread";
  const continueUrl = isPost
    ? `/Forum/${props.location_db}/thread/${props.thread_id}/post?draft=${props.id}`
    : `/Forum/${props.location_db || "Main-Forum"}/new?draft=${props.id}`;
  const savedLine = `Saved ${formatter.format(new Date((props.date_saved?.seconds ?? 0) * 1000))}`;
  return (
    <Paper className="dc-card" radius={0} pos="relative">
      <Flex align="center" gap={{ base: 12, sm: 18 }} px={{ base: 16, sm: 22 }} py={{ base: 16, sm: 20 }} wrap="nowrap">
        {/* The title block continues the draft (replaces the old edit pencil). */}
        <Box
          component={Link}
          to={continueUrl}
          style={{ flex: 1, minWidth: 0, textDecoration: "none" }}
          title="Continue this draft"
        >
          <Stack gap={8}>
            <Text c="white" fw={700} fz={16} lineClamp={1}>
              {props.title_thread}
            </Text>
            {/* Mockup badge: solid gold (post) / teal (thread) chip with dark
                uppercase Quantico text. */}
            <Box
              component="span"
              w="fit-content"
              px={isOverXs ? 10 : 9}
              py={4}
              style={{
                fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                fontSize: isOverXs ? 14 : 11,
                fontWeight: 700,
                letterSpacing: isOverXs ? "0.12em" : "0.1em",
                textTransform: "uppercase",
                lineHeight: 1.2,
                color: "#1A1B1E",
                background: isPost ? "#FFD074" : "#12B7B6",
              }}
            >
              {isPost ? "Post draft" : "Thread draft"}
            </Box>
            {/* Phones stack the saved line under the badge. */}
            <Text fz={12} c="#b6b1bc" hiddenFrom="sm">
              {savedLine}
            </Text>
          </Stack>
        </Box>
        <Text fz={14} c="#b6b1bc" ta="right" visibleFrom="sm" style={{ flexShrink: 0 }}>
          {savedLine}
        </Text>
        <DeleteDraft draftId={props.id} />
      </Flex>
    </Paper>
  );
}
