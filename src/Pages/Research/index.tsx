import {
  Box,
  Button,
  Container,
  Flex,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBone,
  IconDiamond,
  IconExternalLink,
  IconFlask,
  IconLock,
  IconSparkles,
  IconStar,
  IconTargetArrow,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { Character } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import useMediaQuery from "../../hooks/useMediaQuery";
import { isAdmin } from "../../lib/permissions";
import { getCharacters, getItems } from "../../queries/dashboard";
import {
  ResearchProgress,
  getMyClearanceRequests,
  getResearchConfig,
  getResearchProgress,
  requestMasterClearance,
  requestMasterMission,
  reviveFossil,
} from "../../queries/research";

/**
 * Become a Master (Snagem Research Facility). Two faces of one page: a recruit
 * GUIDE for characters who have not entered a Division, and the Master CONSOLE
 * for characters who have. Which one shows is decided per character (a member
 * can have both a plain trainer and a Hybrid). The console's actions stay locked
 * behind Master clearance; a character without clearance sees a locked console.
 *
 * Redesigned July 2026 to the cinematic game-site language: angular clip-path
 * cards, Quantico display type, gradient pills and CTAs. Behaviour is unchanged;
 * only the visuals were rebuilt from the hi-fi mockup.
 */

const MISSIONS_PER_TYPE = 10;

const displayFont = "var(--font-display, 'Quantico', sans-serif)";

const CARD = "#141318";
const CARD_BORDER = "#2a2637";
const IDLE_BG = "#17151c";
const DIM = "#b6b1bc";
const FAINT = "#6f6a78";

const ACTIVE_GRAD = "linear-gradient(90deg, #7E2C75, #E54156)";
const ACTIVE_GRAD_135 = "linear-gradient(135deg, #7E2C75, #E54156)";
const GOLD_GRAD = "linear-gradient(90deg, #FFD074, #C9940F)";
const ASCEND_GRAD = "linear-gradient(90deg, #912691, #474d9b, #14e0de)";
const BAR_GRAD = "linear-gradient(90deg, #912691, #14e0de)";

const CLIP_PILL = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";
const CLIP_CTA = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";
const CLIP_TAG = "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)";
const CLIP_BR14 = "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)";
const CLIP_BR16 = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";
const CLIP_BR22 = "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)";
const CLIP_BL22 = "polygon(0 0, 100% 0, 100% 100%, 22px 100%, 0 calc(100% - 22px))";
const CLIP_NUM5 = "polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)";
const CLIP_NUM6 = "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)";
const CLIP_NUM8 = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";

/* -------------------------------- Shared bits ------------------------------ */

/** Angled gradient call-to-action (gold fills carry dark text per design rules). */
function GradButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  gradient?: string;
  loading?: boolean;
  disabled?: boolean;
  rightSection?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const bg = props.disabled ? "#2a2637" : props.gradient ?? ACTIVE_GRAD;
  return (
    <Button
      onClick={props.onClick}
      loading={props.loading}
      disabled={props.disabled}
      radius={0}
      rightSection={props.rightSection}
      styles={{
        root: {
          background: bg,
          color: "#fff",
          border: "none",
          height: 50,
          paddingLeft: 28,
          paddingRight: 28,
          clipPath: CLIP_CTA,
          fontFamily: displayFont,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        },
      }}
      style={props.style}
    >
      {props.children}
    </Button>
  );
}

/** Angled toggle / tab pill. */
function AngledPill(props: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  fz?: number;
  px?: number;
  py?: number;
  style?: React.CSSProperties;
}) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: displayFont,
        fontSize: props.fz ?? 13,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: `${props.py ?? 10}px ${props.px ?? 22}px`,
        border: `1px solid ${props.active ? "#7E2C75" : CARD_BORDER}`,
        background: props.active ? ACTIVE_GRAD : IDLE_BG,
        color: props.active ? "#fff" : DIM,
        clipPath: CLIP_PILL,
        cursor: "pointer",
        whiteSpace: "nowrap",
        ...props.style,
      }}
    >
      {props.icon}
      {props.label}
      {props.locked && <IconLock size={12} />}
    </UnstyledButton>
  );
}

function Eyebrow({ color }: { color: string }) {
  return (
    <Group gap={12} align="center" wrap="nowrap">
      <Box style={{ width: 28, height: 3, background: "#E54156", flexShrink: 0 }} aria-hidden />
      <Text fz={{ base: 11, sm: 13 }} fw={700} c={color} style={{ letterSpacing: "0.3em", fontFamily: displayFont }}>
        SNAGEM RESEARCH FACILITY &nbsp;&middot;&nbsp; CLEARANCE &#937;
      </Text>
    </Group>
  );
}

