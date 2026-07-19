import { Box, Button, Card, Container, Flex, Group, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconCheck, IconExternalLink, IconStar } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import {
  ChallengeProgress,
  ChallengeRequest,
  Gym,
  GymRegion,
  IslandTrial,
  getChallengeProgress,
  getGymRegions,
  getIslandTrials,
  getMyChallengeRequests,
  requestChallenge,
} from "../../queries/challenges";

/**
 * The two progress-tracked challenge systems: Gym Leader Runs and Island
 * Trials. Admins/directors host every challenge thread, so "starting" a stage
 * files a challengeRequest (Cloud Function) that pings the hosting staff; the
 * page otherwise only reads. Each system draws a progress hero (badge case /
 * Z-crystals + final prize) and an ordered vertical timeline; the next
 * uncleared stop glows. Renders safely with no user, empty content and no
 * progress.
 */

type NodeState = "cleared" | "available" | "locked";
type StageKind = "GYM" | "ELITE FOUR" | "CHAMPION" | "TRIAL" | "GRAND TRIAL";

interface Stage {
  key: string;
  order: number;
  kind: StageKind;
  title: string;
  type?: string;
  desc: string;
  state: NodeState;
  /** requestChallenge payload for this stage. */
  requestKind: "gym" | "trial";
  requestRegion: string;
  requestStageId: string;
}

const BAR_GRADIENT = "linear-gradient(90deg, #c026d3, #6366f1, #22d3ee)";

const TAB_SUBTITLES: Record<string, string> = {
  gyms:
    "Follow the path from gym to gym, clear all 8 in order, then take on the Elite Four and Champion. Your next battle glows, tap it to begin.",
  trials:
    "Journey island to island: clear each trial, topple every Totem, then face the Kahunas in their Grand Trials. Your next stop glows, tap it to begin.",
};

// Standard Pokemon type colors, used for badges, nodes and crystals.
const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#E0B000",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#8888A8", Fairy: "#EE99AC",
};
const typeColor = (t?: string) => (t && TYPE_COLORS[t]) || "#8a8399";

const TYPE_TEXT_DARK = new Set(["#E0B000", "#F8D030", "#98D8D8", "#EE99AC", "#E0C068"]);

/* --------------------------------- Hero bits -------------------------------- */

function GradientBar({ pct }: { pct: number }) {
  return (
    <Box style={{ height: 8, borderRadius: 999, background: "#2a2637", overflow: "hidden" }}>
      <Box style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: BAR_GRADIENT }} />
    </Box>
  );
}

/** One circle in the badge case / Z-crystal row. */
function Collectible(props: { label: string; sublabel: string; color: string; earned: boolean }) {
  const darkText = TYPE_TEXT_DARK.has(props.color);
  return (
    <Stack gap={6} align="center" w={60} style={{ flexShrink: 0 }}>
      <Box
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 16,
          color: props.earned ? (darkText ? "#1a1626" : "#fff") : "#6a6580",
          background: props.earned ? props.color : "transparent",
          border: props.earned ? `2px solid ${props.color}` : "2px dashed #3a3550",
        }}
      >
        {props.earned ? props.label : "?"}
      </Box>
      <Text fz={14} ta="center" lineClamp={1} c={props.earned ? "rgba(255,255,255,0.8)" : "dimmed"}>
        {props.earned ? props.sublabel : "locked"}
      </Text>
    </Stack>
  );
}

