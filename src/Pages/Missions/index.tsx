import { Box, Container, Group, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconSearch, IconStar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { Link } from "react-router-dom";
import { HeroStat, PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getCurrencies } from "../../queries/dashboard";
import { getMissions, Mission } from "../../queries/missions";

/**
 * Public Missions page (Mission Vault). Members browse always-available mission
 * briefs, filter by reward type, and open a detail page. Picking one up and
 * grading happen in the Quests forum, so nothing here writes to the database.
 */

type FilterKey =
  | "all"
  | "emblem"
  | "snag"
  | "catch"
  | "recruit"
  | "egg"
  | "special";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Rewards" },
  { key: "emblem", label: "Emblem Pieces" },
  { key: "snag", label: "Snag" },
  { key: "catch", label: "Catch" },
  { key: "recruit", label: "Recruit" },
  { key: "egg", label: "Egg" },
  { key: "special", label: "Special Item" },
];

const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";

// Type badge (STORY purple, STANDARD cyan, plus Master/Exceptional variants).
const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  Story: { bg: "#772976", text: "#fff" },
  Standard: { bg: "#12B7B6", text: "#06302f" },
  Master: { bg: "#4D14C4", text: "#fff" },
  Exceptional: { bg: "#FFD074", text: "#1A1B1E" },
};
const typeBadge = (tier?: string) => TYPE_BADGE[tier ?? ""] ?? { bg: "#12B7B6", text: "#06302f" };

const REWARD_LABEL: Record<string, string> = {
  snag: "Snag a Pokemon",
  catch: "Catch a Pokemon",
  recruit: "Recruit a Pokemon",
  egg: "Pokemon Egg",
};

/** Turn stored HTML into plain text for the card preview line. */
function htmlToText(html?: string): string {
  if (!html) return "";
  const el = document.createElement("div");
  el.innerHTML = DOMPurify.sanitize(html);
  return (el.textContent || el.innerText || "").trim();
}

/** Normalize a string | string[] field into an array of lines. */
function toLines(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function matchesFilter(mission: Mission, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "emblem":
      return !!mission.emblem_eligible;
    case "special":
      return !!mission.special_item;
    case "snag":
    case "catch":
    case "recruit":
    case "egg":
      return mission.pokemon_reward?.kind === filter;
    default:
      return true;
  }
}

/** Angled segmented filter pill (active = purple gradient, idle = dark card). */
function FilterChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.active}
      sx={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#fff",
        padding: "13px 22px",
        cursor: "pointer",
        background: props.active
          ? "linear-gradient(90deg, #912691, #4D14C4)"
          : "#17151c",
        border: props.active ? "1px solid transparent" : "1px solid #2a2637",
        "&:hover": props.active ? {} : { borderColor: "#E54156" },
      }}
    >
      {props.label}
    </UnstyledButton>
  );
}

/** Reward pill: colored dot + label, dark angular well. */
function RewardChip(props: { label: string; dot: string }) {
  return (
    <Box
      component="span"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "#0e0d11",
        border: "1px solid #2a2637",
        padding: "6px 12px",
      }}
    >
      <Box
        component="span"
        style={{ width: 8, height: 8, borderRadius: "50%", background: props.dot }}
      />
      <Text component="span" fz={14} c="#d7d2de">
        {props.label}
      </Text>
    </Box>
  );
}

