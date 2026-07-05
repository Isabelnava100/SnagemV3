import { Box, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { useAuth } from "../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../lib/auditLog";
import { canGiveRewards } from "../../../lib/permissions";
import { getXPDefaults } from "../../../queries/game";
import { closeThread } from "../mutations";
import { ForumThread } from "../types";

/**
 * Close-thread confirmation, shared by the host menu. Closing archives the
 * thread (read-only), collects an optional note about roleplayed rewards for
 * the admin review, and shows the estimated per-post experience when a default
 * is configured. Reward granters are routed to the rewards review afterward.
 */
export default function CloseThreadModal(props: {
  opened: boolean;
  onClose: () => void;
  forum: string;
  thread: ForumThread;
  /** Called after a successful close (e.g. to navigate away). */
  onClosed?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState("");

  const { data: xpDefaults } = useQuery({
    queryKey: ["xp-defaults"],
    queryFn: getXPDefaults,
    enabled: props.opened,
  });
  const perPost = xpDefaults?.experiencePerPost ?? 0;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await closeThread(user, props.forum, props.thread.id, props.thread.title, note.trim());
      await logAuditEvent({
        action: "thread.close",
        ...actorFrom(user),
        targetPath: `forum/${props.forum}/threads/${props.thread.id}`,
        details: { title: props.thread.title, forum: props.forum },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-thread", props.forum, props.thread.id],
      });
      queryClient.invalidateQueries({ queryKey: ["forum-threads", props.forum] });
      props.onClose();
      props.onClosed?.();
      // Reward granters go straight to the rewards review for this thread.
      if (canGiveRewards(user)) {
        navigate(`/Forum/${props.forum}/thread/${props.thread.id}/rewards`);
      }
    },
    onError: (e) => setError((e as Error).message || "Could not close the thread. Try again."),
  });

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={<Text fw={700}>Close thread</Text>}
      centered
      radius={12}
    >
      <Stack gap={12}>
        <Text fz={13} c="dimmed">
          Closing this thread archives it: no new posts can be made and existing
          posts can no longer be edited. If you roleplay finding a specific item,
          money or pokemon, let us know for review.
        </Text>
        {perPost > 0 && (
          <Box p={10} style={{ background: "#2E2D2E", borderRadius: 8 }}>
            <Text fz={13} c="white" fw={600}>
              Estimated reward
            </Text>
            <Text fz={13} c="dimmed">
              About {perPost} experience per qualifying post. An admin does the
              final review before anything is assigned, so the final amount may
              change.
            </Text>
          </Box>
        )}
        <Textarea
          label="Rewards to review (optional)"
          placeholder="Tell the reviewers about any items, money or pokemon you roleplayed finding."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={3}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        {error && (
          <Text fz={13} c="red.4" role="status" aria-live="polite">
            {error}
          </Text>
        )}
        <Group justify="flex-end">
          <GradientButtonSecondary radius="xl" variant="subtle" onClick={props.onClose}>
            Cancel
          </GradientButtonSecondary>
          <GradientButtonPrimary radius="xl" loading={isPending} onClick={() => mutateAsync()}>
            Close Thread
          </GradientButtonPrimary>
        </Group>
      </Stack>
    </Modal>
  );
}