function ProgressHero(props: {
  icon: string;
  eyebrow: string;
  title: string;
  cleared: number;
  total: number;
  collectibleLabel: string;
  collectibles: React.ReactNode;
  finalPrize: string;
}) {
  const pct = props.total ? Math.round((props.cleared / props.total) * 100) : 0;
  return (
    <Card bg="#141019" radius="lg" p="lg" withBorder style={{ borderColor: "#2a2637" }} mb="xl">
      <Group justify="space-between" wrap="wrap" gap="md" mb="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: "linear-gradient(135deg, #a855f7, #22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              flexShrink: 0,
            }}
          >
            {props.icon}
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text fz={14} fw={800} c="grape.3" tt="uppercase" style={{ letterSpacing: 1 }}>
              {props.eyebrow}
            </Text>
            <Text fz={28} fw={800} c="white" lineClamp={1}>
              {props.title}
            </Text>
          </Box>
        </Group>
        <Box ta="right">
          <Text fz={14} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
            Progress
          </Text>
          <Text fz={26} fw={800} c="white">
            {props.cleared}{" "}
            <Text span c="dimmed" fz={16} fw={600}>
              / {props.total} cleared
            </Text>
          </Text>
        </Box>
      </Group>

      <GradientBar pct={pct} />

      <Flex mt="lg" gap="lg" direction={{ base: "column", md: "row" }} align="flex-start">
        <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
          <Text fz={14} fw={700} c="dimmed" tt="uppercase" mb={12} style={{ letterSpacing: 1 }}>
            {props.collectibleLabel}
          </Text>
          <Group gap={12} style={{ rowGap: 14 }}>
            {props.collectibles}
          </Group>
        </Box>
        <Box
          p="md"
          style={{
            borderRadius: 12,
            border: "1px solid #5a4a2a",
            background: "linear-gradient(135deg, #2a1f14, #231a2e)",
            maxWidth: 380,
            width: "100%",
          }}
        >
          <Group gap={6} mb={6}>
            <IconStar size={16} color="#F5C842" />
            <Text fz={14} fw={800} c="#F5C842" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Final Prize
            </Text>
          </Group>
          <Text fz={14} c="rgba(255,255,255,0.85)">
            {props.finalPrize}
          </Text>
        </Box>
      </Flex>
    </Card>
  );
}

/* -------------------------------- Timeline --------------------------------- */

const KIND_STYLES: Record<StageKind, { bg: string; fg: string }> = {
  GYM: { bg: "#2a2637", fg: "#c9c4d6" },
  "ELITE FOUR": { bg: "#3a2a55", fg: "#d8c4ff" },
  CHAMPION: { bg: "#4a3a1a", fg: "#f5d98a" },
  TRIAL: { bg: "#2a2637", fg: "#c9c4d6" },
  "GRAND TRIAL": { bg: "#4a3a1a", fg: "#f5d98a" },
};