function FacilityIcon({ granted }: { granted: boolean }) {
  return (
    <Box
      style={{
        width: 76,
        height: 76,
        borderRadius: 18,
        flexShrink: 0,
        background: "#181425",
        border: `1px solid ${granted ? "#7c5cff" : CARD_BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: granted ? "0 0 30px rgba(124,92,255,0.4)" : "none",
      }}
    >
      <IconStar size={30} color={granted ? "#c4b5fd" : "#8a83a0"} fill={granted ? "#c4b5fd" : "none"} />
      {!granted && (
        <Box
          style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#0b0a10",
            border: `1px solid ${CARD_BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconLock size={13} color="#8a83a0" />
        </Box>
      )}
    </Box>
  );
}

/** Angular ACCESS GRANTED / PENDING badge that sits beside the hero title. */
function AccessBadge({ granted }: { granted: boolean }) {
  const accent = granted ? "#12B7B6" : "#FFD074";
  return (
    <Text
      component="span"
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        fontFamily: displayFont,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "8px 18px",
        color: accent,
        border: `1px solid ${accent}`,
        background: granted ? "rgba(18,183,182,.12)" : "rgba(255,208,116,.08)",
        clipPath: CLIP_PILL,
      }}
    >
      {granted ? "Access Granted" : "Access Pending"}
    </Text>
  );
}

/** Section kicker: a Quantico label (h2) followed by a hairline rule. */
function SectionLabel({ children, color = "#FFD074" }: { children: React.ReactNode; color?: string }) {
  return (
    <Group gap={14} align="center" wrap="nowrap">
      <Title
        order={2}
        fz={14}
        fw={700}
        c={color}
        tt="uppercase"
        style={{ letterSpacing: "0.28em", fontFamily: displayFont, margin: 0, whiteSpace: "nowrap" }}
      >
        {children}
      </Title>
      <Box style={{ flex: 1, height: 1, background: CARD_BORDER }} />
    </Group>
  );
}

/** Centered lock / classified screen used by the console and Chambers. */
function LockScreen(props: {
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Box
      p={{ base: 28, sm: 48 }}
      style={{
        background: CARD,
        border: `1px solid ${CARD_BORDER}`,
        clipPath: CLIP_BR22,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        textAlign: "center",
      }}
    >
      {props.icon ?? <IconLock size={40} color="#8a83a0" style={{ opacity: 0.7 }} />}
      <Text fz={{ base: 22, sm: 26 }} fw={700} c="white" style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
        {props.title}
      </Text>
      <Text fz={15} c={DIM} maw={460} lh={1.6}>
        {props.body}
      </Text>
      {props.action}
    </Box>
  );
}

/* ---------------------------------- Guide ---------------------------------- */

const BENEFITS = [
  {
    icon: <IconSparkles size={22} color="#c4b5fd" />,
    title: "Signature Abilities",
    body: "Ten bespoke, type-themed powers, one unlocked per Master Mission. Nobody else on the site has your exact kit.",
  },
  {
    icon: <IconDiamond size={22} color="#5eead4" />,
    title: "Mega Evolution & Z-Moves",
    body: "End-game transformations only finished Masters can research: Key Stones, Sparkling Stones and the summit of power.",
  },
  {
    icon: <IconAlertTriangle size={22} color="#ff8787" />,
    title: "Legendary Access",
    body: "The Restricted Library is the only path to capturing Legendaries, and to Legendary hybrids. Story-driven, by request.",
  },
  {
    icon: <IconStar size={22} color="#FFD074" />,
    title: "Grand Master Prestige",
    body: "A title, a badge, and standing few ever reach. The end-game credential of the whole community.",
  },
];

const STEPS = [
  {
    title: "Shape your concept",
    body: "Own the species you want to fuse with (Hybrid), or define a focal artifact and a same-type bonded team (Channeler).",
  },
  {
    title: "Choose a Division",
    body: "Hybrid Research or Channeler Research. Both reach mastery the same way, but the choice is permanent.",
  },
  {
    title: "Pass admin review",
    body: "Document it all on your profile. An admin reviews your character and grants Facility clearance.",
  },
  {
    title: "Begin the Ascension",
    body: "Clear ten Master Missions to earn ten abilities, then face the Grand Master trial for your type.",
  },
];

const CHECKLIST = [
  { ok: true, title: "Own the species first", body: "You must already own the Pokemon you intend to fuse or bond with." },
  { ok: true, title: "Choose a Division", body: "Hybrid or Channeler, the only doors in. This choice is irreversible." },
  { ok: true, title: "Document your character", body: "Concept, artifact and bonded Pokemon on your profile, ready for review." },
  { ok: false, title: "Patience", body: "Ten missions per type. Most trainers spend months reaching the Grand Master." },
];

/** Clearance-request state passed down from the page for the selected character. */
interface ClearanceProps {
  characterSelected: boolean;
  alreadyCleared: boolean;
  requestPending: boolean;
  requesting: boolean;
  requestStatus: string;
  track: "Hybrid" | "Channeler";
  onTrackChange: (track: "Hybrid" | "Channeler") => void;
  onRequest: () => void;
}