function MissionCard(props: { mission: Mission }) {
  const { mission } = props;
  const preview =
    htmlToText(mission.story) ||
    mission.pokemon_note ||
    toLines(mission.objective).join(" ") ||
    "";
  const rewardLabel = mission.pokemon_reward
    ? REWARD_LABEL[mission.pokemon_reward.kind]
    : undefined;
  const tb = typeBadge(mission.tier);

  return (
    <Box
      className="dc-card"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <Box p="20px 22px" style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <Group justify="space-between" align="center" gap={10} wrap="nowrap">
          {mission.tier && (
            <Text
              component="span"
              fz={14}
              fw={700}
              tt="uppercase"
              px={10}
              py={4}
              style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.1em", color: tb.text, background: tb.bg }}
            >
              {mission.tier}
            </Text>
          )}
          {mission.emblem_eligible && (
            <Box
              component="span"
              px={10}
              py={4}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "#FFD074",
                marginLeft: "auto",
              }}
            >
              <IconStar size={13} color="#1A1B1E" fill="#1A1B1E" />
              <Text
                component="span"
                fz={14}
                fw={700}
                c="#1A1B1E"
                tt="uppercase"
                style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.08em" }}
              >
                Emblem
              </Text>
            </Box>
          )}
        </Group>

        <Text component="h3" c="white" fw={700} fz={20} mt={6} style={{ lineHeight: 1.2 }} lineClamp={2}>
          {mission.title}
        </Text>
        {mission.location && (
          <Text fz={15} c="#b6b1bc" lineClamp={1}>
            {mission.location}
          </Text>
        )}
        {preview && (
          <Text fz={14} c="#8f8a99" lineClamp={2} style={{ lineHeight: 1.55 }}>
            {preview}
          </Text>
        )}

        <Group gap={8} wrap="wrap" mt={2}>
          {!!mission.coins && <RewardChip label={`${mission.coins} Coins`} dot="#FFD074" />}
          {rewardLabel && <RewardChip label={rewardLabel} dot="#b06fce" />}
          {mission.special_item && <RewardChip label={mission.special_item} dot="#346CFD" />}
        </Group>

        <Group
          justify="space-between"
          align="center"
          wrap="nowrap"
          mt="auto"
          pt={14}
          style={{ borderTop: "1px solid #232028" }}
        >
          <Text fz={14} c="#6f6a78">
            Taken {mission.times_taken || 0}x
          </Text>
          <UnstyledButton
            component={Link}
            to={`/Missions/${mission.id}`}
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "0.12em",
              color: "#fff",
              padding: "11px 20px",
              background: "transparent",
              border: "1.5px solid rgba(255,255,255,0.4)",
              clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
              "&:hover": { borderColor: "#E54156", color: "#E54156" },
            }}
          >
            VIEW BRIEF
          </UnstyledButton>
        </Group>
      </Box>
    </Box>
  );
}

export default function Missions() {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [search, setSearch] = React.useState("");

  const { data: missions, isPending, isError } = useQuery({
    queryKey: ["missions"],
    queryFn: getMissions,
  });

  const { data: currency } = useQuery({
    queryKey: ["currencies", user?.uid],
    queryFn: () => getCurrencies(user!.uid),
    enabled: !!user?.uid,
  });

  // snagEmblemPieces is a newer bag/currency field not yet in the Currencies
  // type, so read it through a permissive record view.
  const pieces = Number(
    (currency as Record<string, string | undefined> | undefined)?.snagEmblemPieces ?? 0
  );

  const all = missions ?? [];
  const q = search.trim().toLowerCase();
  const shown = all.filter((m) => {
    if (!matchesFilter(m, filter)) return false;
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      (m.location ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Seo page="/Missions" />
      <Container size="xl" pt={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        <PageHero
          eyebrow="Take on a Mission!"
          eyebrowColor="#c79bd6"
          title="The Mission Vault"
          subtitle="Pick up a job from the Vault to open a roleplay thread in the Quests forum. Base pay is Snag Coins, write it well and the grader tips extra."
          aside={
            <Group gap="sm" wrap="wrap">
              <HeroStat value={String(all.length)} label="Missions" />
              <HeroStat value={`${pieces % 3}/3`} label="Emblem Pieces" gold />
            </Group>
          }
          mb={0}
        />
      </Container>

      <Container size="xl" py={{ base: 20, sm: 28 }} px={{ base: 16, sm: 24 }}>
        <Group justify="space-between" align="center" wrap="wrap" gap={16} mb={24}>
          <Group gap={10} wrap="wrap">
            {FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={filter === f.key}
                onClick={() => setFilter(f.key)}
              />
            ))}
          </Group>
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search missions or locations..."
            aria-label="Search missions or locations"
            leftSection={<IconSearch size={15} color="#6f6a78" />}
            radius={0}
            maw={340}
            w="100%"
            styles={{
              input: {
                background: "#141318",
                border: "1px solid #2a2637",
                color: "#fff",
              },
            }}
          />
        </Group>

        {isPending ? (
          <SectionLoader />
        ) : isError ? (
          <Text c="white" fz={16} ta="center" py={40} role="alert">
            Could not load the mission board. Refresh to try again.
          </Text>
        ) : !shown.length ? (
          <Text c="dimmed" fz={16} ta="center" py={40} role="status" aria-live="polite">
            No missions match your filters.
          </Text>
        ) : (
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {shown.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
