import { Badge, Box, Button, Flex, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const displayFont = "var(--font-display, 'Quantico', sans-serif)";
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
import { MMRequestCard, SubmissionCard } from "../User/Dashboard/Admin/Grading";
import { ReviewCard } from "../User/Dashboard/Admin/Imports";

type InboxType = "application" | "import" | "mission" | "master" | "challenge" | "clearance";

const TYPE_META: Record<InboxType, { label: string; color: string; action: string }> = {
  application: { label: "Application", color: "#a855f7", action: "Review" },
  import: { label: "Import", color: "#3b82f6", action: "Review" },
  mission: { label: "Mission", color: "#ef4444", action: "Grade" },
  master: { label: "Master Req", color: "#14b8a6", action: "Grant" },
  challenge: { label: "Challenge", color: "#f59e0b", action: "Review" },
  clearance: { label: "Clearance", color: "#8b5cf6", action: "Review" },
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
        <Button
          color="teal"
          radius="xl"
          size="sm"
          loading={resolveMutation.isPending}
          onClick={() => resolveMutation.mutate(true)}
        >
          Approve clearance
        </Button>
        <ConfirmPopover
          message="Decline this master clearance request? The member is notified and will need to reapply."
          confirmLabel="Decline"
          loading={resolveMutation.isPending}
          onConfirm={() => resolveMutation.mutate(false)}
          target={(open) => (
            <Button
              variant="light"
              color="red"
              radius="xl"
              size="sm"
              loading={resolveMutation.isPending}
              onClick={open}
            >
              Decline
            </Button>
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
        <Button
          color="teal"
          radius="xl"
          size="sm"
          loading={resolveMutation.isPending}
          onClick={() => resolveMutation.mutate(true)}
        >
          Accept challenge
        </Button>
        <ConfirmPopover
          message="Decline this challenge request? The member is notified they'll need to ask again."
          confirmLabel="Decline"
          loading={resolveMutation.isPending}
          onConfirm={() => resolveMutation.mutate(false)}
          target={(open) => (
            <Button
              variant="light"
              color="red"
              radius="xl"
              size="sm"
              loading={resolveMutation.isPending}
              onClick={open}
            >
              Decline
            </Button>
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

/** Collapsed summary row that expands to the full review card for that item. */
function InboxRow(props: {
  type: InboxType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const meta = TYPE_META[props.type];
  const [open, setOpen] = React.useState(false);
  return (
    <Box
      style={{
        background: "#141318",
        border: "1px solid #2a2637",
        borderLeft: `4px solid ${meta.color}`,
        overflow: "hidden",
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="md" p="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge radius="sm" tt="uppercase" style={{ background: meta.color, color: "#fff" }}>
            {meta.label}
          </Badge>
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} c="white" lineClamp={1}>
              {props.title}
            </Text>
            {props.subtitle && (
              <Text fz={14} c="dimmed" lineClamp={1}>
                {props.subtitle}
              </Text>
            )}
          </Box>
        </Group>
        <Button
          variant={open ? "light" : "gradient"}
          gradient={{ from: "indigo", to: "cyan", deg: 90 }}
          color="gray"
          size="sm"
          radius="xl"
          rightSection={
            <IconChevronDown
              size={16}
              style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 150ms" }}
            />
          }
          onClick={() => setOpen((o) => !o)}
          style={{ flexShrink: 0 }}
        >
          {open ? "Close" : meta.action}
        </Button>
      </Group>
      {open && (
        <Box px="md" pb="md">
          {props.children}
        </Box>
      )}
    </Box>
  );
}

/** Accent stat tile (redesign): colored left border, big count, uppercase label. */
function StatTile(props: { label: string; count: number; color: string }) {
  return (
    <Box
      px={20}
      py={16}
      style={{
        flex: 1,
        minWidth: 150,
        background: "#17151c",
        border: "1px solid #2a2637",
        borderLeft: `3px solid ${props.color}`,
      }}
    >
      <Text fz={22} fw={800} c={props.count ? props.color : "#b6b1bc"} lh={1}>
        {props.count}
      </Text>
      <Text fz={14} fw={700} c="#b6b1bc" tt="uppercase" mt={2} style={{ letterSpacing: "0.16em" }}>
        {props.label}
      </Text>
    </Box>
  );
}

export default function Inbox() {
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

  return (
    <Stack gap="lg">
      <Flex gap={14} wrap="wrap">
        {canApps && (
          <StatTile label="Pending Applications" count={appList.length} color="#E54156" />
        )}
        {canGrade && <StatTile label="Missions to Grade" count={missionList.length} color="#FFD074" />}
        {canImports && <StatTile label="Imports in Review" count={importList.length} color="#12B7B6" />}
        {canGrade && <StatTile label="Master Requests" count={masterList.length} color="#772976" />}
        {canChallenges && (
          <StatTile label="Challenge Requests" count={challengeList.length} color="#f59e0b" />
        )}
        {canGrade && <StatTile label="Clearance Reviews" count={clearanceList.length} color="#8b5cf6" />}
      </Flex>

      <Box style={{ background: "#17151c", border: "1px solid #2a2637" }}>
        <Box
          px={26}
          py={15}
          style={{ background: "linear-gradient(90deg, #762B77 7%, #17F1F0 66%)" }}
        >
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={16}
            tt="uppercase"
            style={{ fontFamily: displayFont, letterSpacing: "0.08em", margin: 0 }}
          >
            Approvals Queue
          </Text>
        </Box>
        <Box p={{ base: 14, sm: 20 }}>
          {loading ? (
            <SectionLoader />
          ) : total === 0 ? (
            <EmptyMessage
              title="Inbox zero"
              description="Nothing is waiting for review. New requests will appear here."
            />
          ) : (
            <Stack gap="md">
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
            </Stack>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