function GuideView(props: { onPreview: () => void } & ClearanceProps) {
  return (
    <Stack gap={30}>
      {/* Ascending benefits */}
      <Stack gap={20}>
        <SectionLabel>ASCENDING BENEFITS</SectionLabel>
        <Text fz={15} c={DIM} lh={1.6}>
          Mastery isn't just a badge, it's a whole tier of the game that stays sealed until you earn it. This is what
          waits inside.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
          {BENEFITS.map((b) => (
            <Box
              key={b.title}
              className="dc-card-tile"
              style={{ padding: "22px 24px", clipPath: CLIP_BR14, display: "flex", gap: 18, alignItems: "flex-start" }}
            >
              <Box
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  background: "#3a1d63",
                  border: "1px solid #3a3550",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  clipPath: CLIP_NUM6,
                }}
              >
                {b.icon}
              </Box>
              <Box style={{ minWidth: 0 }}>
                <Text fz={19} fw={700} c="white" mb={6} style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
                  {b.title}
                </Text>
                <Text fz={14} c={DIM} lh={1.6}>
                  {b.body}
                </Text>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Stack>

      {/* How to earn access */}
      <Stack gap={20}>
        <SectionLabel color="#c79bd6">HOW TO EARN ACCESS</SectionLabel>
        <Text fz={15} c={DIM} lh={1.6}>
          Four steps stand between you and the Ascension Track. None can be skipped, that's the point.
        </Text>
        <Stack gap={12}>
          {STEPS.map((s, i) => (
            <Flex key={s.title} gap={16} align="stretch">
              <Box
                style={{
                  flexShrink: 0,
                  width: 52,
                  background: ACTIVE_GRAD_135,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  clipPath: CLIP_PILL,
                }}
              >
                <Text fz={22} fw={700} c="white" style={{ fontFamily: displayFont }}>
                  {i + 1}
                </Text>
              </Box>
              <Box className="dc-card-tile" style={{ flex: 1, minWidth: 0, padding: "18px 24px" }}>
                <Text fz={18} fw={700} c="white" mb={4} style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
                  {s.title}
                </Text>
                <Text fz={14} c={DIM} lh={1.6}>
                  {s.body}
                </Text>
              </Box>
            </Flex>
          ))}
        </Stack>
      </Stack>

      {/* Are you ready + request clearance */}
      <Box
        p={{ base: 22, sm: 36 }}
        style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, clipPath: CLIP_BL22 }}
      >
        <Flex gap={40} wrap="wrap">
          <Box style={{ flex: "1 1 320px", minWidth: 0 }}>
            <Text fz={{ base: 26, sm: 30 }} fw={700} c="white" mb={12} style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
              Are you ready?
            </Text>
            <Text fz={15} c={DIM} mb={18} lh={1.6}>
              Check yourself against the entry requirements, then request a clearance review.
            </Text>
            <Stack gap={16}>
              {CHECKLIST.map((c) => {
                const color = c.ok ? "#12B7B6" : "#FFD074";
                return (
                  <Group key={c.title} gap={14} wrap="nowrap" align="flex-start">
                    <Box
                      style={{
                        flexShrink: 0,
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        color,
                        border: `1px solid ${color}`,
                        clipPath: CLIP_NUM5,
                      }}
                      aria-hidden
                    >
                      {c.ok ? "✓" : "!"}
                    </Box>
                    <Box>
                      <Text fz={15} fw={700} c="white">
                        {c.title}
                      </Text>
                      <Text fz={14} c={DIM} lh={1.5}>
                        {c.body}
                      </Text>
                    </Box>
                  </Group>
                );
              })}
            </Stack>
          </Box>

          <Stack gap={16} align="flex-end" justify="center" style={{ flex: "1 1 280px", minWidth: 0, textAlign: "right" }}>
            {props.alreadyCleared ? (
              <Text
                fz={16}
                fw={700}
                c="#12B7B6"
                ta="right"
                role="status"
                aria-live="polite"
                style={{ fontFamily: displayFont, letterSpacing: "0.04em" }}
              >
                This character already holds Master clearance.
              </Text>
            ) : props.requestPending ? (
              <Text fz={15} fw={700} c="#FFD074" ta="right" role="status" aria-live="polite" maw={320}>
                Clearance review requested. An admin will review your character and open the console once approved.
              </Text>
            ) : (
              <>
                <Select
                  label="Which track are you aiming for?"
                  data={["Hybrid", "Channeler"]}
                  value={props.track}
                  onChange={(v) => props.onTrackChange(v === "Channeler" ? "Channeler" : "Hybrid")}
                  w={220}
                  maw="100%"
                  styles={{ input: { background: IDLE_BG, borderColor: "#3a3550" } }}
                />
                <GradButton
                  onClick={props.onRequest}
                  loading={props.requesting}
                  disabled={!props.characterSelected}
                  rightSection={<IconArrowRight size={18} />}
                >
                  Request a Clearance Review
                </GradButton>
                {!props.characterSelected && (
                  <Text fz={14} c="dimmed" ta="right">
                    Pick a character above to request a review.
                  </Text>
                )}
              </>
            )}
            {props.requestStatus && (
              <Text fz={14} c="#c79bd6" ta="right" role="status" aria-live="polite">
                {props.requestStatus}
              </Text>
            )}
            <Text fz={13} c={FAINT} ta="right" lh={1.5}>
              An admin gets notified the moment you ask. Progress is earned, never bought.
            </Text>
            <UnstyledButton
              onClick={props.onPreview}
              style={{ fontSize: 15, fontWeight: 700, color: "#c79bd6" }}
            >
              Preview the Facility console &rarr;
            </UnstyledButton>
          </Stack>
        </Flex>
      </Box>
    </Stack>
  );
}

/* --------------------------------- Console --------------------------------- */

type ConsoleTab = "overview" | "divisions" | "chambers" | "ascension";

