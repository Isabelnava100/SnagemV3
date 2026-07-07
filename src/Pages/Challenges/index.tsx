import { Box, Button, Card, Container, Flex, Group, Image, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconCheck, IconExternalLink, IconStar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import {
  ChallengeProgress,
  Gym,
  GymRegion,
  IslandTrial,
  getChallengeProgress,
  getGymRegions,
  getIslandTrials,
} from "../../queries/challenges";

/**
 * Public, display-only view of the two progress-tracked challenge systems:
 * Gym Leader Runs and Island Trials. Progression is granted by admins/graders
 * elsewhere, so this page never writes. Each system draws a progress hero
 * (badge case / Z-crystals + final prize) and an ordered vertical timeline; the
 * next uncleared stop glows. Renders safely with no user, empty content and no
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
  teamSlugs: string[];
  state: NodeState;
}

const HEADER_GRADIENT = "linear-gradient(120deg, #3a1d63 0%, #2c2352 55%, #1c2a4a 100%)";
const HEADER_STRIPES =
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 12px, transparent 12px, transparent 24px)";
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
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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
          fontSize: 15,
          color: props.earned ? (darkText ? "#1a1626" : "#fff") : "#6a6580",
          background: props.earned ? props.color : "transparent",
          border: props.earned ? `2px solid ${props.color}` : "2px dashed #3a3550",
        }}
      >
        {props.earned ? props.label : "?"}
      </Box>
      <Text fz={10} ta="center" lineClamp={1} c={props.earned ? "rgba(255,255,255,0.8)" : "dimmed"}>
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
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            {props.icon}
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text fz={11} fw={800} c="grape.3" tt="uppercase" style={{ letterSpacing: 1 }}>
              {props.eyebrow}
            </Text>
            <Text fz={24} fw={800} c="white" lineClamp={1}>
              {props.title}
            </Text>
          </Box>
        </Group>
        <Box ta="right">
          <Text fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
            Progress
          </Text>
          <Text fz={22} fw={800} c="white">
            {props.cleared}{" "}
            <Text span c="dimmed" fz={15} fw={600}>
              / {props.total} cleared
            </Text>
          </Text>
        </Box>
      </Group>

      <GradientBar pct={pct} />

      <Flex mt="lg" gap="lg" direction={{ base: "column", md: "row" }} align="flex-start">
        <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
          <Text fz={11} fw={700} c="dimmed" tt="uppercase" mb={12} style={{ letterSpacing: 1 }}>
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
            <IconStar size={16} color="#f5c518" />
            <Text fz={12} fw={800} c="#f5c518" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Final Prize
            </Text>
          </Group>
          <Text fz={13} c="rgba(255,255,255,0.85)">
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
          <Text fz={20} fw={800} c="#6a6580">
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
        <Text fz={11} fw={700} c="white">
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
            background: "#f5c518",
          }}
        >
          <Text fz={9} fw={800} c="#1a1626" tt="uppercase">
            Here
          </Text>
        </Box>
      )}
    </Box>
  );
}

function TimelineItem(props: { stage: Stage }) {
  const { stage } = props;
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
            fz={10}
            fw={800}
            tt="uppercase"
            px={8}
            py={2}
            style={{ borderRadius: 6, background: kindStyle.bg, color: kindStyle.fg, letterSpacing: 0.5 }}
          >
            {stage.kind}
          </Text>
          {cleared && (
            <Text fz={11} fw={700} c="#7CD992" tt="uppercase">
              &#10003; Cleared
            </Text>
          )}
          {available && (
            <Text fz={11} fw={800} c="grape.3" tt="uppercase">
              &#9654; Your next battle
            </Text>
          )}
          {locked && (
            <Text fz={11} fw={700} c="dimmed" tt="uppercase">
              Locked
            </Text>
          )}
        </Group>

        <Group gap={8} mb={6} wrap="nowrap">
          <Text fz={20} fw={800} c="white" lineClamp={1}>
            {stage.title}
          </Text>
          {stage.type && (
            <Text
              fz={11}
              fw={700}
              px={8}
              py={2}
              style={{ borderRadius: 999, background: color, color: TYPE_TEXT_DARK.has(color) ? "#1a1626" : "#fff" }}
            >
              {stage.type}
            </Text>
          )}
        </Group>

        <Text fz={13} c="dimmed" mb={stage.teamSlugs.length || !locked ? 12 : 0}>
          {stage.desc}
        </Text>

        {stage.teamSlugs.length > 0 && (
          <Box mb={12}>
            <Text fz={10} fw={700} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: 1 }}>
              Team
            </Text>
            <Group gap={8}>
              {stage.teamSlugs.map((slug, i) => (
                <Box
                  key={`${slug}-${i}`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#0e0c14",
                    border: "1px solid #232028",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image src={getPokemonImageURL(slug)} alt={slug} w={30} h={30} fit="contain" />
                </Box>
              ))}
            </Group>
          </Box>
        )}

        {available ? (
          <Button
            component={Link}
            to="/Forum/Main-Forum"
            variant="gradient"
            gradient={{ from: "grape", to: "cyan", deg: 90 }}
            radius="xl"
            rightSection={<IconArrowRight size={16} />}
          >
            Start this Challenge
          </Button>
        ) : cleared ? (
          <Button
            component={Link}
            to="/Forum/Main-Forum"
            variant="default"
            radius="xl"
            size="sm"
            rightSection={<IconExternalLink size={14} />}
          >
            View thread
          </Button>
        ) : null}
      </Card>
    </Group>
  );
}

function Timeline(props: { stages: Stage[] }) {
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
          <TimelineItem key={s.key} stage={s} />
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
    teamSlugs: [],
    state: isGymCleared(g) ? "cleared" : i === firstOpen ? "available" : "locked",
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
    teamSlugs: [],
    state: eliteState,
  });
  stages.push({
    key: "champion",
    order: gyms.length + 2,
    kind: "CHAMPION",
    title: region.eliteFour?.champion?.name || "Champion",
    desc: region.championPrize || "Beat the Champion to complete this region.",
    teamSlugs: [],
    state: championState,
  });

  return stages;
}

function buildTrialStages(trials: IslandTrial[], progress: ChallengeProgress): Stage[] {
  const sorted = [...trials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completed = new Set([...(progress.trialsCompleted ?? []), ...(progress.grandTrials ?? [])]);
  const firstOpen = sorted.findIndex((t) => !completed.has(t.id));

  return sorted.map((t, i) => {
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
      teamSlugs: t.totemPokemon ? [slugify(t.totemPokemon)] : [],
      state: completed.has(t.id) ? "cleared" : i === firstOpen ? "available" : "locked",
    };
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------------------------- Tabs ----------------------------------- */

function GymRunsTab(props: { regions: GymRegion[]; progress: ChallengeProgress }) {
  const { regions, progress } = props;
  const [regionId, setRegionId] = React.useState<string | null>(regions[0]?.id ?? null);

  React.useEffect(() => {
    if (regions.length && !regions.some((r) => r.id === regionId)) setRegionId(regions[0].id);
  }, [regions, regionId]);

  if (!regions.length) {
    return (
      <Text fz={13} c="dimmed" ta="center" py={30}>
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
        <Text fz={11} fw={700} c="dimmed" tt="uppercase" mr={4} style={{ letterSpacing: 1 }}>
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

      <Timeline stages={stages} />
    </Stack>
  );
}

function IslandTrialsTab(props: { trials: IslandTrial[]; progress: ChallengeProgress }) {
  const { trials, progress } = props;

  if (!trials.length) {
    return (
      <Text fz={13} c="dimmed" ta="center" py={30}>
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

      <Timeline stages={stages} />
    </Stack>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function Challenges() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [tab, setTab] = React.useState<"gyms" | "trials">("gyms");

  const regionsQuery = useQuery({ queryKey: ["gym-regions"], queryFn: getGymRegions });
  const trialsQuery = useQuery({ queryKey: ["island-trials"], queryFn: getIslandTrials });
  const progressQuery = useQuery({
    queryKey: ["challenge-progress", uid],
    queryFn: () => getChallengeProgress(uid as string),
    enabled: Boolean(uid),
  });

  const loading =
    regionsQuery.isPending || trialsQuery.isPending || (Boolean(uid) && progressQuery.isPending);
  const progress: ChallengeProgress = progressQuery.data ?? {};

  const TABS: { value: "gyms" | "trials"; label: string; icon: string }[] = [
    { value: "gyms", label: "Gym Leader Runs", icon: "⚔️" },
    { value: "trials", label: "Island Trials", icon: "🏝️" },
  ];

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Box
        mb={24}
        p={{ base: 20, sm: 28 }}
        style={{ background: `${HEADER_STRIPES}, ${HEADER_GRADIENT}`, borderRadius: 16 }}
      >
        <Title>Take on a Challenge!</Title>
        <Text fz={14} c="white" mt={8} mb={20} style={{ maxWidth: 680, opacity: 0.9 }}>
          {TAB_SUBTITLES[tab]}
        </Text>

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
                leftSection={<span style={{ fontSize: 15 }}>{t.icon}</span>}
                styles={active ? undefined : { root: { background: "rgba(0,0,0,0.25)", borderColor: "#4a4368", color: "#fff" } }}
              >
                {t.label}
              </Button>
            );
          })}
        </Group>
      </Box>

      {loading ? (
        <SectionLoader />
      ) : tab === "gyms" ? (
        <GymRunsTab regions={regionsQuery.data ?? []} progress={progress} />
      ) : (
        <IslandTrialsTab trials={trialsQuery.data ?? []} progress={progress} />
      )}
    </Container>
  );
}

/** Big page heading. */
function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text component="h1" fz={{ base: 28, sm: 34 }} fw={800} c="white" style={{ lineHeight: 1.1, margin: 0 }}>
      {children}
    </Text>
  );
}
