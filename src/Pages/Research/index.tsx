import { Box, Button, Container, Flex, Group, Progress, Select, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBone,
  IconCheck,
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
import { SectionLoader } from "../../components/navigation/loading";
import { Character } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
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
 * behind Master clearance; anyone may preview it read-only.
 */

const MISSIONS_PER_TYPE = 10;

const PANEL = "#141019";
const PANEL_BORDER = "#232028";
const GRAD = "linear-gradient(135deg, #a855f7, #6d28d9)";
const BAR_GRADIENT = "linear-gradient(90deg, #c026d3, #6366f1, #22d3ee)";

const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Electric: "#E0B000",
  Grass: "#78C850", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0",
  Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820",
  Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848",
  Steel: "#8888A8", Fairy: "#EE99AC",
};
const typeColor = (t?: string) => (t && TYPE_COLORS[t]) || "#7048e8";

/* -------------------------------- Shared bits ------------------------------ */

function Eyebrow({ color }: { color: string }) {
  return (
    <Group gap={8} mb={10}>
      <IconDiamond size={12} color={color} fill={color} />
      <Text fz={12} fw={700} c={color} style={{ letterSpacing: 3 }}>
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
        border: `1px solid ${granted ? "#7c5cff" : "#2a2637"}`,
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
            border: "1px solid #2a2637",
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

function AccessBadge({ granted }: { granted: boolean }) {
  return (
    <Text
      display="inline-block"
      fz={13}
      fw={800}
      tt="uppercase"
      px={14}
      py={6}
      style={{
        letterSpacing: 1,
        borderRadius: 999,
        color: granted ? "#0b0a10" : "#F5C842",
        background: granted ? "#69db7c" : "transparent",
        border: granted ? "none" : "1px solid #b89b2e",
        boxShadow: granted ? "0 0 20px rgba(105,219,124,0.5)" : "none",
      }}
    >
      {granted ? "Access Granted" : "Access Pending"}
    </Text>
  );
}

function SectionLabel({ children, color = "#F5C842" }: { children: React.ReactNode; color?: string }) {
  return (
    <Group gap={12} align="center" mb="md">
      <Text fz={13} fw={700} c={color} style={{ letterSpacing: 3 }}>
        {children}
      </Text>
      <Box style={{ flex: 1, height: 1, background: "#232028" }} />
    </Group>
  );
}

/* ---------------------------------- Guide ---------------------------------- */

const BENEFITS = [
  {
    icon: <IconSparkles size={22} color="#c4b5fd" />,
    bg: "#1a1530",
    title: "Signature Abilities",
    body: "Ten bespoke, type-themed powers, one unlocked per Master Mission. Nobody else on the site has your exact kit.",
  },
  {
    icon: <IconDiamond size={22} color="#5eead4" />,
    bg: "#12211f",
    title: "Mega Evolution & Z-Moves",
    body: "End-game transformations only finished Masters can research: Key Stones, Sparkling Stones and the summit of power.",
  },
  {
    icon: <IconAlertTriangle size={22} color="#ff8787" />,
    bg: "#241618",
    title: "Legendary Access",
    body: "The Restricted Library is the only path to capturing Legendaries, and to Legendary hybrids. Story-driven, by request.",
  },
  {
    icon: <IconStar size={22} color="#F5C842" />,
    bg: "#231d10",
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
    <Stack gap={44}>
      <Box>
        <SectionLabel>ASCENDING BENEFITS</SectionLabel>
        <Text fz={15} c="gray.4" mb="lg">
          Mastery isn't just a badge, it's a whole tier of the game that stays sealed until you earn
          it. This is what waits inside.
        </Text>
        <Flex gap="md" wrap="wrap">
          {BENEFITS.map((b) => (
            <Box
              key={b.title}
              p="lg"
              style={{
                flex: "1 1 380px",
                minWidth: 0,
                borderRadius: 16,
                background: PANEL,
                border: `1px solid ${PANEL_BORDER}`,
              }}
            >
              <Group gap="md" wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: b.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </Box>
                <Box style={{ minWidth: 0 }}>
                  <Text fz={19} fw={800} c="white" mb={6}>
                    {b.title}
                  </Text>
                  <Text fz={14} c="gray.5">
                    {b.body}
                  </Text>
                </Box>
              </Group>
            </Box>
          ))}
        </Flex>
      </Box>

      <Box>
        <SectionLabel color="#b197fc">HOW TO EARN ACCESS</SectionLabel>
        <Text fz={15} c="gray.4" mb="lg">
          Four steps stand between you and the Ascension Track. None can be skipped, that's the point.
        </Text>
        <Box style={{ position: "relative" }}>
          <Stack gap="md">
            {STEPS.map((s, i) => (
              <Group key={s.title} gap="lg" wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: GRAD,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Text fz={22} fw={800} c="white">
                    {i + 1}
                  </Text>
                </Box>
                <Box
                  p="md"
                  style={{ flex: 1, borderRadius: 14, background: PANEL, border: `1px solid ${PANEL_BORDER}` }}
                >
                  <Text fz={18} fw={800} c="white" mb={4}>
                    {s.title}
                  </Text>
                  <Text fz={14} c="gray.5">
                    {s.body}
                  </Text>
                </Box>
              </Group>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box p="lg" style={{ borderRadius: 18, background: "#120f1c", border: "1px solid #2a2440" }}>
        <Flex gap="xl" direction={{ base: "column", md: "row" }} justify="space-between">
          <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
            <Text fz={26} fw={800} c="white" mb={4}>
              Are you ready?
            </Text>
            <Text fz={14} c="gray.5" mb="lg">
              Check yourself against the entry requirements, then request a clearance review.
            </Text>
            <Stack gap="md">
              {CHECKLIST.map((c) => (
                <Group key={c.title} gap={12} wrap="nowrap" align="flex-start">
                  <Box
                    style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                      background: c.ok ? "rgba(105,219,124,0.15)" : "rgba(245,197,24,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {c.ok ? (
                      <IconCheck size={14} color="#69db7c" />
                    ) : (
                      <IconAlertTriangle size={13} color="#F5C842" />
                    )}
                  </Box>
                  <Box>
                    <Text fz={15} fw={700} c="white">
                      {c.title}
                    </Text>
                    <Text fz={13} c="gray.5">
                      {c.body}
                    </Text>
                  </Box>
                </Group>
              ))}
            </Stack>
          </Box>

          <Stack gap={12} align="flex-end" justify="flex-start" style={{ flexShrink: 0 }}>
            {props.alreadyCleared ? (
              <Text fz={14} c="teal.3" ta="right" role="status" aria-live="polite">
                This character already holds master clearance.
              </Text>
            ) : props.requestPending ? (
              <Text fz={14} c="gold.1" ta="right" role="status" aria-live="polite" maw={320}>
                Clearance review requested. An admin will review your character and open the
                console once approved.
              </Text>
            ) : (
              <>
                <Select
                  label="Which track are you aiming for?"
                  data={["Hybrid", "Channeler"]}
                  value={props.track}
                  onChange={(v) => props.onTrackChange(v === "Channeler" ? "Channeler" : "Hybrid")}
                  w={220}
                  styles={{ input: { background: "#141019" } }}
                />
                <Button
                  variant="gradient"
                  gradient={{ from: "grape", to: "cyan", deg: 90 }}
                  radius="xl"
                  size="lg"
                  rightSection={<IconArrowRight size={18} />}
                  loading={props.requesting}
                  disabled={!props.characterSelected}
                  onClick={props.onRequest}
                >
                  Request Clearance Review
                </Button>
                {!props.characterSelected && (
                  <Text fz={12} c="dimmed" ta="right">
                    Pick a character above to request a review.
                  </Text>
                )}
              </>
            )}
            {props.requestStatus && (
              <Text fz={13} c="grape.3" ta="right" role="status" aria-live="polite">
                {props.requestStatus}
              </Text>
            )}
            <Text fz={13} c="dimmed" ta="right">
              An admin gets notified the moment you ask. Progress is earned.
            </Text>
            <Button variant="subtle" color="grape" size="sm" onClick={props.onPreview}>
              Preview the Facility console
            </Button>
          </Stack>
        </Flex>
      </Box>
    </Stack>
  );
}

/* --------------------------------- Console --------------------------------- */

type ConsoleTab = "overview" | "divisions" | "chambers" | "ascension";

function TabPill(props: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={props.onClick}
      radius="xl"
      variant={props.active ? "gradient" : "default"}
      gradient={{ from: "grape", to: "violet", deg: 90 }}
      leftSection={props.icon}
      rightSection={props.locked ? <IconLock size={13} /> : undefined}
      styles={props.active ? undefined : { root: { background: "transparent", borderColor: "#2a2637", color: "#c9c4d6" } }}
    >
      {props.label}
    </Button>
  );
}

function DossierStat(props: { label: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <Box
      p="md"
      style={{
        flex: "1 1 200px",
        minWidth: 0,
        borderRadius: 12,
        background: PANEL,
        border: `1px solid ${props.highlight ? "#2f7d4f" : PANEL_BORDER}`,
      }}
    >
      <Text fz={11} fw={700} c="dimmed" tt="uppercase" mb={8} style={{ letterSpacing: 1.5 }}>
        {props.label}
      </Text>
      <Text fz={22} fw={800} c={props.highlight ? "#69db7c" : "white"} lh={1.1}>
        {props.value}
      </Text>
      {props.sub && (
        <Text fz={12} c="dimmed" mt={4}>
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
  const done = props.state === "done";
  const current = props.state === "current";
  return (
    <Box
      p="md"
      style={{
        flex: "1 1 220px",
        minWidth: 0,
        borderRadius: 14,
        background: current ? "#1a1636" : PANEL,
        border: `1px solid ${current ? "#5a3fb0" : PANEL_BORDER}`,
        opacity: props.state === "sealed" ? 0.6 : 1,
      }}
    >
      <Group gap={10} mb={10} wrap="nowrap">
        <Box
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: props.state === "sealed" ? "#2a2637" : GRAD,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Text fz={14} fw={800} c={props.state === "sealed" ? "#6a6580" : "white"}>
            {props.n}
          </Text>
        </Box>
        <Text fz={16} fw={800} c="white">
          {props.title}
        </Text>
      </Group>
      <Text fz={13} c="gray.5" mb={10}>
        {props.body}
      </Text>
      {done ? (
        <Text fz={11} fw={800} c="#69db7c" tt="uppercase">
          &#10003; Done
        </Text>
      ) : current ? (
        <Text fz={11} fw={800} c="grape.3" tt="uppercase">
          &#9654; In progress
        </Text>
      ) : (
        <Text fz={11} fw={700} c="dimmed" tt="uppercase">
          Sealed
        </Text>
      )}
    </Box>
  );
}

function OverviewTab(props: {
  character?: Character;
  progress?: ResearchProgress;
  onEnter: () => void;
}) {
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
    <Stack gap="xl">
      <Box p="lg" style={{ borderRadius: 16, background: "#101820", border: "1px solid #1c2a2a" }}>
        <Text fz={12} fw={700} c="teal.3" tt="uppercase" mb={8} style={{ letterSpacing: 2 }}>
          Welcome, Operative
        </Text>
        <Text fz={26} fw={800} c="white" mb={8}>
          Your dossier is active.
        </Text>
        <Text fz={14} c="gray.4" maw={720}>
          The path to mastery is three phases: transform, master ten abilities, then face the Grand
          Master. Track your ascension below; explore the Divisions and classified Chambers when
          you're ready.
        </Text>
      </Box>

      <Flex gap="md" wrap="wrap">
        <DossierStat label="Division" value={division} sub={`Research · Div. ${division === "Channeler" ? "II" : "I"}`} />
        <DossierStat
          label="Tracking Type"
          value={trackType}
          sub={character ? `${character.species || "?"} · ${character.name}` : undefined}
        />
        <DossierStat label="Abilities" value={`${abilities} / ${MISSIONS_PER_TYPE}`} sub="earned so far" />
        <DossierStat label="Clearance" value="Ω GRANTED" sub="facility access" highlight />
      </Flex>

      <Box>
        <SectionLabel color="#b197fc">THE PATH &middot; 3 PHASES</SectionLabel>
        <Flex gap="md" wrap="wrap" align="stretch">
          {PHASES.map((p) => (
            <PhaseCard key={p.n} n={p.n} title={p.title} body={p.body} state={phaseState(p.n)} />
          ))}
        </Flex>
        <Button
          mt="lg"
          onClick={props.onEnter}
          variant="gradient"
          gradient={{ from: "grape", to: "cyan", deg: 90 }}
          radius="xl"
          size="lg"
          rightSection={<IconArrowRight size={18} />}
        >
          Enter the Ascension Track
        </Button>
      </Box>
    </Stack>
  );
}

function DivisionPanel(props: {
  numeral: string;
  title: string;
  accent: string;
  intro: string;
  rows: Array<{ tag: string; text: string }>;
}) {
  return (
    <Box
      style={{ flex: "1 1 440px", minWidth: 0, borderRadius: 16, overflow: "hidden", border: `1px solid ${props.accent}55` }}
    >
      <Box px="lg" py="md" style={{ background: `linear-gradient(135deg, ${props.accent}44, ${props.accent}11)` }}>
        <Text fz={11} fw={700} c="rgba(255,255,255,0.7)" tt="uppercase" style={{ letterSpacing: 2 }}>
          Division {props.numeral}
        </Text>
        <Text fz={24} fw={800} c="white">
          {props.title}
        </Text>
      </Box>
      <Box p="lg" style={{ background: PANEL }}>
        <Text fz={15} c="gray.3" mb="md">
          {props.intro}
        </Text>
        <Stack gap="md">
          {props.rows.map((r) => (
            <Group key={r.tag} gap={12} wrap="nowrap" align="flex-start">
              <Text
                fz={11}
                fw={700}
                tt="uppercase"
                px={8}
                py={2}
                style={{ borderRadius: 6, background: `${props.accent}22`, color: props.accent, flexShrink: 0, letterSpacing: 0.5 }}
              >
                {r.tag}
              </Text>
              <Text fz={14} c="gray.4">
                {r.text}
              </Text>
            </Group>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

function DivisionsTab() {
  return (
    <Stack gap="lg">
      <Text fz={15} c="gray.4">
        To enter the Facility you must first become something more. Two doors, one choice, and it
        cannot be undone. Both progress the same way: ten Master Missions, ten abilities, one Grand
        Master trial.
      </Text>
      <Flex gap="lg" wrap="wrap" align="stretch">
        <DivisionPanel
          numeral="I"
          title="Hybrid Research"
          accent="#9775fa"
          intro="Fuse your body with a Pokemon's essence. Hybrids are born from other hybrids, or made by accident and unusual phenomena, never casually."
          rows={[
            { tag: "Prereq", text: "You must already own the species you fuse with." },
            { tag: "Warning", text: "Irreversible. There is no undoing what the Division makes of you." },
            { tag: "Restricted", text: "Ditto, Smeargle, and all Legendary/Mythical/Ultra Beasts route through the Restricted Library." },
            { tag: "Capstone", text: "Grand Master unlocks Mega Evolution and/or Z-Move access, if the species supports it." },
          ]}
        />
        <DivisionPanel
          numeral="II"
          title="Channeler Research"
          accent="#3bc9db"
          intro="Channel power through bonded Pokemon rather than becoming one. It begins with a concept discussed with an admin and documented on your profile."
          rows={[
            { tag: "Requires", text: "A focal-point artifact, a primary bonded Pokemon, and same-type secondaries." },
            { tag: "Rule", text: "All bonded Pokemon must share ONE type, that is the type you progress." },
            { tag: "Abilities", text: "Ten skill tiers. Primary gates tiers 1, 5, 10 and the ultimate; secondaries cap at 2." },
            { tag: "Innate", text: 'Each type grants a passive from the start, e.g. Fairy\'s "Moon\'s Blessing".' },
          ]}
        />
      </Flex>
    </Stack>
  );
}

/** Chambers: fossil revive (functional) + gated end-game rooms. */
function ChambersTab(props: {
  canAct: boolean;
  fossilItems: Array<{ id: string; name: string }>;
}) {
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
      p="lg"
      style={{ flex: "1 1 300px", minWidth: 0, borderRadius: 16, background: PANEL, border: `1px solid ${p.borderColor}` }}
    >
      <Group gap={12} wrap="nowrap" mb={12} align="center">
        <Box
          style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: p.iconBg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {p.icon}
        </Box>
        <Text fz={18} fw={800} c="white">
          {p.title}
        </Text>
      </Group>
      {p.children}
      <Text
        fz={11}
        fw={800}
        tt="uppercase"
        mt={14}
        display="inline-block"
        px={10}
        py={4}
        style={{ borderRadius: 999, background: `${p.badgeColor}22`, color: p.badgeColor, letterSpacing: 0.5 }}
      >
        {p.badge}
      </Text>
    </Box>
  );

  return (
    <Stack gap="lg">
      <Text fz={15} c="gray.4" maw={820}>
        Sealed rooms deeper in the Facility. Some open with a fee, some only after the Grand Master,
        and one is <Text span c="#ff8787">classified</Text>, entered in-character, by request only.
      </Text>
      <Flex gap="lg" wrap="wrap" align="stretch">
        <Room
          icon={<IconBone size={22} color="#e9ecef" />}
          iconBg="#1c1a26"
          title="Fossil Revitalization"
          badge="Open · small fee"
          badgeColor="#63e6be"
          borderColor="#2f4a3a"
        >
          <Text fz={14} c="gray.5">
            Bring an Old Amber, Helix, Sail, Skull or Root Fossil and an empty Poke Ball. Pay the fee;
            walk out with a revived Pokemon.
          </Text>
          {!props.canAct ? (
            <Text fz={13} c="dimmed" mt={12}>
              Master clearance required to operate this chamber.
            </Text>
          ) : props.fossilItems.length ? (
            <Stack gap={10} mt={12}>
              <Select
                placeholder="Pick a fossil"
                data={props.fossilItems.map((f) => ({ value: f.id, label: f.name }))}
                value={selected}
                onChange={setSelected}
                aria-label="Choose a fossil to revive"
                styles={{ input: { background: "#0e0c14" } }}
              />
              <Button color="grape" onClick={onRevive} loading={busy} disabled={!selected} leftSection={<IconFlask size={16} />}>
                Revive
              </Button>
              {status && (
                <Text fz={13} c="gray.3" role="status" aria-live="polite">
                  {status}
                </Text>
              )}
            </Stack>
          ) : (
            <Text fz={13} c="dimmed" mt={12}>
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
          <Text fz={14} c="gray.5">
            Earn a Key Stone at the Tower of Mastery and a Sparkling Stone from the Tapu trials. One or
            the other per mission, never both.
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
          <Text fz={14} c="gray.5">
            The only path to Legendary capture and Legendary hybrids. No costs, no tiers, a bespoke,
            story-driven mission authored by an admin. Enter in-character.
          </Text>
        </Room>
      </Flex>
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

  const tColor = typeColor(type);
  const pct = Math.round((completed / MISSIONS_PER_TYPE) * 100);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap={12} align="center" wrap="wrap">
          <Text fz={12} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 2 }}>
            Tracking Type
          </Text>
          <Group gap={6}>
            {typeOptions.map((t) => {
              const active = t === type;
              return (
                <Text
                  key={t}
                  onClick={typeOptions.length > 1 ? () => setType(t) : undefined}
                  fz={13}
                  fw={800}
                  px={14}
                  py={4}
                  c="#fff"
                  style={{
                    borderRadius: 999,
                    cursor: typeOptions.length > 1 ? "pointer" : "default",
                    background: active ? typeColor(t) : "#1c1a26",
                    opacity: active ? 1 : 0.6,
                  }}
                >
                  {t}
                </Text>
              );
            })}
          </Group>
        </Group>
        <Group gap={14} align="center" style={{ flex: "1 1 240px", minWidth: 200, justifyContent: "flex-end" }}>
          <Text fz={15} c="gray.4">
            <Text span fz={26} fw={800} c="white">
              {completed}
            </Text>{" "}
            / {MISSIONS_PER_TYPE} abilities
          </Text>
          <Box style={{ flex: 1, maxWidth: 260, height: 8, borderRadius: 999, background: "#2a2637", overflow: "hidden" }}>
            <Box style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: BAR_GRADIENT }} />
          </Box>
        </Group>
      </Group>

      <Text fz={14} c="gray.5" maw={860}>
        Ten missions, ten abilities, each one <Text span c="#b197fc">encrypted</Text> until the mission
        before it is cleared. Request the next from the board; an admin authors your bespoke RP thread.
      </Text>

      <Stack gap={12}>
        {Array.from({ length: MISSIONS_PER_TYPE }).map((_, i) => {
          const cleared = i < completed;
          const available = i === completed;
          const num = String(i + 1).padStart(2, "0");
          const abilityName = abilities[i] || (available ? "Next ability" : "");
          return (
            <Box
              key={i}
              p="md"
              style={{
                borderRadius: 14,
                background: available ? "#160f26" : "transparent",
                border: `1px solid ${available ? "#5a3fb0" : PANEL_BORDER}`,
                boxShadow: available ? "0 0 24px rgba(90,63,176,0.25)" : "none",
                opacity: !cleared && !available ? 0.55 : 1,
              }}
            >
              <Group justify="space-between" wrap="nowrap" gap="md" align="center">
                <Group gap={16} wrap="nowrap" style={{ minWidth: 0 }}>
                  <Box
                    style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: cleared ? tColor : available ? GRAD : "#161319",
                      border: available ? "1px solid #7c5cff" : "none",
                    }}
                  >
                    <Text fz={18} fw={800} c={cleared || available ? "#fff" : "#4a4560"}>
                      {num}
                    </Text>
                  </Box>
                  <Box style={{ minWidth: 0 }}>
                    <Group gap={8} mb={2}>
                      <Text fz={11} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
                        Mission {num}
                      </Text>
                      {cleared ? (
                        <Text fz={11} fw={800} c="#69db7c" tt="uppercase">
                          &#10003; Cleared
                        </Text>
                      ) : available ? (
                        <Text fz={11} fw={800} c="grape.3" tt="uppercase">
                          &#9654; Available
                        </Text>
                      ) : (
                        <Group gap={4} wrap="nowrap">
                          <IconLock size={12} color="#8a83a0" />
                          <Text fz={11} fw={800} c="dimmed" tt="uppercase">
                            Encrypted
                          </Text>
                        </Group>
                      )}
                    </Group>
                    {cleared || available ? (
                      <Text fz={17} fw={800} c="white" lineClamp={1}>
                        {abilityName}
                      </Text>
                    ) : (
                      // redacted blocks
                      <Group gap={4} mb={2}>
                        {Array.from({ length: 9 }).map((__, k) => (
                          <Box key={k} style={{ width: 14, height: 12, borderRadius: 3, background: "#1c1a26" }} />
                        ))}
                      </Group>
                    )}
                    <Text fz={13} c="dimmed" lineClamp={1}>
                      {cleared
                        ? "Ability unlocked."
                        : available
                          ? "Ready to request from the board."
                          : "DECRYPTING... clear the prior mission to unlock."}
                    </Text>
                  </Box>
                </Group>

                {cleared ? (
                  <Text
                    component={Link}
                    to="/Forum/Main-Forum"
                    fz={14}
                    fw={700}
                    c="grape.3"
                    style={{ whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0 }}
                  >
                    View thread <IconExternalLink size={13} style={{ verticalAlign: "middle" }} />
                  </Text>
                ) : available && props.canAct ? (
                  <Button
                    variant="gradient"
                    gradient={{ from: "grape", to: "violet", deg: 90 }}
                    radius="xl"
                    rightSection={<IconArrowRight size={16} />}
                    onClick={() => onRequest(i)}
                    loading={busy === i}
                    style={{ flexShrink: 0 }}
                  >
                    Request Mission
                  </Button>
                ) : null}
              </Group>
            </Box>
          );
        })}
      </Stack>
      {status && (
        <Text fz={13} c="gray.3" role="status" aria-live="polite">
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
}) {
  const [tab, setTab] = React.useState<ConsoleTab>("overview");
  return (
    <Stack gap="xl">
      <Group gap={10} wrap="wrap">
        <TabPill label="Overview" icon={<IconTargetArrow size={15} />} active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabPill label="Divisions" icon={<IconDiamond size={14} />} active={tab === "divisions"} onClick={() => setTab("divisions")} />
        <TabPill label="Chambers" icon={<IconFlask size={14} />} active={tab === "chambers"} locked onClick={() => setTab("chambers")} />
        <TabPill label="Ascension" icon={<IconStar size={14} />} active={tab === "ascension"} onClick={() => setTab("ascension")} />
      </Group>

      {tab === "overview" && (
        <OverviewTab character={props.character} progress={props.progress} onEnter={() => setTab("ascension")} />
      )}
      {tab === "divisions" && <DivisionsTab />}
      {tab === "chambers" && <ChambersTab canAct={props.canAct} fossilItems={props.fossilItems} />}
      {tab === "ascension" && props.character && (
        <AscensionTab
          characterId={props.character.id}
          progress={props.progress}
          fallbackType={props.fallbackType}
          canAct={props.canAct}
        />
      )}
    </Stack>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function Research() {
  const { user } = useAuth();
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

  const characters = React.useMemo(
    () => charactersQuery.data?.sortedData ?? [],
    [charactersQuery.data]
  );
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
  // always operate for support. Actions stay gated by this; anyone may preview.
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
    onError: (e) =>
      setRequestStatus((e as Error).message || "Could not send the request. Try again."),
  });

  const loading = configQuery.isPending || (!!uid && (charactersQuery.isPending || progressQuery.isPending));
  const granted = view === "console" && canAct;
  const accentColor = granted ? "#b197fc" : "#F5C842";

  return (
    <Box style={{ background: "#0b0a10", minHeight: "100%" }}>
      <Container size="lg" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        {/* VIEW AS toggle + character picker */}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" mb="xl">
          <Group gap={10} align="center">
            <Text fz={11} fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 2 }}>
              View as
            </Text>
            <Group
              gap={4}
              p={4}
              style={{ borderRadius: 999, background: "#141019", border: "1px solid #2a2637" }}
            >
              <Button
                size="xs"
                radius="xl"
                variant={view === "guide" ? "gradient" : "subtle"}
                gradient={{ from: "grape", to: "violet", deg: 90 }}
                color="gray"
                leftSection={<IconLock size={12} />}
                onClick={() => setView("guide")}
              >
                Not a Master (guide)
              </Button>
              <Button
                size="xs"
                radius="xl"
                variant={view === "console" ? "gradient" : "subtle"}
                gradient={{ from: "grape", to: "violet", deg: 90 }}
                color="gray"
                leftSection={<IconStar size={12} />}
                onClick={() => setView("console")}
              >
                Master (console)
              </Button>
            </Group>
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
              styles={{ input: { background: "#141019" } }}
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