function TimelineNode(props: { order: number; state: NodeState; color: string }) {
  const { state, color } = props;
  const cleared = state === "cleared";
  const available = state === "available";
  return (
    <Box style={{ position: "relative", width: 68, flexShrink: 0, display: "flex", justifyContent: "center" }}>
      <Box
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: cleared ? color : "#1a1622",
          border: available ? `3px solid ${color}` : cleared ? "none" : "2px solid #322d40",
          boxShadow: available ? `0 0 0 5px ${color}33` : "none",
          opacity: state === "locked" ? 0.55 : 1,
        }}
      >
        {cleared ? (
          <IconCheck size={28} color="#fff" />
        ) : available ? (
          <IconStar size={26} color={color} fill={color} />
        ) : (
          <Text fz={24} fw={800} c="#6a6580">
            {props.order}
          </Text>
        )}
      </Box>
      {/* order chip */}
      <Box
        style={{
          position: "absolute",
          top: -4,
          right: 4,
          minWidth: 22,
          height: 22,
          padding: "0 6px",
          borderRadius: 999,
          background: "#0e0c14",
          border: "1px solid #322d40",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text fz={14} fw={700} c="white">
          {props.order}
        </Text>
      </Box>
      {available && (
        <Box
          style={{
            position: "absolute",
            bottom: -12,
            padding: "1px 8px",
            borderRadius: 999,
            background: "#F5C842",
          }}
        >
          <Text fz={14} fw={800} c="#1a1626" tt="uppercase">
            Here
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface StageRequestProps {
  /** The member's request for this stage, when one exists. */
  request?: ChallengeRequest;
  onRequest: (stage: Stage) => void;
  requesting: boolean;
  signedIn: boolean;
}

function TimelineItem(props: { stage: Stage } & StageRequestProps) {
  const { stage, request, onRequest, requesting, signedIn } = props;
  const color = typeColor(stage.type);
  const cleared = stage.state === "cleared";
  const available = stage.state === "available";
  const locked = stage.state === "locked";
  const kindStyle = KIND_STYLES[stage.kind];

  return (
    <Group align="flex-start" gap="lg" wrap="nowrap">
      <TimelineNode order={stage.order} state={stage.state} color={color} />
      <Card
        bg={available ? "#1c1836" : "#141019"}
        radius="lg"
        p="md"
        withBorder
        style={{
          borderColor: available ? "#5a3fb0" : "#232028",
          flex: "1 1 0%",
          minWidth: 0,
          opacity: locked ? 0.6 : 1,
        }}
      >
        <Group gap={8} mb={8}>
          <Text
            fz={14}
            fw={800}
            tt="uppercase"
            px={8}
            py={2}
            style={{ borderRadius: 6, background: kindStyle.bg, color: kindStyle.fg, letterSpacing: 0.5 }}
          >
            {stage.kind}
          </Text>
          {cleared && (
            <Text fz={14} fw={700} c="#7CD992" tt="uppercase">
              &#10003; Cleared
            </Text>
          )}
          {available && (
            <Text fz={14} fw={800} c="grape.3" tt="uppercase">
              &#9654; Your next battle
            </Text>
          )}
          {locked && (
            <Text fz={14} fw={700} c="dimmed" tt="uppercase">
              Locked
            </Text>
          )}
        </Group>

        <Group gap={8} mb={6} wrap="nowrap">
          <Text fz={24} fw={800} c="white" lineClamp={1}>
            {stage.title}
          </Text>
          {stage.type && (
            <Text
              fz={14}
              fw={700}
              px={8}
              py={2}
              style={{ borderRadius: 999, background: color, color: TYPE_TEXT_DARK.has(color) ? "#1a1626" : "#fff" }}
            >
              {stage.type}
            </Text>
          )}
        </Group>

        <Text fz={14} c="dimmed" mb={!locked ? 12 : 0}>
          {stage.desc}
        </Text>

        {available &&
          (request?.status === "requested" ? (
            <Stack gap={6}>
              <Button variant="default" radius="xl" disabled w="fit-content">
                Challenge requested
              </Button>
              <Text fz={14} c="gold.1" role="status" aria-live="polite">
                Your challenge has been requested. Please wait until an admin accepts it and
                sets up your thread.
              </Text>
            </Stack>
          ) : request?.status === "accepted" ? (
            <Stack gap={6}>
              {request.threadLink ? (
                <Button
                  component={Link}
                  to={request.threadLink}
                  variant="gradient"
                  gradient={{ from: "grape", to: "cyan", deg: 90 }}
                  radius="xl"
                  w="fit-content"
                  rightSection={<IconExternalLink size={14} />}
                >
                  Go to your challenge thread
                </Button>
              ) : (
                <Text fz={14} c="teal.3" role="status" aria-live="polite">
                  Accepted! An admin is setting up your thread; watch your notifications.
                </Text>
              )}
            </Stack>
          ) : (
            <Stack gap={6}>
              <Button
                variant="gradient"
                gradient={{ from: "grape", to: "cyan", deg: 90 }}
                radius="xl"
                w="fit-content"
                rightSection={<IconArrowRight size={16} />}
                loading={requesting}
                disabled={!signedIn}
                onClick={() => onRequest(stage)}
              >
                Start this Challenge
              </Button>
              {!signedIn && (
                <Text fz={14} c="dimmed">
                  Sign in to request this challenge.
                </Text>
              )}
            </Stack>
          ))}
      </Card>
    </Group>
  );
}

function Timeline(props: {
  stages: Stage[];
  requestsByStage: Map<string, ChallengeRequest>;
  onRequest: (stage: Stage) => void;
  requestingStageId: string | null;
  signedIn: boolean;
}) {
  return (
    <Box style={{ position: "relative" }}>
      {/* dotted rail behind the nodes (node centers sit at x=34) */}
      <Box
        style={{
          position: "absolute",
          left: 33,
          top: 30,
          bottom: 30,
          borderLeft: "2px dotted #322d40",
        }}
      />
      <Stack gap="lg">
        {props.stages.map((s) => (
          <TimelineItem
            key={s.key}
            stage={s}
            request={props.requestsByStage.get(s.requestStageId)}
            onRequest={props.onRequest}
            requesting={props.requestingStageId === s.requestStageId}
            signedIn={props.signedIn}
          />
        ))}
      </Stack>
    </Box>
  );
}

/* --------------------------- Stage builders -------------------------------- */

function buildGymStages(region: GymRegion, progress: ChallengeProgress): Stage[] {
  const gyms: Gym[] = [...(region.gyms ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const earned = progress.badges?.[region.id] ?? [];
  const eliteDone = progress.eliteFour?.[region.id] ?? false;
  const championDone = progress.champion?.[region.id] ?? false;

  const isGymCleared = (g: Gym) => earned.includes(g.leaderName);
  const allBadges = gyms.length > 0 && gyms.every(isGymCleared);
  const firstOpen = gyms.findIndex((g) => !isGymCleared(g));

  const stages: Stage[] = gyms.map((g, i) => ({
    key: `gym-${g.order}-${g.leaderName}`,
    order: i + 1,
    kind: "GYM",
    title: g.leaderName,
    type: g.type,
    desc: [
      g.fieldDescription,
      `${cap(g.battleFormat ?? "single")} battle, up to ${g.challengerPokemonLimit || 6} Pokemon.`,
    ]
      .filter(Boolean)
      .join(" · "),
    state: isGymCleared(g) ? "cleared" : i === firstOpen ? "available" : "locked",
    requestKind: "gym",
    requestRegion: region.id,
    requestStageId: `${region.id}:gym-${g.order}-${g.leaderName}`,
  }));

  const eliteState: NodeState = eliteDone ? "cleared" : allBadges ? "available" : "locked";
  const championState: NodeState = championDone ? "cleared" : allBadges && eliteDone ? "available" : "locked";
  const eliteNames = (region.eliteFour?.members ?? []).map((m) => m.name).join(", ");

  stages.push({
    key: "elite-four",
    order: gyms.length + 1,
    kind: "ELITE FOUR",
    title: "Elite Four",
    desc: eliteNames
      ? `${eliteNames}. Four straight battles, no healing between them.`
      : "Four straight battles, no healing between them.",
    state: eliteState,
    requestKind: "gym",
    requestRegion: region.id,
    requestStageId: `${region.id}:elite-four`,
  });
  stages.push({
    key: "champion",
    order: gyms.length + 2,
    kind: "CHAMPION",
    title: region.eliteFour?.champion?.name || "Champion",
    desc: region.championPrize || "Beat the Champion to complete this region.",
    state: championState,
    requestKind: "gym",
    requestRegion: region.id,
    requestStageId: `${region.id}:champion`,
  });

  return stages;
}

function buildTrialStages(trials: IslandTrial[], progress: ChallengeProgress): Stage[] {
  const sorted = [...trials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completed = new Set([...(progress.trialsCompleted ?? []), ...(progress.grandTrials ?? [])]);
  const firstOpen = sorted.findIndex((t) => !completed.has(t.id));

  return sorted.map((t, i): Stage => {
    const grand = !!t.grand;
    const reward = [
      t.snagCoins != null ? `${t.snagCoins} coins` : null,
      t.zCrystalReward || null,
    ]
      .filter(Boolean)
      .join(" + ");
    const desc = grand
      ? [
          t.kahuna ? `Kahuna ${t.kahuna}.` : null,
          "Grand Trial, back-to-back battle.",
          reward ? `Reward: ${reward}.` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : [
          t.captain ? `Captain ${t.captain} ·` : null,
          t.totemPokemon ? `Totem ${t.totemPokemon}.` : null,
          "Battle the hidden Pokemon, then the Totem.",
          reward ? `Reward: ${reward}.` : null,
        ]
          .filter(Boolean)
          .join(" ");
    return {
      key: t.id,
      order: t.order ?? i + 1,
      kind: grand ? "GRAND TRIAL" : "TRIAL",
      title: t.name,
      type: t.type,
      desc,
      state: completed.has(t.id) ? "cleared" : i === firstOpen ? "available" : "locked",
      requestKind: "trial",
      requestRegion: t.island || "alola",
      requestStageId: t.id,
    };
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------------------------- Tabs ----------------------------------- */

function GymRunsTab(props: { regions: GymRegion[]; progress: ChallengeProgress } & TabRequestProps) {
  const { regions, progress } = props;
  const [regionId, setRegionId] = React.useState<string | null>(regions[0]?.id ?? null);

  React.useEffect(() => {
    if (regions.length && !regions.some((r) => r.id === regionId)) setRegionId(regions[0].id);
  }, [regions, regionId]);

  if (!regions.length) {
    return (
      <Text fz={14} c="dimmed" ta="center" py={30}>
        Regions are being set up. Check back soon.
      </Text>
    );
  }

  const region = regions.find((r) => r.id === regionId) ?? regions[0];
  const gyms = [...(region.gyms ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const earned = progress.badges?.[region.id] ?? [];
  const stages = buildGymStages(region, progress);
  const cleared = stages.filter((s) => s.state === "cleared").length;

  return (
    <Stack gap={0}>
      <Group gap={8} wrap="wrap" mb="lg" role="tablist" aria-label="Select a region">
        <Text fz={14} fw={700} c="dimmed" tt="uppercase" mr={4} style={{ letterSpacing: 1 }}>
          Region
        </Text>
        {regions.map((r) => (
          <Button
            key={r.id}
            size="xs"
            radius="xl"
            variant={r.id === region.id ? "gradient" : "default"}
            gradient={{ from: "grape", to: "violet", deg: 90 }}
            onClick={() => setRegionId(r.id)}
            aria-pressed={r.id === region.id}
          >
            {r.name}
          </Button>
        ))}
      </Group>

      <ProgressHero
        icon="⚔️"
        eyebrow="Gym Champion Run"
        title={`${region.name} League`}
        cleared={cleared}
        total={stages.length}
        collectibleLabel="Badge Case"
        finalPrize={region.championPrize || "Beat the Champion to claim this region's prize."}
        collectibles={gyms.map((g) => (
          <Collectible
            key={g.leaderName}
            label={g.leaderName.charAt(0).toUpperCase()}
            sublabel={g.leaderName}
            color={typeColor(g.type)}
            earned={earned.includes(g.leaderName)}
          />
        ))}
      />

      <Timeline
        stages={stages}
        requestsByStage={props.requestsByStage}
        onRequest={props.onRequest}
        requestingStageId={props.requestingStageId}
        signedIn={props.signedIn}
      />

      <RematchLadder region={region} progress={progress} signedIn={props.signedIn} />
    </Stack>
  );
}

/**
 * The Rematch Ladder: any leader whose badge is earned can be challenged
 * again, tier after tier, each round tougher than the last (staff host the
 * thread and are nudged with a suggested star level for the tier). Wins are
 * granted by graders with the "rematch" challenge kind.
 */
function RematchLadder(props: { region: GymRegion; progress: ChallengeProgress; signedIn: boolean }) {
  const { region, progress } = props;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState("");
  const earned = progress.badges?.[region.id] ?? [];
  const tiers = progress.rematches?.[region.id] ?? {};
  const beatenGyms = [...(region.gyms ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((g) => earned.includes(g.leaderName));

  const mutation = useMutation({
    mutationFn: (leader: string) =>
      requestChallenge({
        kind: "rematch",
        regionOrIsland: region.id,
        stageId: leader,
        stageTitle: leader,
      }),
    onSuccess: (res) => {
      setMessage(
        res.duplicate
          ? "That rematch request is already waiting for a host."
          : "Rematch requested! A staff host will set up your thread."
      );
      queryClient.invalidateQueries({ queryKey: ["my-challenge-requests", user?.uid] });
    },
    onError: (e) => setMessage((e as Error).message || "Could not request that rematch."),
  });

  if (!props.signedIn || !beatenGyms.length) return null;

  return (
    <Card bg="#141019" radius="lg" p="lg" withBorder style={{ borderColor: "#2a2637" }} mt="xl">
      <Text fz={14} fw={700} c="grape.3" tt="uppercase" style={{ letterSpacing: 2 }}>
        Rematch Ladder
      </Text>
      <Text fz={22} fw={800} c="white">
        Beaten leaders want revenge
      </Text>
      <Text fz={14} c="dimmed" mb={12}>
        Challenge any leader you hold a badge from to a rematch. Every tier is a tougher fight
        with a stronger roster; your host sets the exact team.
      </Text>
      <Stack gap={8}>
        {beatenGyms.map((g) => {
          const wins = Number(tiers[g.leaderName]) || 0;
          const nextTier = wins + 1;
          const suggestedStar = Math.min(7, 3 + nextTier);
          return (
            <Group key={g.leaderName} justify="space-between" wrap="wrap" gap={8}>
              <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    background: typeColor(g.type),
                    color: TYPE_TEXT_DARK.has(typeColor(g.type)) ? "#1a1626" : "#fff",
                    flexShrink: 0,
                  }}
                >
                  {g.leaderName.charAt(0).toUpperCase()}
                </Box>
                <Box style={{ minWidth: 0 }}>
                  <Text fz={15} fw={700} c="white">
                    {g.leaderName}
                  </Text>
                  <Text fz={13} c="dimmed">
                    {wins ? `${wins} rematch win${wins === 1 ? "" : "s"}` : "No rematches yet"} ·
                    next: Tier {nextTier} (about {suggestedStar}★ opposition)
                  </Text>
                </Box>
              </Group>
              <Button
                size="xs"
                radius="xl"
                variant="light"
                color="grape"
                loading={mutation.isPending && mutation.variables === g.leaderName}
                onClick={() => {
                  setMessage("");
                  mutation.mutate(g.leaderName);
                }}
              >
                Request Rematch
              </Button>
            </Group>
          );
        })}
      </Stack>
      {message && (
        <Text fz={14} mt="sm" c="grape.2" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Card>
  );
}

function IslandTrialsTab(props: { trials: IslandTrial[]; progress: ChallengeProgress } & TabRequestProps) {
  const { trials, progress } = props;

  if (!trials.length) {
    return (
      <Text fz={14} c="dimmed" ta="center" py={30}>
        Trials coming soon.
      </Text>
    );
  }

  const sorted = [...trials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completed = new Set([...(progress.trialsCompleted ?? []), ...(progress.grandTrials ?? [])]);
  const stages = buildTrialStages(trials, progress);
  const cleared = stages.filter((s) => s.state === "cleared").length;

  return (
    <Stack gap={0}>
      <ProgressHero
        icon="🏝️"
        eyebrow="Island Challenge"
        title="Alola Trials"
        cleared={cleared}
        total={stages.length}
        collectibleLabel="Z-Crystals"
        finalPrize="Clear all Grand Trials to earn the full Z-Crystal set and Alola Champion standing."
        collectibles={sorted.map((t) => {
          const crystal = t.zCrystalReward
            ? t.zCrystalReward.replace(/\s*Z$/i, "")
            : t.type
              ? `${t.type}ium`
              : "Z-Crystal";
          return (
            <Collectible
              key={t.id}
              label="Z"
              sublabel={crystal}
              color={typeColor(t.type)}
              earned={completed.has(t.id)}
            />
          );
        })}
      />

      <Timeline
        stages={stages}
        requestsByStage={props.requestsByStage}
        onRequest={props.onRequest}
        requestingStageId={props.requestingStageId}
        signedIn={props.signedIn}
      />
    </Stack>
  );
}

/** Request plumbing shared by both tabs (owned by the page component). */
interface TabRequestProps {
  requestsByStage: Map<string, ChallengeRequest>;
  onRequest: (stage: Stage) => void;
  requestingStageId: string | null;
  signedIn: boolean;
}

/** Explains the admin-hosted flow so members know what happens after they ask. */
function HowChallengesWork() {
  return (
    <Card bg="#141019" radius="lg" p="lg" withBorder style={{ borderColor: "#2a2637" }} mb="xl">
      <Text fz={14} fw={800} c="white" tt="uppercase" mb={8} style={{ letterSpacing: 1 }}>
        How challenges work
      </Text>
      <Stack gap={6}>
        <Text fz={14} c="dimmed">
          1. Press Start this Challenge on your next glowing stage. That sends a request to the
          admins and directors.
        </Text>
        <Text fz={14} c="dimmed">
          2. An admin accepts your challenge and creates your thread in the forums. They lead the
          thread and guide you through what happens next.
        </Text>
        <Text fz={14} c="dimmed">
          3. Roleplay the battle in that thread. When it wraps up, a grader marks the stage
          cleared here and your progress updates.
        </Text>
        <Text fz={14} c="dimmed">
          The opposing team changes from person to person, so it stays hidden until your host
          reveals it in the thread.
        </Text>
      </Stack>
    </Card>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function Challenges() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<"gyms" | "trials">("gyms");
  const [requestingStageId, setRequestingStageId] = React.useState<string | null>(null);

  const regionsQuery = useQuery({ queryKey: ["gym-regions"], queryFn: getGymRegions });
  const trialsQuery = useQuery({ queryKey: ["island-trials"], queryFn: getIslandTrials });
  const progressQuery = useQuery({
    queryKey: ["challenge-progress", uid],
    queryFn: () => getChallengeProgress(uid as string),
    enabled: Boolean(uid),
  });
  const myRequestsQuery = useQuery({
    queryKey: ["my-challenge-requests", uid],
    queryFn: () => getMyChallengeRequests(uid as string),
    enabled: Boolean(uid),
  });

  // One request per stage: an open request always wins, otherwise the newest
  // resolved one, so a re-request after a decline shows as pending again.
  const requestsByStage = React.useMemo(() => {
    const map = new Map<string, ChallengeRequest>();
    for (const req of myRequestsQuery.data ?? []) {
      const existing = map.get(req.stageId);
      if (!existing) {
        map.set(req.stageId, req);
        continue;
      }
      if (existing.status === "requested") continue;
      if (
        req.status === "requested" ||
        (req.createdAt?.seconds ?? 0) > (existing.createdAt?.seconds ?? 0)
      ) {
        map.set(req.stageId, req);
      }
    }
    return map;
  }, [myRequestsQuery.data]);

  const requestMutation = useMutation({
    mutationFn: (stage: Stage) =>
      requestChallenge({
        kind: stage.requestKind,
        regionOrIsland: stage.requestRegion,
        stageId: stage.requestStageId,
        stageTitle: `${stage.kind} · ${stage.title}`,
      }),
    onSettled: () => {
      setRequestingStageId(null);
      queryClient.invalidateQueries({ queryKey: ["my-challenge-requests", uid] });
    },
  });

  const onRequest = (stage: Stage) => {
    if (requestMutation.isPending) return;
    setRequestingStageId(stage.requestStageId);
    requestMutation.mutate(stage);
  };

  const loading =
    regionsQuery.isPending || trialsQuery.isPending || (Boolean(uid) && progressQuery.isPending);
  const progress: ChallengeProgress = progressQuery.data ?? {};
  const tabRequestProps: TabRequestProps = {
    requestsByStage,
    onRequest,
    requestingStageId,
    signedIn: Boolean(uid),
  };

  const TABS: { value: "gyms" | "trials"; label: string; icon: string }[] = [
    { value: "gyms", label: "Gym Leader Runs", icon: "⚔️" },
    { value: "trials", label: "Island Trials", icon: "🏝️" },
  ];

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <PageHero
        eyebrow="Gyms and Island Trials"
        title="Take on a Challenge!"
        subtitle={TAB_SUBTITLES[tab]}
      >
        <Group gap={10}>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <Button
                key={t.value}
                onClick={() => setTab(t.value)}
                radius="xl"
                variant={active ? "gradient" : "default"}
                gradient={{ from: "grape", to: "violet", deg: 90 }}
                leftSection={<span style={{ fontSize: 16 }}>{t.icon}</span>}
                styles={active ? undefined : { root: { background: "rgba(0,0,0,0.25)", borderColor: "#4a4368", color: "#fff" } }}
              >
                {t.label}
              </Button>
            );
          })}
        </Group>
      </PageHero>

      {loading ? (
        <SectionLoader />
      ) : (
        <>
          <HowChallengesWork />
          {tab === "gyms" ? (
            <GymRunsTab regions={regionsQuery.data ?? []} progress={progress} {...tabRequestProps} />
          ) : (
            <IslandTrialsTab trials={trialsQuery.data ?? []} progress={progress} {...tabRequestProps} />
          )}
        </>
      )}
    </Container>
  );
}

