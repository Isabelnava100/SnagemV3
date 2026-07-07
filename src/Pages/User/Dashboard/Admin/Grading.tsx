import {
  Anchor,
  Box,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck, IconGift, IconTrophy, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import {
  getPendingMasterMissionRequests,
  getPendingMissionSubmissions,
  PendingMMRequest,
  PendingSubmission,
} from "../../../../queries/grading";
import { gradeMission } from "../../../../queries/missions";
import { grantMasterMission } from "../../../../queries/research";

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../../../../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

const awardRankingPoints = (uid: string, points: number) =>
  call<{ ok: boolean }>("awardRankingPoints", { uid, points });

const grantChallengeStep = (
  uid: string,
  kind: string,
  regionOrIsland: string,
  stepId: string,
  zCrystal?: string
) => call<{ ok: boolean }>("grantChallengeStep", { uid, kind, regionOrIsland, stepId, zCrystal });

const CARD_BG = "#2b2a2b";
const INNER_BG = "#211f21";

function formatDate(seconds?: number) {
  if (!seconds) return "Unknown date";
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusLine(props: { message: string; error?: boolean }) {
  if (!props.message) return null;
  return (
    <Text
      fz={12}
      mt={6}
      c={props.error ? "#E35C65" : "#7CD992"}
      role="status"
      aria-live="polite"
    >
      {props.message}
    </Text>
  );
}

function SectionCard(props: { children: React.ReactNode }) {
  return (
    <Box p={16} bg={CARD_BG} style={{ borderRadius: 12 }}>
      {props.children}
    </Box>
  );
}

export function SubmissionCard(props: { submission: PendingSubmission; onDone: () => void }) {
  const { submission } = props;
  const [coins, setCoins] = React.useState<number>(3);
  const [emblemPiece, setEmblemPiece] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  const approve = useMutation({
    mutationFn: () => gradeMission(submission.id, true, { coins, emblemPiece }),
    onSuccess: () => {
      setError(false);
      setMessage("Submission approved and rewards granted.");
      props.onDone();
    },
    onError: (e) => {
      setError(true);
      setMessage((e as Error).message || "Could not approve this submission.");
    },
  });

  const reject = useMutation({
    mutationFn: () => gradeMission(submission.id, false),
    onSuccess: () => {
      setError(false);
      setMessage("Submission rejected.");
      props.onDone();
    },
    onError: (e) => {
      setError(true);
      setMessage((e as Error).message || "Could not reject this submission.");
    },
  });

  const busy = approve.isPending || reject.isPending;

  return (
    <Box p={14} bg={INNER_BG} style={{ borderRadius: 10 }}>
      <Group justify="space-between" wrap="wrap" gap={8} mb={6}>
        <Text c="white" fw={600}>
          {submission.submitterName || "Unknown member"}
        </Text>
        <Text fz={12} c="dimmed">
          {formatDate(submission.submittedAt?.seconds)}
        </Text>
      </Group>
      <Text fz={13} c="rgba(255,255,255,0.8)" mb={4}>
        Mission: {submission.missionId || "Unknown"}
      </Text>
      {submission.threadLink && (
        <Anchor
          href={submission.threadLink}
          target="_blank"
          rel="noopener noreferrer"
          fz={13}
          mb={8}
          style={{ display: "inline-block" }}
        >
          Open submission thread
        </Anchor>
      )}
      <Group gap={12} align="end" wrap="wrap" mt={6}>
        <NumberInput
          label="Snag Coins"
          aria-label="Snag Coins to award"
          value={coins}
          onChange={(v) => setCoins(typeof v === "number" ? v : 0)}
          min={0}
          size="xs"
          w={120}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Checkbox
          label="Award a Snag Emblem Piece"
          checked={emblemPiece}
          onChange={(e) => setEmblemPiece(e.currentTarget.checked)}
          styles={{ label: { color: "white" } }}
        />
      </Group>
      <Group gap={10} wrap="wrap" mt={12}>
        <Button
          radius="lg"
          size="xs"
          color="teal"
          leftSection={<IconCheck size={16} />}
          loading={approve.isPending}
          disabled={busy}
          onClick={() => {
            setMessage("");
            approve.mutateAsync().catch(() => undefined);
          }}
        >
          Approve
        </Button>
        <Button
          radius="lg"
          size="xs"
          variant="light"
          color="red"
          leftSection={<IconX size={16} />}
          loading={reject.isPending}
          disabled={busy}
          onClick={() => {
            setMessage("");
            reject.mutateAsync().catch(() => undefined);
          }}
        >
          Reject
        </Button>
      </Group>
      <StatusLine message={message} error={error} />
    </Box>
  );
}

export function MMRequestCard(props: { request: PendingMMRequest; onDone: () => void }) {
  const { request } = props;
  const [ability, setAbility] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  const grant = useMutation({
    mutationFn: () => grantMasterMission(request.id, ability.trim()),
    onSuccess: () => {
      setError(false);
      setMessage("Master mission granted.");
      props.onDone();
    },
    onError: (e) => {
      setError(true);
      setMessage((e as Error).message || "Could not grant this master mission.");
    },
  });

  return (
    <Box p={14} bg={INNER_BG} style={{ borderRadius: 10 }}>
      <Group justify="space-between" wrap="wrap" gap={8} mb={6}>
        <Text c="white" fw={600}>
          {request.username || "Unknown member"}
        </Text>
        <Text fz={12} c="dimmed">
          {formatDate(request.createdAt?.seconds)}
        </Text>
      </Group>
      <Text fz={13} c="rgba(255,255,255,0.8)" mb={2}>
        Character {request.characterId || "Unknown"}
      </Text>
      <Text fz={13} c="dimmed" mb={8}>
        {request.type || "Unknown"} Master Mission #{request.number ?? "?"}
      </Text>
      <Group gap={10} align="end" wrap="wrap">
        <TextInput
          label="Ability learned"
          aria-label="Ability learned"
          value={ability}
          onChange={(e) => setAbility(e.currentTarget.value)}
          size="xs"
          w={200}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Button
          radius="lg"
          size="xs"
          color="teal"
          leftSection={<IconGift size={16} />}
          loading={grant.isPending}
          disabled={grant.isPending || !ability.trim()}
          onClick={() => {
            setMessage("");
            grant.mutateAsync().catch(() => undefined);
          }}
        >
          Grant
        </Button>
      </Group>
      <StatusLine message={message} error={error} />
    </Box>
  );
}

export function BattleRankingsForm() {
  const [uid, setUid] = React.useState("");
  const [points, setPoints] = React.useState<number>(0);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  const award = useMutation({
    mutationFn: () => awardRankingPoints(uid.trim(), points),
    onSuccess: () => {
      setError(false);
      setMessage("Ranking points awarded.");
    },
    onError: (e) => {
      setError(true);
      setMessage((e as Error).message || "Could not award ranking points.");
    },
  });

  return (
    <SectionCard>
      <Group gap={8} mb={8}>
        <IconTrophy size={18} color="#F0C674" />
        <Text c="white" fw={600}>
          Battle Rankings
        </Text>
      </Group>
      <Text fz={13} c="dimmed" mb={10}>
        Adjust a member's battle ranking points. Points may be negative.
      </Text>
      <Group gap={12} align="end" wrap="wrap">
        <TextInput
          label="Member UID"
          aria-label="Member UID"
          value={uid}
          onChange={(e) => setUid(e.currentTarget.value)}
          size="xs"
          w={220}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <NumberInput
          label="Points"
          aria-label="Ranking points to award"
          value={points}
          onChange={(v) => setPoints(typeof v === "number" ? v : 0)}
          size="xs"
          w={120}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Button
          radius="lg"
          size="xs"
          color="teal"
          loading={award.isPending}
          disabled={award.isPending || !uid.trim()}
          onClick={() => {
            setMessage("");
            award.mutateAsync().catch(() => undefined);
          }}
        >
          Award
        </Button>
      </Group>
      <StatusLine message={message} error={error} />
    </SectionCard>
  );
}

const KIND_OPTIONS = ["badge", "trial", "grandTrial", "eliteFour", "champion"];

export function ChallengeStepForm() {
  const [uid, setUid] = React.useState("");
  const [kind, setKind] = React.useState<string>("badge");
  const [region, setRegion] = React.useState("");
  const [step, setStep] = React.useState("");
  const [zCrystal, setZCrystal] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  const grant = useMutation({
    mutationFn: () =>
      grantChallengeStep(uid.trim(), kind, region.trim(), step.trim(), zCrystal.trim() || undefined),
    onSuccess: () => {
      setError(false);
      setMessage("Challenge step granted.");
    },
    onError: (e) => {
      setError(true);
      setMessage((e as Error).message || "Could not grant this challenge step.");
    },
  });

  const disabled = grant.isPending || !uid.trim() || !region.trim() || !step.trim();

  return (
    <SectionCard>
      <Text c="white" fw={600} mb={4}>
        Challenge Step
      </Text>
      <Text fz={13} c="dimmed" mb={10}>
        Record a badge, trial, grand trial, Elite Four, or champion clear for a member.
      </Text>
      <Group gap={12} align="end" wrap="wrap">
        <TextInput
          label="Member UID"
          aria-label="Member UID"
          value={uid}
          onChange={(e) => setUid(e.currentTarget.value)}
          size="xs"
          w={220}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Select
          label="Kind"
          aria-label="Challenge kind"
          data={KIND_OPTIONS}
          value={kind}
          onChange={(v) => setKind(v ?? "badge")}
          size="xs"
          w={150}
          allowDeselect={false}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <TextInput
          label="Region or Island"
          aria-label="Region or Island"
          value={region}
          onChange={(e) => setRegion(e.currentTarget.value)}
          size="xs"
          w={180}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <TextInput
          label="Step id (gym leader name / trial id)"
          aria-label="Step id, gym leader name or trial id"
          value={step}
          onChange={(e) => setStep(e.currentTarget.value)}
          size="xs"
          w={220}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <TextInput
          label="Z-Crystal (optional)"
          aria-label="Z-Crystal, optional"
          value={zCrystal}
          onChange={(e) => setZCrystal(e.currentTarget.value)}
          size="xs"
          w={180}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Button
          radius="lg"
          size="xs"
          color="teal"
          loading={grant.isPending}
          disabled={disabled}
          onClick={() => {
            setMessage("");
            grant.mutateAsync().catch(() => undefined);
          }}
        >
          Grant
        </Button>
      </Group>
      <StatusLine message={message} error={error} />
    </SectionCard>
  );
}

export default function Grading() {
  const queryClient = useQueryClient();

  const submissions = useQuery({
    queryKey: ["pending-submissions"],
    queryFn: getPendingMissionSubmissions,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const mmRequests = useQuery({
    queryKey: ["pending-mm-requests"],
    queryFn: getPendingMasterMissionRequests,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const refreshSubmissions = () =>
    queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
  const refreshMM = () => queryClient.invalidateQueries({ queryKey: ["pending-mm-requests"] });

  return (
    <Stack gap={18}>
      <Stack gap={6}>
        <Title order={2} c="white" size={24} fw={400}>
          Grading
        </Title>
        <Text fz={13} c="dimmed">
          Approve completed missions and grant progression. Rewards apply through
          server-side functions.
        </Text>
      </Stack>

      <SectionCard>
        <Text c="white" fw={600} mb={10}>
          Mission Submissions
        </Text>
        {submissions.isPending ? (
          <SectionLoader />
        ) : submissions.data && submissions.data.length ? (
          <Stack gap={10}>
            {submissions.data.map((s) => (
              <SubmissionCard key={s.id} submission={s} onDone={refreshSubmissions} />
            ))}
          </Stack>
        ) : (
          <EmptyMessage
            title="All caught up"
            description="There are no mission submissions waiting for grading."
          />
        )}
      </SectionCard>

      <SectionCard>
        <Text c="white" fw={600} mb={10}>
          Master Mission Requests
        </Text>
        {mmRequests.isPending ? (
          <SectionLoader />
        ) : mmRequests.data && mmRequests.data.length ? (
          <Stack gap={10}>
            {mmRequests.data.map((r) => (
              <MMRequestCard key={r.id} request={r} onDone={refreshMM} />
            ))}
          </Stack>
        ) : (
          <EmptyMessage
            title="All caught up"
            description="There are no master mission requests waiting."
          />
        )}
      </SectionCard>

      <BattleRankingsForm />
      <ChallengeStepForm />
    </Stack>
  );
}