/** One dossier stat tile. */
function DossierStat(props: { label: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <Box
      style={{
        background: CARD,
        border: `1px solid ${props.highlight ? "#1f6f7a" : CARD_BORDER}`,
        padding: "20px 22px",
      }}
    >
      <Text fz={12} fw={700} c={FAINT} tt="uppercase" mb={6} style={{ letterSpacing: "0.24em", fontFamily: displayFont }}>
        {props.label}
      </Text>
      <Text
        fz={26}
        fw={700}
        c={props.highlight ? "#12B7B6" : "white"}
        lh={1.1}
        style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}
      >
        {props.value}
      </Text>
      {props.sub && (
        <Text fz={13} c={DIM} mt={6}>
          {props.sub}
        </Text>
      )}
    </Box>
  );
}

const PHASES = [
  { n: 1, title: "Transform", body: "Enter a Division, become a Hybrid or Channeler of your chosen type." },
  { n: 2, title: "10 Master Missions", body: "Clear ten missions of your type. Each unlocks one ability." },
  { n: 3, title: "Grand Master", body: "With all ten abilities, face the Grand Master trial." },
  { n: 4, title: "Mega & Z Access", body: "Finishing Hybrids unlock Mega Evolution and Z-Move research." },
];

type PhaseState = "done" | "current" | "sealed";

function PhaseCard(props: { n: number; title: string; body: string; state: PhaseState }) {
  const styles = {
    done: { bg: CARD, border: CARD_BORDER, numBg: "#7E2C75", title: "#fff", status: "✓ Done", statusColor: "#12B7B6" },
    current: {
      bg: "#1c1526",
      border: "#7E2C75",
      numBg: ACTIVE_GRAD_135,
      title: "#fff",
      status: "▶ In progress",
      statusColor: "#c79bd6",
    },
    sealed: { bg: CARD, border: "#232028", numBg: "#3C3A3C", title: FAINT, status: "Sealed", statusColor: FAINT },
  }[props.state];

  return (
    <Box
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
      }}
    >
      <Group gap={10} wrap="nowrap" align="center">
        <Box
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: displayFont,
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            background: styles.numBg,
            clipPath: CLIP_NUM5,
          }}
        >
          {props.n}
        </Box>
        <Text fz={17} fw={700} c={styles.title} style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
          {props.title}
        </Text>
      </Group>
      <Text fz={13} c={DIM} lh={1.55} style={{ flex: 1 }}>
        {props.body}
      </Text>
      <Text fz={12} fw={700} c={styles.statusColor} tt="uppercase" style={{ letterSpacing: "0.14em", fontFamily: displayFont }}>
        {styles.status}
      </Text>
    </Box>
  );
}

function OverviewTab(props: { character?: Character; progress?: ResearchProgress; onEnter: () => void }) {
  const { character, progress } = props;
  const active = progress?.types?.[0];
  const division = character?.type && character.type !== "None" ? character.type : "Pending";
  const trackType = active?.type ?? "Unassigned";
  const abilities = active?.missionsCompleted ?? 0;
  const allCleared = (progress?.types ?? []).some((t) => t.missionsCompleted >= MISSIONS_PER_TYPE);

  const phaseState = (n: number): PhaseState => {
    if (n === 1) return division !== "Pending" ? "done" : "current";
    if (n === 2) return allCleared ? "done" : division !== "Pending" ? "current" : "sealed";
    if (n === 3) return progress?.grandMasterComplete ? "done" : allCleared ? "current" : "sealed";
    return progress?.megaUnlocked || progress?.zmoveUnlocked ? "done" : "sealed";
  };

  return (
    <Stack gap={22}>
      <Box
        p={{ base: 22, sm: 28 }}
        style={{ background: "#14252a", border: "1px solid #1f6f7a", clipPath: CLIP_BR16 }}
      >
        <Text fz={13} fw={700} c="#12B7B6" tt="uppercase" mb={10} style={{ letterSpacing: "0.28em", fontFamily: displayFont }}>
          Welcome, Operative
        </Text>
        <Text fz={{ base: 26, sm: 30 }} fw={700} c="white" mb={10} style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
          Your dossier is active.
        </Text>
        <Text fz={15} c={DIM} maw={720} lh={1.65}>
          The path to mastery is three phases: transform, master ten abilities, then face the Grand Master. Track your
          ascension below; explore the Divisions and classified Chambers when you're ready.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={14}>
        <DossierStat label="Division" value={division} sub={`Research · Div. ${division === "Channeler" ? "II" : "I"}`} />
        <DossierStat
          label="Tracking Type"
          value={trackType}
          sub={character ? `${character.species || "?"} · ${character.name}` : undefined}
        />
        <DossierStat label="Abilities" value={`${abilities} / ${MISSIONS_PER_TYPE}`} sub="earned so far" />
        <DossierStat label="Clearance" value="Ω GRANTED" sub="facility access" highlight />
      </SimpleGrid>

      <SectionLabel color="#c79bd6">THE PATH &middot; 3 PHASES</SectionLabel>
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing={14}>
        {PHASES.map((p) => (
          <PhaseCard key={p.n} n={p.n} title={p.title} body={p.body} state={phaseState(p.n)} />
        ))}
      </SimpleGrid>

      <GradButton gradient={ASCEND_GRAD} onClick={props.onEnter} rightSection={<IconArrowRight size={18} />} style={{ alignSelf: "flex-start" }}>
        Enter the Ascension Track
      </GradButton>
    </Stack>
  );
}

