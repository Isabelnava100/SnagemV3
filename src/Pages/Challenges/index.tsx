import {
  Box,
  Button,
  Container,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowRight, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
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
 * page otherwise only reads. Each system draws a progress panel (hex badge
 * case / Z-crystals + final prize) and an ordered vertical stage path on a
 * rail; the next uncleared stop glows. Renders safely with no user, empty
 * content and no progress.
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

/* ------------------------------ Design tokens ------------------------------ */

const FONT_D = "var(--font-display, 'Quantico', sans-serif)";
const GRAD_ON = "linear-gradient(90deg, #7E2C75, #E54156)";
const GRAD_135 = "linear-gradient(135deg, #7E2C75, #E54156)";
const PROGRESS_GRAD = "linear-gradient(90deg, #912691, #14e0de)";

// Angled clip-paths from the mockup (bottom-right cut panels, chevron pills).
const HEX = "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";
const CLIP_PANEL_16 = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";
const CLIP_PANEL_14 = "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)";
const CLIP_CARD_12 = "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)";
const CLIP_PILL = "polygon(7px 0, 100% 0, calc(100% - 7px) 100%, 0 100%)";
const CLIP_CHIP = "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)";
const CLIP_CTA = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";
const CLIP_TOGGLE = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";
const CLIP_NUM = "polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)";
const CLIP_GLYPH = "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)";

const TAB_SUBTITLES: Record<string, string> = {
  gyms:
    "Follow the path from gym to gym, clear all 8 in order, then take on the Elite Four and Champion. Your next battle glows, tap it to begin.",
  trials:
    "Journey island to island: clear each trial, topple every Totem, then face the Kahunas in their Grand Trials. Your next stop glows, tap it to begin.",
};

// Standard Pokemon type colors, used for the type-colored stage chips.
const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#E0B000",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#8888A8", Fairy: "#EE99AC",
};
const typeColor = (t?: string) => (t && TYPE_COLORS[t]) || "#8a8399";

/** Kind chip accent per stage type (mockup palette). */
function tagColor(kind: StageKind): string {
  if (kind === "GRAND TRIAL") return "#FFD074";
  if (kind === "ELITE FOUR" || kind === "CHAMPION") return "#E54156";
  return "#c79bd6"; // GYM / TRIAL
}

/* ---------------------------------- Hero ----------------------------------- */

