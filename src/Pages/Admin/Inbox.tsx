import { Box, Flex, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const displayFont = "var(--font-display, 'Quantico', sans-serif)";
// Gradient section header bar, same pattern as the forum composer panels.
const HEADER_GRADIENT = "linear-gradient(90deg,#762B77 7%,#17F1F0 66%)";
import { IconChevronDown } from "@tabler/icons-react";
import React from "react";
import { ConfirmPopover } from "../../components/common/ConfirmPopover";
import { EmptyMessage } from "../../components/common/Message";
import { SectionLoader } from "../../components/navigation/loading";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { hasCapability, isAdmin } from "../../lib/permissions";
import { getUsers } from "../../queries/admin";
import { getNewUsers } from "../../queries/applicants";
import {
  ChallengeRequest,
  getPendingChallengeRequests,
  resolveChallengeRequest,
} from "../../queries/challenges";
import { getIncomingTickets } from "../../queries/devBoard";
import {
  getPendingMasterMissionRequests,
  getPendingMissionSubmissions,
} from "../../queries/grading";
import { getPendingImports } from "../../queries/imports";
import {
  MasterClearanceRequest,
  getPendingClearanceRequests,
  resolveMasterClearance,
} from "../../queries/research";
import { ApplicantCard } from "../User/Dashboard/Admin/Applicants";
import { ReviewCard } from "../User/Dashboard/Admin/Imports";
import { lazyImport } from "../../utils/lazyImport";

// Grading is a heavy module; lazy-load it (same split as Manage) so the Inbox
// bundle does not block Grading from getting its own chunk.
const { MMRequestCard } = lazyImport(
  () => import("../User/Dashboard/Admin/Grading"),
  "MMRequestCard"
);
const { SubmissionCard } = lazyImport(
  () => import("../User/Dashboard/Admin/Grading"),
  "SubmissionCard"
);

type InboxType = "application" | "import" | "mission" | "master" | "challenge" | "clearance";

const TYPE_META: Record<InboxType, { tag: string; color: string; action: string }> = {
  application: { tag: "APP", color: "#a855f7", action: "Review" },
  import: { tag: "IMPORT", color: "#3b82f6", action: "Review" },
  mission: { tag: "MISSION", color: "#ef4444", action: "Grade" },
  master: { tag: "MASTER", color: "#14b8a6", action: "Grant" },
  challenge: { tag: "CHALLENGE", color: "#f59e0b", action: "Review" },
  clearance: { tag: "CLEARANCE", color: "#8b5cf6", action: "Review" },
};

/**
 * Approve/decline card for a master-track clearance request. Approving sets
 * the character's track (Hybrid/Channeler), which unlocks the Research
 * Facility console for that character.
 */
function ClearanceRequestCard(props: { request: MasterClearanceRequest; onDone: () => void }) {
  const { request, onDone } = props;
  const [track, setTrack] = React.useState<"Hybrid" | "Channeler">(request.track ?? "Hybrid");
  const [error, setError] = React.useState("");

  const resolveMutation = useMutation({
    mutationFn: (approve: boolean) =>
      resolveMasterClearance({ requestId: request.id, approve, track }),
    onSuccess: onDone,
    onError: () => setError("Could not update that request. Try again."),
  });

  return (
    <Stack gap="sm">
      <Text fz={14} c="dimmed">
        {request.username || "A member"} wants master clearance for{" "}
        <Text component="span" fz={14} c="white" fw={600}>
          {request.characterName || request.characterId}
        </Text>
        {request.track ? ` and asked for the ${request.track} track.` : "."} Approving sets the
        character's track and opens the Research Facility console for them.
      </Text>
      <Select
        label="Track"
        data={["Hybrid", "Channeler"]}
        value={track}
        onChange={(v) => setTrack(v === "Channeler" ? "Channeler" : "Hybrid")}
        maw={220}
      />
      <Group gap="sm">
        <button
          type="button"
          className="dc-queue-btn dc-queue-btn--approve"
          disabled={resolveMutation.isPending}
          onClick={() => resolveMutation.mutate(true)}
        >
          Approve clearance
        </button>
        <ConfirmPopover
          message="Decline this master clearance request? The member is notified and will need to reapply."
          confirmLabel="Decline"
          loading={resolveMutation.isPending}
          onConfirm={() => resolveMutation.mutate(false)}
          target={(open) => (
            <button
              type="button"
              className="dc-queue-btn dc-queue-btn--reject"
              disabled={resolveMutation.isPending}
              onClick={open}
            >
              Decline
            </button>
          )}
        />
      </Group>
      {error && (
        <Text fz={14} c="red.4" role="status" aria-live="polite">
          {error}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Accept/decline card for a gym or trial run request. Accepting is the staff
 * promise to create + host the member's thread; pasting the thread link is
 * optional and gets sent along in the member's notification.
 */
function ChallengeRequestCard(props: { request: ChallengeRequest; onDone: () => void }) {
  const { request, onDone } = props;
  const [threadLink, setThreadLink] = React.useState("");
  const [error, setError] = React.useState("");

  const resolveMutation = useMutation({
    mutationFn: (accept: boolean) =>
      resolveChallengeRequest({
        requestId: request.id,
        accept,
        threadLink: threadLink.trim() || undefined,
      }),
    onSuccess: onDone,
    onError: () => setError("Could not update that request. Try again."),
  });

  return (
    <Stack gap="sm">
      <Text fz={14} c="dimmed">
        {request.username || "A member"} wants to start{" "}
        <Text component="span" fz={14} c="white" fw={600}>
          {request.stageTitle || request.stageId}
        </Text>{" "}
        (
        {request.kind === "gym"
          ? "gym run"
          : request.kind === "rematch"
            ? `gym rematch, tier ${request.rematchTier ?? 1}, about ${Math.min(7, 3 + (request.rematchTier ?? 1))} star opposition`
            : "island trial"}
        , {request.regionOrIsland}).
        Create their thread in the forums, then accept. You can paste the thread link so
        their notification takes them straight there.
      </Text>
      <TextInput
        label="Thread link (optional)"
        placeholder="/Forum/Main-Forum/thread/123"
        value={threadLink}
        onChange={(e) => setThreadLink(e.currentTarget.value)}
      />
      <Group gap="sm">
        <button
          type="button"
          className="dc-queue-btn dc-queue-btn--approve"
          disabled={resolveMutation.isPending}
          onClick={() => resolveMutation.mutate(true)}
        >
          Accept challenge
        </button>
        <ConfirmPopover
          message="Decline this challenge request? The member is notified they'll need to ask again."
          confirmLabel="Decline"
          loading={resolveMutation.isPending}
          onConfirm={() => resolveMutation.mutate(false)}
          target={(open) => (
            <button
              type="button"
              className="dc-queue-btn dc-queue-btn--reject"
              disabled={resolveMutation.isPending}
              onClick={open}
            >
              Decline
            </button>
          )}
        />
      </Group>
      {error && (
        <Text fz={14} c="red.4" role="status" aria-live="polite">
          {error}
        </Text>
      )}
    </Stack>
  );
}

/**
 * One queue row, aligned to the mockup: mono type tag + name + note on one
 * line (stacked on mobile), with an outline expander button. Expanding opens
 * the full review card in an inset panel accented in the queue type's color.
 */
function InboxRow(props: {
  type: InboxType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const meta = TYPE_META[props.type];
  const [open, setOpen] = React.useState(false);
  return (
    <Box style={{ borderTop: "1px solid #2a2637" }}>
      <Flex
        direction={{ base: "column", sm: "row" }}
        align={{ base: "stretch", sm: "center" }}
        gap={{ base: 10, sm: 20 }}
        px={{ base: 18, sm: 26 }}
        py={16}
      >
        <Group gap={10} wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text
            component="span"
            ff="monospace"
            fz={{ base: 11, sm: 14 }}
            c="#12B7B6"
            tt="uppercase"
            w={{ sm: 80 }}
            style={{ flexShrink: 0 }}
          >
            {meta.tag}
          </Text>
          <Text fw={700} c="white" fz={{ base: 14, sm: 15 }} w={{ sm: 200 }} lineClamp={1}>
            {props.title}
          </Text>
        </Group>
        {props.subtitle && (
          <Text
            fz={{ base: 13, sm: 14 }}
            c="#b6b1bc"
            lineClamp={1}
            style={{ flex: 1, minWidth: 0 }}
          >
            {props.subtitle}
          </Text>
        )}
        <Box style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="dc-queue-btn dc-queue-btn--outline"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : meta.action}
            <IconChevronDown
              size={16}
              style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 150ms" }}
            />
          </button>
        </Box>
      </Flex>
      {open && (
        <Box
          mx={{ base: 18, sm: 26 }}
          mb={18}
          p={{ base: "14px 16px", sm: "16px 20px" }}
          style={{
            background: "#141318",
            border: "1px solid #2a2637",
            borderLeft: `3px solid ${meta.color}`,
          }}
        >
          {props.children}
        </Box>
      )}
    </Box>
  );
}

/**
 * Accent stat tile (redesign mockup): colored left border, big count,
 * uppercase label. The whole tile is a real button that jumps to its section.
 */
function StatTile(props: {
  label: string;
  count: number;
  color: string;
  /** Number color when it differs from the accent (mockup: help desk is white). */
  numberColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="dc-stat-tile"
      style={{ "--dc-tile-accent": props.color } as React.CSSProperties}
      onClick={props.onClick}
    >
      <Text
        fz={{ base: 20, sm: 22 }}
        fw={800}
        c={props.count ? (props.numberColor ?? props.color) : "#b6b1bc"}
        lh={1}
      >
        {props.count}
      </Text>
      <Text
        fz={{ base: 10, sm: 14 }}
        fw={700}
        c="#b6b1bc"
        tt="uppercase"
        mt={2}
        style={{ letterSpacing: "0.14em" }}
      >
        {props.label}
      </Text>
    </button>
  );
}

export default function Inbox(props: { onOpenHelpDesk?: () => void }) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const queryClient = useQueryClient();

  // Each stream is gated by the same capability as its old standalone tab.
  const canApps = admin;
  const canImports = admin || hasCapability(user, Capability.ApproveImports);
  const canGrade = admin || hasCapability(user, Capability.ReviewRewards);
  const canChallenges =
    admin ||
    hasCapability(user, Capability.HostMainForum) ||
    hasCapability(user, Capability.ReviewRewards);

  const apps = useQuery({
    queryKey: ["new-users"],
    queryFn: getNewUsers,
    enabled: canApps,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const imports = useQuery({
    queryKey: ["pending-imports"],
    queryFn: getPendingImports,
    enabled: canImports,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const missions = useQuery({
    queryKey: ["pending-submissions"],
    queryFn: getPendingMissionSubmissions,
    enabled: canGrade,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const master = useQuery({
    queryKey: ["pending-mm-requests"],
    queryFn: getPendingMasterMissionRequests,
    enabled: canGrade,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const challenges = useQuery({
    queryKey: ["pending-challenge-requests"],
    queryFn: getPendingChallengeRequests,
    enabled: canChallenges,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const clearances = useQuery({
    queryKey: ["pending-clearance-requests"],
    queryFn: getPendingClearanceRequests,
    enabled: canGrade,
    refetchOnMount: "always",
    staleTime: 0,
  });
  // "Help desk open" tile: member suggestions/bugs/questions awaiting triage.
  // Same key + fetcher as the Dev Board tool, so the counts never diverge.
  const helpDesk = useQuery({
    queryKey: ["dev-incoming"],
    queryFn: getIncomingTickets,
    enabled: admin,
  });
  const { data: users } = useQuery({
    queryKey: ["get-all-users"],
    queryFn: getUsers,
    enabled: canImports,
  });

  const refresh = (key: string) => () => queryClient.invalidateQueries({ queryKey: [key] });
  const nameFor = (uid: string) => users?.find((u) => u.id === uid)?.username ?? uid;

  const appList = canApps ? apps.data ?? [] : [];
  const importList = canImports ? imports.data ?? [] : [];
  const missionList = canGrade ? missions.data ?? [] : [];
  const masterList = canGrade ? master.data ?? [] : [];
  const challengeList = canChallenges ? challenges.data ?? [] : [];
  const clearanceList = canGrade ? clearances.data ?? [] : [];
  const helpDeskCount = admin ? (helpDesk.data ?? []).length : 0;

  const loading =
    (canApps && apps.isPending) ||
    (canImports && imports.isPending) ||
    (canGrade && (missions.isPending || master.isPending || clearances.isPending)) ||
    (canChallenges && challenges.isPending);

  const total =
    appList.length +
    importList.length +
    missionList.length +
    masterList.length +
    challengeList.length +
    clearanceList.length;

  const scrollToQueue = () =>
    document.getElementById("approvals-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <Stack gap="lg">
      <Flex gap={{ base: 10, sm: 14 }} wrap="wrap">
        {canApps && (
          <StatTile
            label="Pending Applications"
            count={appList.length}
            color="#E54156"
            onClick={scrollToQueue}
          />
        )}
        {canGrade && (
          <StatTile
            label="Missions to Grade"
            count={missionList.length}
            color="#FFD074"
            onClick={scrollToQueue}
          />
        )}
        {canImports && (
          <StatTile
            label="Imports in Review"
            count={importList.length}
            color="#12B7B6"
            onClick={scrollToQueue}
          />
        )}
        {admin && (
          <StatTile
            label="Help Desk Open"
            count={helpDeskCount}
            color="#772976"
            numberColor="#fff"
            onClick={() => props.onOpenHelpDesk?.()}
          />
        )}
      </Flex>

      <Box
        id="approvals-queue"
        style={{ background: "#17151c", border: "1px solid #2a2637", scrollMarginTop: 90 }}
      >
        <Box
          px={{ base: 18, sm: 26 }}
          py={{ base: 13, sm: 15 }}
          style={{ background: HEADER_GRADIENT }}
        >
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={{ base: 14, sm: 16 }}
            tt="uppercase"
            style={{ fontFamily: displayFont, letterSpacing: "0.08em", margin: 0 }}
          >
            Approvals Queue
          </Text>
        </Box>
        {loading ? (
          <Box p={{ base: 18, sm: 26 }}>
            <SectionLoader />
          </Box>
        ) : total === 0 ? (
          <Box p={{ base: 18, sm: 26 }}>
            <EmptyMessage
              title="Inbox zero"
              description="Nothing is waiting for review. New requests will appear here."
            />
          </Box>
        ) : (
          <React.Suspense
            fallback={
              <Box p={{ base: 18, sm: 26 }}>
                <SectionLoader />
              </Box>
            }
          >
            <Box>
              {appList.map((a) => (
                <InboxRow
                  key={`app-${a.id}`}
                  type="application"
                  title={a.username || "Unnamed"}
                  subtitle={`New member${a.email ? ` · ${a.email}` : ""}`}
                >
                  <ApplicantCard applicant={a} onDone={refresh("new-users")} />
                </InboxRow>
              ))}
              {importList.map((req) => (
                <InboxRow
                  key={`imp-${req.uid}`}
                  type="import"
                  title={nameFor(req.uid)}
                  subtitle={`${req.currency?.pokecoin ?? 0} coins · ${req.items?.length ?? 0} items · ${
                    req.pokemon?.length ?? 0
                  } Pokemon`}
                >
                  <ReviewCard req={req} username={nameFor(req.uid)} />
                </InboxRow>
              ))}
              {missionList.map((s) => (
                <InboxRow
                  key={`mis-${s.id}`}
                  type="mission"
                  title={s.submitterName || "Unknown member"}
                  subtitle={`Mission ${s.missionId || "unknown"}`}
                >
                  <SubmissionCard submission={s} onDone={refresh("pending-submissions")} />
                </InboxRow>
              ))}
              {masterList.map((r) => (
                <InboxRow
                  key={`mm-${r.id}`}
                  type="master"
                  title={r.username || "Unknown member"}
                  subtitle={`${r.type || "Master"} Master Mission #${r.number ?? "?"}`}
                >
                  <MMRequestCard request={r} onDone={refresh("pending-mm-requests")} />
                </InboxRow>
              ))}
              {challengeList.map((r) => (
                <InboxRow
                  key={`ch-${r.id}`}
                  type="challenge"
                  title={r.username || "Unknown member"}
                  subtitle={r.stageTitle || r.stageId}
                >
                  <ChallengeRequestCard request={r} onDone={refresh("pending-challenge-requests")} />
                </InboxRow>
              ))}
              {clearanceList.map((r) => (
                <InboxRow
                  key={`cl-${r.id}`}
                  type="clearance"
                  title={r.username || "Unknown member"}
                  subtitle={`Master clearance · ${r.characterName || r.characterId}`}
                >
                  <ClearanceRequestCard request={r} onDone={refresh("pending-clearance-requests")} />
                </InboxRow>
              ))}
            </Box>
          </React.Suspense>
        )}
      </Box>
    </Stack>
  );
}