/** One Division card; the member's own division wears a gold "Your Division" tag. */
function DivisionCard(props: { icon: React.ReactNode; title: string; body: string; note: string; current: boolean }) {
  return (
    <Box
      style={{
        background: CARD,
        border: `1px solid ${props.current ? "#7E2C75" : CARD_BORDER}`,
        padding: "26px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        clipPath: CLIP_BR16,
      }}
    >
      <Group gap={12} wrap="nowrap" align="center">
        <Box style={{ flexShrink: 0 }}>{props.icon}</Box>
        <Text fz={22} fw={700} c="white" style={{ fontFamily: displayFont, letterSpacing: "0.02em", flex: 1, minWidth: 0 }}>
          {props.title}
        </Text>
        {props.current && (
          <Text
            component="span"
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              fontFamily: displayFont,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#1A1B1E",
              background: GOLD_GRAD,
              padding: "4px 12px",
              clipPath: CLIP_TAG,
            }}
          >
            Your Division
          </Text>
        )}
      </Group>
      <Text fz={14} c={DIM} lh={1.65}>
        {props.body}
      </Text>
      <Text fz={13} c={FAINT}>
        {props.note}
      </Text>
    </Box>
  );
}

function DivisionsTab(props: { character?: Character }) {
  const division = props.character?.type && props.character.type !== "None" ? props.character.type : "None";
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
      <DivisionCard
        icon={<IconFlask size={26} color="#c4b5fd" />}
        title="Hybrid Research"
        body="Fuse with a species you own and become something new. Your body, moveset and story transform with each Master Mission."
        note="Div. I · permanent choice"
        current={division === "Hybrid"}
      />
      <DivisionCard
        icon={<IconSparkles size={26} color="#5eead4" />}
        title="Channeler Research"
        body="Bond a same-type team through a focal artifact and channel their power without transforming. Same ten-mission path, different door."
        note="Div. II · permanent choice"
        current={division === "Channeler"}
      />
    </SimpleGrid>
  );
}

/** Chambers: fossil revive (functional) + gated end-game rooms, classified skin. */
function ChambersTab(props: { canAct: boolean; fossilItems: Array<{ id: string; name: string }> }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const onRevive = async () => {
    if (!selected) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await reviveFossil(selected);
      setStatus(`Success: your ${res.pokemon.name} has been revived and added to your box.`);
    } catch {
      setStatus("Revival failed. Check your fossils, coins, and an empty Poke Ball, then try again.");
    } finally {
      setBusy(false);
    }
  };

  const Room = (p: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    badge: string;
    badgeColor: string;
    borderColor: string;
    children: React.ReactNode;
  }) => (
    <Box
      style={{
        background: CARD,
        border: `1px solid ${p.borderColor}`,
        padding: "24px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        clipPath: CLIP_BR16,
      }}
    >
      <Group gap={12} wrap="nowrap" align="center">
        <Box
          style={{
            flexShrink: 0,
            width: 46,
            height: 46,
            background: p.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            clipPath: CLIP_NUM6,
          }}
        >
          {p.icon}
        </Box>
        <Text fz={21} fw={700} c="white" style={{ fontFamily: displayFont, letterSpacing: "0.02em" }}>
          {p.title}
        </Text>
      </Group>
      {p.children}
      <Text
        component="span"
        style={{
          alignSelf: "flex-start",
          fontFamily: displayFont,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: p.badgeColor,
          border: `1px solid ${p.badgeColor}`,
          padding: "5px 14px",
          clipPath: CLIP_PILL,
        }}
      >
        {p.badge}
      </Text>
    </Box>
  );

  return (
    <Stack gap={20}>
      <LockScreen
        title="Chambers · Classified"
        body="Sealed rooms deeper in the Facility unseal as your ascension advances. Some open with a fee, some only after the Grand Master, and one is classified, entered in-character, by request only."
      />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={16}>
        <Room
          icon={<IconBone size={22} color="#e9ecef" />}
          iconBg="#1c1a26"
          title="Fossil Revitalization"
          badge="Open · small fee"
          badgeColor="#63e6be"
          borderColor="#2f4a3a"
        >
          <Text fz={14} c={DIM} lh={1.6}>
            Bring an Old Amber, Helix, Sail, Skull or Root Fossil and an empty Poke Ball. Pay the fee; walk out with a
            revived Pokemon.
          </Text>
          {!props.canAct ? (
            <Text fz={14} c="dimmed">
              Master clearance required to operate this chamber.
            </Text>
          ) : props.fossilItems.length ? (
            <Stack gap={10}>
              <Select
                placeholder="Pick a fossil"
                data={props.fossilItems.map((f) => ({ value: f.id, label: f.name }))}
                value={selected}
                onChange={setSelected}
                aria-label="Choose a fossil to revive"
                styles={{ input: { background: "#0e0c14", borderColor: "#3a3550" } }}
              />
              <GradButton onClick={onRevive} loading={busy} disabled={!selected} rightSection={<IconFlask size={16} />}>
                Revive
              </GradButton>
              {status && (
                <Text fz={14} c="gray.3" role="status" aria-live="polite">
                  {status}
                </Text>
              )}
            </Stack>
          ) : (
            <Text fz={14} c="dimmed">
              You have no revivable fossils in your bag yet.
            </Text>
          )}
        </Room>

        <Room
          icon={<IconDiamond size={22} color="#c4b5fd" />}
          iconBg="#1a1530"
          title="Mega & Z-Move Research"
          badge="Gated · Grand Master first"
          badgeColor="#b197fc"
          borderColor="#3a2f55"
        >
          <Text fz={14} c={DIM} lh={1.6}>
            Earn a Key Stone at the Tower of Mastery and a Sparkling Stone from the Tapu trials. One or the other per
            mission, never both.
          </Text>
        </Room>

        <Room
          icon={<IconX size={22} color="#ff8787" />}
          iconBg="#241618"
          title="Restricted Library"
          badge="Classified · by request"
          badgeColor="#ff8787"
          borderColor="#4a2a2e"
        >
          <Text fz={14} c={DIM} lh={1.6}>
            The only path to Legendary capture and Legendary hybrids. No costs, no tiers, a bespoke, story-driven
            mission authored by an admin. Enter in-character.
          </Text>
        </Room>
      </SimpleGrid>
    </Stack>
  );
}