/** The striped-hero mode toggle: GYM LEADER RUNS vs ISLAND TRIALS. */
function HeroTabToggle(props: {
  tab: "gyms" | "trials";
  setTab: (v: "gyms" | "trials") => void;
}) {
  const items: { value: "gyms" | "trials"; label: string; icon: SnagIconName }[] = [
    { value: "gyms", label: "Gym Leader Runs", icon: "swords" },
    { value: "trials", label: "Island Trials", icon: "map" },
  ];
  return (
    <Group gap={0} wrap="wrap" role="tablist" aria-label="Choose a challenge type">
      {items.map((it, i) => {
        const active = props.tab === it.value;
        return (
          <UnstyledButton
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => props.setTab(it.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: FONT_D,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "11px 18px",
              marginLeft: i ? -2 : 0,
              border: "1px solid #3a3550",
              background: active ? GRAD_ON : "#1b1a1e",
              color: active ? "#fff" : "#b6b1bc",
              clipPath: CLIP_TOGGLE,
            }}
          >
            <SnagIcon
              name={it.icon}
              size={16}
              color={active ? "#fff" : "#b6b1bc"}
              cut={active ? "#7E2C75" : "#1b1a1e"}
            />
            {it.label}
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

/** Explains the admin-hosted flow: a 3-step numbered panel. */
function HowChallengesWork() {
  const steps = [
    { n: "1", text: "Start the challenge on your next glowing stage. That sends a request to the admins and directors." },
    { n: "2", text: "An admin accepts and creates your thread in the forums. They lead the thread and guide what happens next." },
    { n: "3", text: "Roleplay the battle in that thread. When it wraps up, a grader marks the stage cleared and your progress updates." },
  ];
  return (
    <Box
      mb={24}
      p={{ base: 20, sm: 28 }}
      style={{ background: "#141318", border: "1px solid #2a2637", clipPath: CLIP_PANEL_14 }}
    >
      <Title
        order={2}
        fz={13}
        fw={700}
        c="#c79bd6"
        tt="uppercase"
        mb={16}
        style={{ fontFamily: FONT_D, letterSpacing: "0.28em" }}
      >
        How challenges work
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={20}>
        {steps.map((s) => (
          <Group key={s.n} gap={12} align="flex-start" wrap="nowrap">
            <Box
              style={{
                flex: "none",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_D,
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                background: GRAD_135,
                clipPath: CLIP_NUM,
              }}
            >
              {s.n}
            </Box>
            <Text fz={13} c="#b6b1bc" style={{ lineHeight: 1.55 }}>
              {s.text}
            </Text>
          </Group>
        ))}
      </SimpleGrid>
      <Text fz={13} c="#6f6a78" mt={16}>
        The opposing team changes from person to person, so it stays hidden until your host reveals
        it in the thread.
      </Text>
    </Box>
  );
}

/* ------------------------------ Progress panel ----------------------------- */

/** One hex badge in the badge case / Z-crystal row. */
function Collectible(props: { glyph: SnagIconName; label: string; earned: boolean }) {
  return (
    <Stack gap={6} align="center" w={64} style={{ flexShrink: 0 }}>
      <Box
        style={{
          width: 46,
          height: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          clipPath: HEX,
          border: props.earned ? "2px solid #C9940F" : "2px dashed #3a3550",
          background: props.earned ? "linear-gradient(135deg, #3a2a10, #241f2e)" : "#141318",
        }}
      >
        {props.earned ? (
          <SnagIcon name={props.glyph} size={22} color="#FFD074" cut="#241f2e" />
        ) : (
          <Text fz={16} fw={700} c="#6f6a78" style={{ fontFamily: FONT_D }}>
            ?
          </Text>
        )}
      </Box>
      <Text fz={12} ta="center" lineClamp={1} c={props.earned ? "#FFD074" : "#6f6a78"}>
        {props.earned ? props.label : "locked"}
      </Text>
    </Stack>
  );
}

function ProgressPanel(props: {
  icon: SnagIconName;
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
    <Box
      mb={24}
      p={{ base: 20, sm: 28 }}
      style={{ background: "#141318", border: "1px solid #2a2637", clipPath: CLIP_PANEL_16 }}
    >
      <Group justify="space-between" wrap="wrap" gap={16} mb={16}>
        <Group gap={16} wrap="nowrap" style={{ minWidth: 0 }}>
          <Box
            style={{
              flex: "none",
              width: 48,
              height: 48,
              background: "#3a1d63",
              border: "1px solid #3a3550",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              clipPath: CLIP_GLYPH,
            }}
          >
            <SnagIcon name={props.icon} size={24} color="#fff" cut="#3a1d63" />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text
              fz={12}
              fw={700}
              c="#c79bd6"
              tt="uppercase"
              style={{ fontFamily: FONT_D, letterSpacing: "0.24em" }}
            >
              {props.eyebrow}
            </Text>
            <Text
              fz={{ base: 22, sm: 26 }}
              fw={700}
              c="white"
              lineClamp={1}
              style={{ fontFamily: FONT_D, letterSpacing: "0.02em" }}
            >
              {props.title}
            </Text>
          </Box>
        </Group>
        <Box style={{ textAlign: "right" }}>
          <Text
            fz={12}
            fw={700}
            c="#6f6a78"
            tt="uppercase"
            style={{ fontFamily: FONT_D, letterSpacing: "0.24em" }}
          >
            Progress
          </Text>
          <Text fz={24} fw={700} c="white" style={{ fontFamily: FONT_D }}>
            {props.cleared}{" "}
            <Text span fz={14} c="#6f6a78">
              / {props.total} cleared
            </Text>
          </Text>
        </Box>
      </Group>

      <Box style={{ height: 8, background: "#232028", clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}>
        <Box style={{ height: "100%", width: `${pct}%`, background: PROGRESS_GRAD }} />
      </Box>

      <Flex mt={18} gap={24} direction={{ base: "column", sm: "row" }} align="flex-start">
        <Box style={{ flex: "1 1 0%", minWidth: 0, width: "100%" }}>
          <Text
            fz={12}
            fw={700}
            c="#6f6a78"
            tt="uppercase"
            mb={12}
            style={{ fontFamily: FONT_D, letterSpacing: "0.24em" }}
          >
            {props.collectibleLabel}
          </Text>
          <Group gap={12} style={{ rowGap: 14 }}>
            {props.collectibles}
          </Group>
        </Box>
        <Box
          p={18}
          style={{
            flex: "1 1 0%",
            minWidth: 0,
            width: "100%",
            maxWidth: 400,
            background: "#241f2e",
            border: "1px solid #C9940F",
            clipPath: CLIP_CARD_12,
          }}
        >
          <Text
            fz={13}
            fw={700}
            c="#FFD074"
            tt="uppercase"
            mb={8}
            style={{ fontFamily: FONT_D, letterSpacing: "0.22em" }}
          >
            {"★"} Final Prize
          </Text>
          <Text fz={14} c="#b6b1bc" style={{ lineHeight: 1.6 }}>
            {props.finalPrize}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}

/* -------------------------------- Stage path ------------------------------- */

interface StageRequestProps {
  /** The member's request for this stage, when one exists. */
  request?: ChallengeRequest;
  onRequest: (stage: Stage) => void;
  requesting: boolean;
  signedIn: boolean;
}

function StageRow(props: { stage: Stage } & StageRequestProps) {
  const { stage, request, onRequest, requesting, signedIn } = props;
  const cleared = stage.state === "cleared";
  const available = stage.state === "available";
  const locked = stage.state === "locked";
  const tc = typeColor(stage.type);
  const inProgress =
    available && (request?.status === "requested" || request?.status === "accepted");

  const nodeMark = cleared ? "✓" : String(stage.order);
  const nodeColor = cleared ? "#12B7B6" : available ? "#FFD074" : "#6f6a78";
  const nodeBorder = cleared ? "#1f6f7a" : available ? "#C9940F" : "#3a3550";
  const nodeBg = available ? "#241f2e" : "#141318";
  const railColor = cleared ? "#1f6f7a" : "#232028";
  const cardBg = available ? "#1c1526" : "#141318";
  const cardBorder = available ? "#7E2C75" : cleared ? "#1f6f7a" : "#232028";

  const statusText = cleared
    ? "✓ Cleared"
    : available
      ? inProgress
        ? "▶ In progress"
        : "▶ Your next battle"
      : "Locked";
  const statusColor = cleared ? "#12B7B6" : available ? "#c79bd6" : "#6f6a78";
  const chipColor = cleared || available ? tc : "#6f6a78";

  return (
    <Flex gap={14} align="stretch">
      {/* Node + rail */}
      <Box style={{ flex: "none", width: 56, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box
          style={{
            flex: "none",
            width: 52,
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${nodeBorder}`,
            background: nodeBg,
            clipPath: HEX,
          }}
        >
          <Text fz={16} fw={700} c={nodeColor} style={{ fontFamily: FONT_D }}>
            {nodeMark}
          </Text>
        </Box>
        {available && (
          <Box
            mt={4}
            style={{
              padding: "3px 10px",
              background: "linear-gradient(90deg, #FFD074, #C9940F)",
              clipPath: "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)",
            }}
          >
            <Text fz={10} fw={700} c="#1A1B1E" tt="uppercase" style={{ fontFamily: FONT_D, letterSpacing: "0.14em" }}>
              Here
            </Text>
          </Box>
        )}
        <Box style={{ flex: 1, width: 2, background: railColor, marginTop: 6, minHeight: 14 }} />
      </Box>

      {/* Stage card */}
      <Box
        mb={14}
        p={{ base: 16, sm: 22 }}
        style={{
          flex: "1 1 0%",
          minWidth: 0,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          opacity: locked ? 0.6 : 1,
          clipPath: CLIP_CARD_12,
        }}
      >
        <Group gap={12} mb={8} wrap="wrap">
          <Text
            fz={11}
            fw={700}
            tt="uppercase"
            px={12}
            py={4}
            style={{
              fontFamily: FONT_D,
              letterSpacing: "0.18em",
              color: tagColor(stage.kind),
              border: `1px solid ${tagColor(stage.kind)}`,
              clipPath: CLIP_CHIP,
            }}
          >
            {stage.kind}
          </Text>
          <Text fz={12} fw={700} c={statusColor} tt="uppercase" style={{ fontFamily: FONT_D, letterSpacing: "0.18em" }}>
            {statusText}
          </Text>
        </Group>

        <Group gap={12} mb={6} wrap="wrap" align="center">
          <Text fz={22} fw={700} c={cleared || available ? "#fff" : "#6f6a78"} style={{ fontFamily: FONT_D, letterSpacing: "0.02em" }}>
            {stage.title}
          </Text>
          {stage.type && (
            <Text
              fz={11}
              fw={700}
              tt="uppercase"
              px={12}
              py={4}
              style={{
                fontFamily: FONT_D,
                letterSpacing: "0.12em",
                color: chipColor,
                border: `1px solid ${chipColor}`,
                clipPath: CLIP_CHIP,
              }}
            >
              {stage.type}
            </Text>
          )}
        </Group>

        <Text fz={14} c="#b6b1bc" style={{ lineHeight: 1.55 }}>
          {stage.desc}
        </Text>

        {available &&
          (request?.status === "requested" ? (
            <Text
              mt={12}
              fz={12}
              fw={700}
              c="#12B7B6"
              tt="uppercase"
              role="status"
              aria-live="polite"
              style={{ fontFamily: FONT_D, letterSpacing: "0.12em" }}
            >
              Request sent {"·"} an admin will open your thread
            </Text>
          ) : request?.status === "accepted" ? (
            request.threadLink ? (
              <Button
                component={Link}
                to={request.threadLink}
                mt={12}
                radius={0}
                rightSection={<IconExternalLink size={14} />}
                styles={{
                  root: {
                    background: "linear-gradient(90deg, #12B7B6, #4dabf7)",
                    border: 0,
                    clipPath: CLIP_CTA,
                    fontFamily: FONT_D,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    height: 44,
                    color: "#fff",
                  },
                }}
              >
                Go to your challenge thread
              </Button>
            ) : (
              <Text mt={12} fz={13} c="#12B7B6" role="status" aria-live="polite">
                Accepted! An admin is setting up your thread; watch your notifications.
              </Text>
            )
          ) : (
            <Stack gap={6} mt={12} align="flex-start">
              <Button
                radius={0}
                rightSection={<IconArrowRight size={16} />}
                loading={requesting}
                disabled={!signedIn}
                onClick={() => onRequest(stage)}
                styles={{
                  root: {
                    background: GRAD_ON,
                    border: 0,
                    clipPath: CLIP_CTA,
                    fontFamily: FONT_D,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    height: 46,
                    paddingLeft: 26,
                    paddingRight: 26,
                  },
                }}
              >
                Start this challenge
              </Button>
              {!signedIn && (
                <Text fz={13} c="#6f6a78">
                  Sign in to request this challenge.
                </Text>
              )}
            </Stack>
          ))}
      </Box>
    </Flex>
  );
}

function StagePath(props: {
  stages: Stage[];
  requestsByStage: Map<string, ChallengeRequest>;
  onRequest: (stage: Stage) => void;
  requestingStageId: string | null;
  signedIn: boolean;
}) {
  return (
    <Box>
      {props.stages.map((s) => (
        <StageRow
          key={s.key}
          stage={s}
          request={props.requestsByStage.get(s.requestStageId)}
          onRequest={props.onRequest}
          requesting={props.requestingStageId === s.requestStageId}
          signedIn={props.signedIn}
        />
      ))}
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

/** Request plumbing shared by both tabs (owned by the page component). */
interface TabRequestProps {
  requestsByStage: Map<string, ChallengeRequest>;
  onRequest: (stage: Stage) => void;
  requestingStageId: string | null;
  signedIn: boolean;
}

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
    <Box>
      <Group gap={8} wrap="wrap" mb={20} role="tablist" aria-label="Select a region">
        <Text fz={12} fw={700} c="#6f6a78" tt="uppercase" style={{ fontFamily: FONT_D, letterSpacing: "0.28em" }}>
          Region
        </Text>
        {regions.map((r) => {
          const active = r.id === region.id;
          return (
            <UnstyledButton
              key={r.id}
              role="tab"
              aria-selected={active}
              onClick={() => setRegionId(r.id)}
              style={{
                fontFamily: FONT_D,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "9px 20px",
                border: `1px solid ${active ? "#7E2C75" : "#3a3550"}`,
                background: active ? GRAD_ON : "#1b1a1e",
                color: active ? "#fff" : "#b6b1bc",
                clipPath: CLIP_PILL,
              }}
            >
              {r.name}
            </UnstyledButton>
          );
        })}
      </Group>

      <ProgressPanel
        icon="swords"
        eyebrow="Gym Champion Run"
        title={`${region.name} League`}
        cleared={cleared}
        total={stages.length}
        collectibleLabel="Badge Case"
        finalPrize={region.championPrize || "Beat the Champion to claim this region's prize."}
        collectibles={gyms.map((g) => (
          <Collectible
            key={g.leaderName}
            glyph="medal"
            label={g.leaderName}
            earned={earned.includes(g.leaderName)}
          />
        ))}
      />

      <StagePath
        stages={stages}
        requestsByStage={props.requestsByStage}
        onRequest={props.onRequest}
        requestingStageId={props.requestingStageId}
        signedIn={props.signedIn}
      />

      <RematchLadder region={region} progress={progress} signedIn={props.signedIn} />
    </Box>
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
    <Box
      mt={32}
      p={{ base: 20, sm: 24 }}
      className="dc-card"
      style={{ clipPath: CLIP_PANEL_14 }}
    >
      <Text fz={13} fw={700} c="#c79bd6" tt="uppercase" style={{ fontFamily: FONT_D, letterSpacing: "0.24em" }}>
        Rematch Ladder
      </Text>
      <Text fz={22} fw={700} c="white" mb={4} style={{ fontFamily: FONT_D }}>
        Beaten leaders want revenge
      </Text>
      <Text fz={14} c="#b6b1bc" mb={14}>
        Challenge any leader you hold a badge from to a rematch. Every tier is a tougher fight with a
        stronger roster; your host sets the exact team.
      </Text>
      <Stack gap={10}>
        {beatenGyms.map((g) => {
          const wins = Number(tiers[g.leaderName]) || 0;
          const nextTier = wins + 1;
          const suggestedStar = Math.min(7, 3 + nextTier);
          return (
            <Group key={g.leaderName} justify="space-between" wrap="wrap" gap={8}>
              <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  style={{
                    flex: "none",
                    width: 38,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    clipPath: HEX,
                    background: "linear-gradient(135deg, #3a2a10, #241f2e)",
                    border: "2px solid #C9940F",
                  }}
                >
                  <SnagIcon name="medal" size={18} color="#FFD074" cut="#241f2e" />
                </Box>
                <Box style={{ minWidth: 0 }}>
                  <Text fz={15} fw={700} c="white">
                    {g.leaderName}
                  </Text>
                  <Text fz={13} c="dimmed">
                    {wins ? `${wins} rematch win${wins === 1 ? "" : "s"}` : "No rematches yet"} {"·"}{" "}
                    next: Tier {nextTier} (about {suggestedStar}
                    {"★"} opposition)
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
        <Text fz={14} mt="sm" c="#c79bd6" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Box>
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
  // A crystal is earned by clearing its trial OR by an explicit grader grant
  // (grantChallengeStep writes progress.zCrystals); honor both sources.
  const grantedCrystals = new Set((progress.zCrystals ?? []).map((z) => z.toLowerCase()));
  const crystalEarned = (t: (typeof sorted)[number], crystal: string) =>
    completed.has(t.id) ||
    grantedCrystals.has(crystal.toLowerCase()) ||
    grantedCrystals.has(`${crystal.toLowerCase()} z`);

  return (
    <Box>
      <ProgressPanel
        icon="map"
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
              glyph="zcrystal"
              label={crystal}
              earned={crystalEarned(t, crystal)}
            />
          );
        })}
      />

      <StagePath
        stages={stages}
        requestsByStage={props.requestsByStage}
        onRequest={props.onRequest}
        requestingStageId={props.requestingStageId}
        signedIn={props.signedIn}
      />
    </Box>
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

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo page="/Challenges" />
      <PageHero
        eyebrow="Gyms and Island Trials"
        title="Take on a Challenge!"
        subtitle={TAB_SUBTITLES[tab]}
      >
        <HeroTabToggle tab={tab} setTab={setTab} />
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
