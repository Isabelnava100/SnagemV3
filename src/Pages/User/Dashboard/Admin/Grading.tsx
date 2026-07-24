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
import { friendlyMessage } from "../../../../lib/toast";
import { call } from "../../../../queries/_callable";
import {
  getGradedCount,
  getPendingMasterMissionRequests,
  getPendingMissionSubmissions,
  PendingMMRequest,
  PendingSubmission,
} from "../../../../queries/grading";
import { getMission, gradeMission } from "../../../../queries/missions";
import { grantMasterMission } from "../../../../queries/research";

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
      fz={14}
      mt={6}
      c={props.error ? "#E54156" : "#7CD992"}
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

const REWARD_LABEL: Record<string, string> = {
  snag: "Snag a Pokemon",
  catch: "Catch a Pokemon",
  recruit: "Recruit a Pokemon",
  egg: "A Pokemon egg",
  none: "No Pokemon reward",
};

export function SubmissionCard(props: { submission: PendingSubmission; onDone: () => void }) {
  const { submission } = props;
  const [coins, setCoins] = React.useState<number | null>(null);
  const [emblemPiece, setEmblemPiece] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  // The brief's promised rewards, so grading matches what the member was told.
  const mission = useQuery({
    queryKey: ["mission", submission.missionId],
    queryFn: () => getMission(submission.missionId!),
    enabled: !!submission.missionId,
  });
  const priorRuns = useQuery({
    queryKey: ["graded-count", submission.missionId, submission.submitterUid],
    queryFn: () => getGradedCount(submission.missionId!, submission.submitterUid!),
    enabled: !!submission.missionId && !!submission.submitterUid,
  });
  const promisedCoins = mission.data?.coins;
  // Coins prefill from the brief once it loads; the grader can still adjust.
  const coinsValue = coins ?? promisedCoins ?? 3;
  const emblemEligible = mission.data?.emblem_eligible !== false;
  const rewardKind = mission.data?.pokemon_reward?.kind;

  const approve = useMutation({
    mutationFn: () => gradeMission(submission.id, true, { coins: coinsValue, emblemPiece }),
    onSuccess: () => {
      setError(false);
      setMessage("Submission approved and rewards granted.");
      props.onDone();
    },
    onError: (e) => {
      setError(true);
      setMessage(friendlyMessage(e, "Could not approve this submission."));
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
      setMessage(friendlyMessage(e, "Could not reject this submission."));
    },
  });

  const busy = approve.isPending || reject.isPending;

  return (
    <Box p={14} bg={INNER_BG} style={{ borderRadius: 10 }}>
      <Group justify="space-between" wrap="wrap" gap={8} mb={6}>
        <Text c="white" fw={600}>
          {submission.submitterName || "Unknown member"}
        </Text>
        <Text fz={14} c="dimmed">
          {formatDate(submission.submittedAt?.seconds)}
        </Text>
      </Group>
      <Text fz={14} c="rgba(255,255,255,0.8)" mb={4}>
        Mission: {mission.data?.title || submission.missionId || "Unknown"}
      </Text>
      {mission.data && (
        <Text fz={13} c="dimmed" mb={4}>
          Brief promises: {promisedCoins ?? 0} Snag Coins
          {rewardKind && rewardKind !== "none" ? ` + ${REWARD_LABEL[rewardKind] ?? rewardKind}` : ""}
          {mission.data.special_item ? ` + ${mission.data.special_item}` : ""}
          {emblemEligible ? " (emblem-eligible)" : " (NOT emblem-eligible)"}.
          {mission.data.special_item &&
            " Items outside the auto-grant list are handed out via Donate."}
        </Text>
      )}
      {priorRuns.data !== undefined && priorRuns.data > 0 && (
        <Text fz={13} c="#F0C674" mb={4}>
          This member already completed this mission {priorRuns.data}{" "}
          {priorRuns.data === 1 ? "time" : "times"}. Check the brief for once-per-member rewards.
        </Text>
      )}
      {submission.threadLink && (
        <Anchor
          href={submission.threadLink}
          target="_blank"
          rel="noopener noreferrer"
          fz={14}
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
          description={promisedCoins != null ? `Brief promises ${promisedCoins}` : undefined}
          value={coinsValue}
          onChange={(v) => setCoins(typeof v === "number" ? v : 0)}
          min={0}
          size="xs"
          w={140}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        {emblemEligible && (
          <Checkbox
            label="Award a Snag Emblem Piece"
            checked={emblemPiece}
            onChange={(e) => setEmblemPiece(e.currentTarget.checked)}
            styles={{ label: { color: "white" } }}
          />
        )}
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
            if (!window.confirm("Approve this and grant its rewards? This cannot be undone.")) return;
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
            if (!window.confirm("Reject this submission? This cannot be undone.")) return;
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
      setMessage(friendlyMessage(e, "Could not grant this master mission."));
    },
  });

  return (
    <Box p={14} bg={INNER_BG} style={{ borderRadius: 10 }}>
      <Group justify="space-between" wrap="wrap" gap={8} mb={6}>
        <Text c="white" fw={600}>
          {request.username || "Unknown member"}
        </Text>
        <Text fz={14} c="dimmed">
          {formatDate(request.createdAt?.seconds)}
        </Text>
      </Group>
      <Text fz={14} c="rgba(255,255,255,0.8)" mb={2}>
        Character {request.characterId || "Unknown"}
      </Text>
      <Text fz={14} c="dimmed" mb={8}>
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
            if (!window.confirm("Grant this? Rewards apply immediately and cannot be undone.")) return;
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
      setMessage(friendlyMessage(e, "Could not award ranking points."));
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
      <Text fz={14} c="dimmed" mb={10}>
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
            if (!window.confirm("Award this? It applies immediately and cannot be undone.")) return;
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

// Per-battle scoring scheme. Mirrors the "How Points Work" panel in the
// Colosseum (src/Pages/Colosseum/index.tsx SCORING) and docs/COLOSSEUM_DATA.md.
// Keep these in sync if the scoring ever changes.
const BATTLE_POINTS = {
  defeat: 1, // per opposing Pokemon knocked out
  survive: 1, // per own Pokemon still standing at the end
  win: 3, // winning the battle
  champion: 5, // beating the reigning champion
  upsetPerRank: 0.4, // per rank gap when beating a higher-ranked player
  tournament: 10, // winning a tournament
};

/**
 * Turn a reported battle into a ranking-point delta and award it through the
 * same secured `awardRankingPoints` callable the manual form uses. This only
 * itemizes the math the grader used to do by hand: no new write path, no new
 * collection. Wins/losses/streak still adjust via the manual controls.
 */
export function BattleReportForm() {
  const [uid, setUid] = React.useState("");
  const [defeated, setDefeated] = React.useState<number>(0);
  const [survived, setSurvived] = React.useState<number>(0);
  const [wonBattle, setWonBattle] = React.useState(false);
  const [beatChampion, setBeatChampion] = React.useState(false);
  const [upsetRankGap, setUpsetRankGap] = React.useState<number>(0);
  const [tournamentWin, setTournamentWin] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);

  const breakdown = [
    { label: `${defeated} Pokemon defeated`, pts: defeated * BATTLE_POINTS.defeat, on: defeated > 0 },
    { label: `${survived} Pokemon survived`, pts: survived * BATTLE_POINTS.survive, on: survived > 0 },
    { label: "Won the battle", pts: BATTLE_POINTS.win, on: wonBattle },
    { label: "Beat the champion", pts: BATTLE_POINTS.champion, on: beatChampion },
    {
      label: `Upset (${upsetRankGap} rank gap)`,
      pts: upsetRankGap * BATTLE_POINTS.upsetPerRank,
      on: upsetRankGap > 0,
    },
    { label: "Tournament win", pts: BATTLE_POINTS.tournament, on: tournamentWin },
  ].filter((r) => r.on);

  const rawTotal = breakdown.reduce((sum, r) => sum + r.pts, 0);
  const total = Math.round(rawTotal); // ladder points are whole numbers

  const award = useMutation({
    mutationFn: () => awardRankingPoints(uid.trim(), total),
    onSuccess: () => {
      setError(false);
      setMessage(`Awarded ${total} points from this battle.`);
    },
    onError: (e) => {
      setError(true);
      setMessage(friendlyMessage(e, "Could not award battle points."));
    },
  });

  const numStyles = { input: { background: "#2E2D2E" }, label: { color: "white" } };
  const disabled = award.isPending || !uid.trim() || total === 0;

  return (
    <SectionCard>
      <Group gap={8} mb={4}>
        <IconTrophy size={18} color="#F0C674" />
        <Text c="white" fw={600}>
          Battle Report
        </Text>
      </Group>
      <Text fz={14} c="dimmed" mb={10}>
        Enter what happened in a reported battle and the point total is computed for you,
        then awarded to the member. For a plain manual adjustment use Battle Rankings above.
      </Text>

      <Stack gap={12}>
        <TextInput
          label="Member UID"
          aria-label="Member UID"
          value={uid}
          onChange={(e) => setUid(e.currentTarget.value)}
          size="xs"
          w={220}
          styles={numStyles}
        />

        <Group gap={12} align="end" wrap="wrap">
          <NumberInput
            label="Pokemon defeated"
            aria-label="Opposing Pokemon defeated"
            value={defeated}
            onChange={(v) => setDefeated(typeof v === "number" ? v : 0)}
            min={0}
            size="xs"
            w={150}
            styles={numStyles}
          />
          <NumberInput
            label="Own Pokemon survived"
            aria-label="Own Pokemon that survived"
            value={survived}
            onChange={(v) => setSurvived(typeof v === "number" ? v : 0)}
            min={0}
            size="xs"
            w={170}
            styles={numStyles}
          />
          <NumberInput
            label="Upset rank gap"
            aria-label="Rank gap for an upset win"
            description="Ranks above the opponent you beat"
            value={upsetRankGap}
            onChange={(v) => setUpsetRankGap(typeof v === "number" ? v : 0)}
            min={0}
            size="xs"
            w={170}
            styles={numStyles}
          />
        </Group>

        <Group gap={16} wrap="wrap">
          <Checkbox
            label="Won the battle"
            checked={wonBattle}
            onChange={(e) => setWonBattle(e.currentTarget.checked)}
            styles={{ label: { color: "white" } }}
          />
          <Checkbox
            label="Beat the champion"
            checked={beatChampion}
            onChange={(e) => setBeatChampion(e.currentTarget.checked)}
            styles={{ label: { color: "white" } }}
          />
          <Checkbox
            label="Tournament win"
            checked={tournamentWin}
            onChange={(e) => setTournamentWin(e.currentTarget.checked)}
            styles={{ label: { color: "white" } }}
          />
        </Group>

        <Box p={12} bg={INNER_BG} style={{ borderRadius: 10 }}>
          {breakdown.length ? (
            <Stack gap={4}>
              {breakdown.map((r) => (
                <Group key={r.label} justify="space-between" wrap="nowrap">
                  <Text fz={14} c="rgba(255,255,255,0.8)">
                    {r.label}
                  </Text>
                  <Text fz={14} c="#7CD992" fw={600}>
                    +{r.pts}
                  </Text>
                </Group>
              ))}
              <Group
                justify="space-between"
                wrap="nowrap"
                pt={6}
                mt={2}
                style={{ borderTop: "1px solid #3a3550" }}
              >
                <Text fz={14} c="white" fw={700}>
                  Total to award
                </Text>
                <Text fz={20} c="#F0C674" fw={800}>
                  {total}
                </Text>
              </Group>
            </Stack>
          ) : (
            <Text fz={14} c="dimmed">
              Fill in the battle result to see the point total.
            </Text>
          )}
        </Box>

        <Button
          radius="lg"
          size="xs"
          color="teal"
          w={180}
          loading={award.isPending}
          disabled={disabled}
          onClick={() => {
            if (!window.confirm("Award this? It applies immediately and cannot be undone.")) return;
            setMessage("");
            award.mutateAsync().catch(() => undefined);
          }}
        >
          Award {total} points
        </Button>
      </Stack>
      <StatusLine message={message} error={error} />
    </SectionCard>
  );
}

const KIND_OPTIONS = ["badge", "trial", "grandTrial", "eliteFour", "champion", "rematch"];

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
      setMessage(friendlyMessage(e, "Could not grant this challenge step."));
    },
  });

  const disabled = grant.isPending || !uid.trim() || !region.trim() || !step.trim();

  return (
    <SectionCard>
      <Text c="white" fw={600} mb={4}>
        Challenge Step
      </Text>
      <Text fz={14} c="dimmed" mb={10}>
        Record a badge, trial, grand trial, Elite Four, or champion clear for a member. For a
        rematch win, use kind &quot;rematch&quot; with the leader&apos;s name as the step: it
        bumps that leader&apos;s ladder tier.
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
            if (!window.confirm("Grant this? Rewards apply immediately and cannot be undone.")) return;
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
        <Title order={2} c="white" size={28} fw={400}>
          Grading
        </Title>
        <Text fz={14} c="dimmed">
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
      <BattleReportForm />
      <ChallengeStepForm />
    </Stack>
  );
}
