import { Avatar, Box, Group, Modal, ScrollArea, Stack, Text, Textarea } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { useAuth } from "../../../context/AuthContext";
import { getPokemonImageURL } from "../../../helpers";
import { actorFrom, logAuditEvent } from "../../../lib/auditLog";
import { canGiveRewards, isAdmin } from "../../../lib/permissions";
import { getXPDefaults } from "../../../queries/game";
import { closeThread } from "../mutations";
import { ForumThread } from "../types";
import { pokemonData } from "../../../data/pokemon";

const XP_FIELDS = ["experience", "friendship", "purification", "shadow"] as const;

/** Flatten the thread's per-post XP log into one row per pokemon. */
function xpSummaryRows(thread: ForumThread) {
  return Object.values(thread.pendingXp ?? {})
    .flatMap((pokes) => Object.values(pokes))
    .map((xp) => ({
      name: xp.name ?? "Pokemon",
      slug: xp.slug ?? "",
      experience: xp.experience ?? 0,
      friendship: xp.friendship ?? 0,
      purification: xp.purification ?? 0,
      shadow: xp.shadow ?? 0,
    }))
    .filter((r) => r.experience + r.friendship + r.purification + r.shadow > 0);
}

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
  const xpRows = xpSummaryRows(props.thread);

  // Mission requirement gate: every set foe from the briefing must be beaten
  // (its capture bar filled, or caught) before the run can close for grading.
  // Staff can still force-close a stuck run.
  const defeated = new Set(props.thread.defeatedEncounters ?? []);
  const unmetTargets = (props.thread.requiredEncounters ?? []).filter((s) => !defeated.has(s));
  const requirementBlocked = !!props.thread.missionId && unmetTargets.length > 0;
  const staffOverride = isAdmin(user) || canGiveRewards(user);
  const nameOf = (slug: string) => pokemonData.find((p) => p.slug === slug)?.name ?? slug;

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
          posts can no longer be edited. Experience and stats were already awarded
          automatically as people posted. Items and coins are assigned by an admin
          in the review after closing.
        </Text>
        {xpRows.length > 0 ? (
          <Box p={10} style={{ background: "#2E2D2E", borderRadius: 8 }}>
            <Text fz={13} c="white" fw={600} mb={6}>
              Experience awarded this thread
            </Text>
            <ScrollArea.Autosize mah={220}>
              <Stack gap={6}>
                {xpRows.map((row, i) => (
                  <Group key={i} gap={8} wrap="nowrap" align="center">
                    <Avatar
                      src={row.slug ? getPokemonImageURL(row.slug) : undefined}
                      alt={`${row.name} sprite`}
                      size={24}
                      radius="xl"
                    />
                    <Text fz={13} c="white" style={{ minWidth: 0 }} truncate>
                      {row.name}
                    </Text>
                    <Group gap={8} wrap="wrap" style={{ flex: 1, justifyContent: "flex-end" }}>
                      {XP_FIELDS.filter((f) => row[f] > 0).map((f) => (
                        <Text key={f} fz={12} c="dimmed" tt="capitalize">
                          {f.slice(0, 4)}{" "}
                          <Text span c="teal.4" fw={700}>
                            +{row[f]}
                          </Text>
                        </Text>
                      ))}
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Box>
        ) : (
          perPost > 0 && (
            <Box p={10} style={{ background: "#2E2D2E", borderRadius: 8 }}>
              <Text fz={13} c="dimmed">
                Team pokemon earn about {perPost} experience per qualifying post,
                awarded automatically as people post.
              </Text>
            </Box>
          )
        )}
        {requirementBlocked && (
          <Box
            p={10}
            style={{
              background: "rgba(229,65,86,0.08)",
              border: "1px solid rgba(229,65,86,0.45)",
              borderRadius: 8,
            }}
          >
            <Text fz={13} c="pink.0" fw={700} mb={4}>
              Mission requirement not met
            </Text>
            <Text fz={13} c="rgba(255,255,255,0.8)">
              This mission still requires you to beat:{" "}
              {unmetTargets.map(nameOf).join(", ")}. Face each one from the encounter
              picker and wear its health down (or catch it), then close the thread.
            </Text>
            {staffOverride && (
              <Text fz={12} c="dimmed" mt={6}>
                You have staff review powers, so you can close it anyway; the grader
                will see the unmet targets.
              </Text>
            )}
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
          <GradientButtonPrimary
            radius="xl"
            loading={isPending}
            disabled={requirementBlocked && !staffOverride}
            onClick={() => mutateAsync()}
          >
            {requirementBlocked && staffOverride ? "Close Anyway (staff)" : "Close Thread"}
          </GradientButtonPrimary>
        </Group>
      </Stack>
    </Modal>
  );
}