/** Ascension: the per-character Master Mission tracker (requestMasterMission). */
function AscensionTab(props: {
  characterId: string;
  progress?: ResearchProgress;
  fallbackType: string;
  canAct: boolean;
}) {
  const typeEntries = props.progress?.types ?? [];
  const typeOptions = typeEntries.length ? typeEntries.map((t) => t.type) : [props.fallbackType];
  const [type, setType] = React.useState<string>(typeOptions[0]);
  const [status, setStatus] = React.useState("");
  const [busy, setBusy] = React.useState<number | null>(null);

  React.useEffect(() => {
    setType(typeOptions[0]);
    setStatus("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.characterId]);

  const activeEntry = typeEntries.find((t) => t.type === type);
  const completed = activeEntry?.missionsCompleted ?? 0;
  const abilities = activeEntry?.abilities ?? [];

  const onRequest = async (index: number) => {
    setBusy(index);
    setStatus("");
    try {
      await requestMasterMission(props.characterId, type, index + 1);
      setStatus(`Mission ${index + 1} requested for ${type}. An admin will follow up.`);
    } catch {
      setStatus("Could not submit that request. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const pct = Math.round((completed / MISSIONS_PER_TYPE) * 100);

  return (
    <Stack gap={20}>
      <Flex justify="space-between" align="center" gap={20} wrap="wrap">
        <Group gap={12} align="center" wrap="wrap">
          <Text fz={13} fw={700} c={FAINT} tt="uppercase" style={{ letterSpacing: "0.28em", fontFamily: displayFont }}>
            Tracking Type
          </Text>
          <Group gap={6}>
            {typeOptions.map((t) => {
              const on = t === type;
              const clickable = typeOptions.length > 1;
              return (
                <UnstyledButton
                  key={t}
                  onClick={clickable ? () => setType(t) : undefined}
                  aria-pressed={on}
                  style={{
                    fontFamily: displayFont,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "6px 16px",
                    clipPath: CLIP_TAG,
                    cursor: clickable ? "pointer" : "default",
                    color: on ? "#1A1B1E" : DIM,
                    background: on ? GOLD_GRAD : "#232028",
                  }}
                >
                  {t}
                </UnstyledButton>
              );
            })}
          </Group>
        </Group>
        <Group gap={14} align="center" style={{ flex: "1 1 260px", minWidth: 200, justifyContent: "flex-end" }}>
          <Text fz={20} fw={700} c="white" style={{ fontFamily: displayFont, whiteSpace: "nowrap" }}>
            {completed}{" "}
            <Text span fz={14} fw={400} c={DIM}>
              / {MISSIONS_PER_TYPE} abilities
            </Text>
          </Text>
          <Box style={{ flex: 1, maxWidth: 480, height: 8, background: "#232028", clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}>
            <Box style={{ height: "100%", width: `${pct}%`, background: BAR_GRAD }} />
          </Box>
        </Group>
      </Flex>

      <Text fz={15} c={DIM} maw={760} lh={1.6}>
        Ten missions, ten abilities, each one{" "}
        <Text span c="#c79bd6" fw={700}>
          encrypted
        </Text>{" "}
        until the mission before it is cleared. Request the next from the board; an admin authors your bespoke RP thread.
      </Text>

      <Stack gap={12}>
        {Array.from({ length: MISSIONS_PER_TYPE }).map((_, i) => {
          const cleared = i < completed;
          const available = i === completed;
          const num = String(i + 1).padStart(2, "0");
          const abilityName = abilities[i] || (available ? "Next ability" : "");

          const state = cleared
            ? { bg: CARD, border: CARD_BORDER, opacity: 1, numBg: "#12B7B6", tag: "Cleared", tagColor: "#12B7B6", titleColor: "#fff" }
            : available
              ? { bg: "#1c1526", border: "#7E2C75", opacity: 1, numBg: ACTIVE_GRAD_135, tag: "Available", tagColor: "#c79bd6", titleColor: "#fff" }
              : { bg: CARD, border: "#232028", opacity: 0.65, numBg: "#3C3A3C", tag: "Encrypted", tagColor: FAINT, titleColor: FAINT };

          const title = cleared ? abilityName || "Ability unlocked" : available ? abilityName : "▪▪▪▪▪▪▪▪▪▪";
          const sub = cleared
            ? "Ability unlocked."
            : available
              ? "Ready to request from the board."
              : "DECRYPTING... clear the prior mission to unlock.";

          return (
            <Flex
              key={i}
              align="center"
              gap={20}
              wrap="wrap"
              style={{ background: state.bg, border: `1px solid ${state.border}`, padding: "18px 24px", opacity: state.opacity }}
            >
              <Box
                style={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: displayFont,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#fff",
                  background: state.numBg,
                  clipPath: CLIP_NUM8,
                }}
              >
                {num}
              </Box>
              <Box style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <Text fz={12} fw={700} c={state.tagColor} tt="uppercase" style={{ letterSpacing: "0.22em", fontFamily: displayFont }}>
                  Mission {num} &middot; {state.tag}
                </Text>
                <Text fz={17} fw={700} c={state.titleColor} lineClamp={1}>
                  {title}
                </Text>
                <Text fz={13} c={FAINT} lineClamp={1}>
                  {sub}
                </Text>
              </Box>

              {cleared ? (
                <Text
                  component={Link}
                  to="/Forum/Master-Mission"
                  fz={15}
                  fw={700}
                  c="#c79bd6"
                  style={{ whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0 }}
                >
                  View thread <IconExternalLink size={13} style={{ verticalAlign: "middle" }} />
                </Text>
              ) : available && props.canAct ? (
                <GradButton onClick={() => onRequest(i)} loading={busy === i} rightSection={<IconArrowRight size={16} />} style={{ flexShrink: 0 }}>
                  Request Mission
                </GradButton>
              ) : null}
            </Flex>
          );
        })}
      </Stack>

      {status && (
        <Text fz={14} c="gray.3" role="status" aria-live="polite">
          {status}
        </Text>
      )}
    </Stack>
  );
}

function ConsoleView(props: {
  character?: Character;
  progress?: ResearchProgress;
  fallbackType: string;
  canAct: boolean;
  fossilItems: Array<{ id: string; name: string }>;
  onBackToGuide: () => void;
}) {
  const [tab, setTab] = React.useState<ConsoleTab>("overview");
  const locked = !props.canAct;

  return (
    <Stack gap={22}>
      <Group gap={10} wrap="wrap">
        <AngledPill label="Overview" icon={<IconTargetArrow size={15} />} active={tab === "overview"} onClick={() => setTab("overview")} />
        <AngledPill label="Divisions" icon={<IconDiamond size={14} />} active={tab === "divisions"} onClick={() => setTab("divisions")} />
        <AngledPill label="Chambers" icon={<IconFlask size={14} />} active={tab === "chambers"} locked onClick={() => setTab("chambers")} />
        <AngledPill label="Ascension" icon={<IconStar size={14} />} active={tab === "ascension"} onClick={() => setTab("ascension")} />
      </Group>

      {locked ? (
        <LockScreen
          title="No Facility Clearance"
          body="This character hasn't earned clearance yet. Read the guide and request a review when the requirements are met."
          action={
            <GradButton onClick={props.onBackToGuide} style={{ marginTop: 4 }}>
              Back to the Guide
            </GradButton>
          }
        />
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab character={props.character} progress={props.progress} onEnter={() => setTab("ascension")} />
          )}
          {tab === "divisions" && <DivisionsTab character={props.character} />}
          {tab === "chambers" && <ChambersTab canAct={props.canAct} fossilItems={props.fossilItems} />}
          {tab === "ascension" && props.character && (
            <AscensionTab
              characterId={props.character.id}
              progress={props.progress}
              fallbackType={props.fallbackType}
              canAct={props.canAct}
            />
          )}
        </>
      )}
    </Stack>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function Research() {
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const uid = user?.uid;
  const queryClient = useQueryClient();

  const configQuery = useQuery({ queryKey: ["research-config"], queryFn: getResearchConfig });
  const charactersQuery = useQuery({
    queryKey: ["characters", uid],
    queryFn: () => getCharacters(uid as string),
    enabled: !!uid,
  });
  const progressQuery = useQuery({
    queryKey: ["research-progress", uid],
    queryFn: () => getResearchProgress(uid as string),
    enabled: !!uid,
  });
  const itemsQuery = useQuery({
    queryKey: ["items", uid],
    queryFn: () => getItems(uid as string),
    enabled: !!uid,
  });

  const characters = React.useMemo(() => charactersQuery.data?.sortedData ?? [], [charactersQuery.data]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Default to the first Master-track character; fall back to the first of any.
  React.useEffect(() => {
    if (selectedId || !characters.length) return;
    const master = characters.find((c) => c.type !== "None");
    setSelectedId((master ?? characters[0]).id);
  }, [characters, selectedId]);

  const config = configQuery.data ?? {};
  const fossilMap = config.fossilMap ?? {};
  const channelerTypes = config.channelerTypes ?? [];
  const progressMap = progressQuery.data ?? {};
  const fallbackType = channelerTypes[0] ?? "Dark";

  const fossilItems = React.useMemo(
    () =>
      (itemsQuery.data ?? [])
        .filter((item) => Object.prototype.hasOwnProperty.call(fossilMap, item.id))
        .map((item) => ({ id: item.id, name: item.name })),
    [itemsQuery.data, fossilMap]
  );

  const selected = characters.find((c) => c.id === selectedId);
  const selectedProgress = selectedId ? progressMap[selectedId] : undefined;
  // A character has console clearance once it has entered a Division. Admins can
  // always operate for support. Actions stay gated by this flag.
  const canAct = (!!selected && selected.type !== "None") || isAdmin(user);

  const [view, setView] = React.useState<"guide" | "console">("guide");
  // Once we know the selected character, land masters on the console. Picking
  // a character without clearance always sends them back to the guide.
  const [viewInit, setViewInit] = React.useState(false);
  React.useEffect(() => {
    if (viewInit || !selected) return;
    setView(canAct ? "console" : "guide");
    setViewInit(true);
  }, [selected, canAct, viewInit]);

  // Clearance review flow: the guide's request button files a request that
  // notifies the graders; approval flips the character's type server-side.
  const [track, setTrack] = React.useState<"Hybrid" | "Channeler">("Hybrid");
  const [requestStatus, setRequestStatus] = React.useState("");
  const myClearanceQuery = useQuery({
    queryKey: ["my-clearance-requests", uid],
    queryFn: () => getMyClearanceRequests(uid as string),
    enabled: !!uid,
  });
  const clearancePending = (myClearanceQuery.data ?? []).some(
    (r) => r.characterId === selectedId && r.status === "requested"
  );
  const clearanceMutation = useMutation({
    mutationFn: () => requestMasterClearance(selectedId as string, track),
    onSuccess: () => {
      setRequestStatus("");
      queryClient.invalidateQueries({ queryKey: ["my-clearance-requests", uid] });
    },
    onError: (e) => setRequestStatus((e as Error).message || "Could not send the request. Try again."),
  });

  const loading = configQuery.isPending || (!!uid && (charactersQuery.isPending || progressQuery.isPending));
  const granted = view === "console" && canAct;
  const accentColor = granted ? "#c79bd6" : "#FFD074";

  const toggleFz = isOverSm ? 13 : 11;
  const togglePx = isOverSm ? 20 : 12;

  return (
    <Box style={{ background: "#0b0a10", minHeight: "100%" }}>
      <Seo page="/Research" />
      <Container size="lg" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        {/* VIEW AS toggle + character picker */}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap={14} mb="xl">
          <Group gap={12} align="center" wrap="wrap">
            <Text fz={12} fw={700} c={FAINT} tt="uppercase" style={{ letterSpacing: "0.28em", fontFamily: displayFont }}>
              View as
            </Text>
            <Flex>
              <AngledPill
                label="Not a Master · Guide"
                active={view === "guide"}
                onClick={() => setView("guide")}
                fz={toggleFz}
                px={togglePx}
                style={{ border: "1px solid #3a3550" }}
              />
              <AngledPill
                label="Master · Console"
                active={view === "console"}
                onClick={() => setView("console")}
                fz={toggleFz}
                px={togglePx}
                style={{ border: "1px solid #3a3550", marginLeft: -2 }}
              />
            </Flex>
          </Group>

          {characters.length > 0 && (
            <Select
              data={characters.map((c) => ({ value: c.id, label: `${c.name} (${c.type})` }))}
              value={selectedId}
              onChange={(v) => {
                setSelectedId(v);
                setViewInit(false);
              }}
              maw={260}
              w="100%"
              aria-label="Choose which character to view"
              styles={{ input: { background: IDLE_BG, borderColor: "#3a3550", fontWeight: 700 } }}
            />
          )}
        </Group>

        {/* Hero */}
        <PageHero
          eyebrow={<Eyebrow color={accentColor} />}
          title="Become a Master"
          titleSuffix={<AccessBadge granted={granted} />}
          subtitle={
            granted
              ? "You made it past the missions and the forums. This is the late game. Few reach the Facility, fewer finish. Everything here is earned, one encrypted door at a time."
              : "You're not a Master yet. Behind this door is the end-game: powers, transformations and stories most trainers never touch. Here's why it's worth it, and exactly how to earn your way in."
          }
          aside={<FacilityIcon granted={granted} />}
        />

        {loading ? (
          <SectionLoader />
        ) : view === "console" ? (
          <ConsoleView
            character={selected}
            progress={selectedProgress}
            fallbackType={fallbackType}
            canAct={canAct}
            fossilItems={fossilItems}
            onBackToGuide={() => setView("guide")}
          />
        ) : (
          <GuideView
            onPreview={() => setView("console")}
            characterSelected={!!selectedId}
            alreadyCleared={!!selected && selected.type !== "None"}
            requestPending={clearancePending}
            requesting={clearanceMutation.isPending}
            requestStatus={requestStatus}
            track={track}
            onTrackChange={setTrack}
            onRequest={() => clearanceMutation.mutate()}
          />
        )}
      </Container>
    </Box>
  );
}
