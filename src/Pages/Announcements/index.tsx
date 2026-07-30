import { Box, Container, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
import useMediaQuery from "../../hooks/useMediaQuery";

/**
 * Public "what's new / what's here" page. Anyone (signed in or not) can read
 * it, and the homepage "See Anticipated Updates" button links here.
 *
 * Two parts:
 *   1. Development updates: a running log of changes, newest first. Each entry
 *      carries a status (in progress / shipped / planned) that drives its pill
 *      color and colored left border.
 *   2. "Everything you can do": a quick tour of the site's features.
 *
 * To post a new development update, add an object to the TOP of the
 * ANNOUNCEMENTS array below. Keep bodies short and plain-spoken.
 */

const DISPLAY = { fontFamily: "var(--font-display, 'Quantico', sans-serif)" } as const;

type Status = "in-progress" | "shipped" | "planned";

/** Pill fill/text plus the colored left border for each update state. */
const STATUS_META: Record<
  Status,
  { label: string; pillBg: string; pillFg: string; border: string }
> = {
  "in-progress": { label: "IN PROGRESS", pillBg: "#FFD074", pillFg: "#1A1B1E", border: "#E54156" },
  shipped: { label: "SHIPPED", pillBg: "#12B7B6", pillFg: "#ffffff", border: "#12B7B6" },
  planned: { label: "PLANNED", pillBg: "#772976", pillFg: "#ffffff", border: "#772976" },
};

type Announcement = {
  status: Status;
  /** Uppercase period label, e.g. "JULY 2026" or "LATER 2026". */
  month: string;
  title: string;
  body: string;
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    status: "in-progress",
    month: "JULY 2026",
    title: "Site-wide redesign",
    body: "A new cinematic look is rolling out across every page: bolder type, angled accents, and a faster way to reach the game hubs. Expect pages to shift as we go.",
  },
  {
    status: "shipped",
    month: "JUNE 2026",
    title: "Gaia import improvements",
    body: "Returning members can now prefill their import draft from our Gaia export archive, download filled CSV templates, and create characters with their history in one click.",
  },
  {
    status: "planned",
    month: "LATER 2026",
    title: "Member-visible changelogs",
    body: "We are looking at moving these updates out of code and into a proper feed so staff can post news without a deploy.",
  },
];

type FeatureGroup = {
  icon: SnagIconName;
  title: string;
  items: string[];
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    icon: "book",
    title: "STORIES & FORUMS",
    items: [
      "Write in Main Adventures and Side Stories",
      "Dice rolls, drafts, and bookmarks built in",
      "Hosts run battles, events, and rewards",
    ],
  },
  {
    icon: "swords",
    title: "BATTLES & TRAINING",
    items: [
      "Colosseum bouts and Challenge ladders",
      "Type matchups, crits, weather, held items",
      "Star ratings from 1 to 7 set the stakes",
    ],
  },
  {
    icon: "pokeball",
    title: "YOUR COLLECTION",
    items: [
      "Snag wild Pokemon and purify Shadows",
      "Breed at the Daycare, hatch eggs",
      "Manage teams and bag from the Console",
    ],
  },
  {
    icon: "coin",
    title: "THE ECONOMY",
    items: [
      "Earn Snag Coins by posting and missions",
      "Spend at the Snag Mall, gamble at the Casino",
      "Trade Pokemon and items with members",
    ],
  },
  {
    icon: "map",
    title: "MISSIONS & ACTIVITIES",
    items: [
      "Guild missions with graded rewards",
      "Snag List, Berry Farm, and Fishing",
      "Research tasks for the scholarly",
    ],
  },
  {
    icon: "walkie",
    title: "HELP & COMMUNITY",
    items: [
      "GRAY help agent on every page",
      "The Library holds every guide and rule",
      "Member directory and public profiles",
    ],
  },
];

/** Two-tone Quantico section heading (white base + a colored accent word). */
function SectionHeading({
  id,
  lead,
  accent,
  accentColor,
}: {
  id: string;
  lead: string;
  accent: string;
  accentColor: string;
}) {
  return (
    <Text
      component="h2"
      id={id}
      c="white"
      fw={700}
      fz={{ base: 24, sm: 30 }}
      style={{ ...DISPLAY, letterSpacing: "0.04em", margin: "0 0 26px", lineHeight: 1.15 }}
    >
      {lead}{" "}
      <Text span inherit c={accentColor}>
        {accent}
      </Text>
    </Text>
  );
}

export default function Announcements() {
  const { isOverSm } = useMediaQuery();
  const articlePad = isOverSm ? "28px 32px" : "20px 18px";
  const cardPad = isOverSm ? "28px 30px" : "20px 18px";

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo page="/Announcements" />
      <PageHero
        eyebrow="What's New"
        title="Announcements"
        subtitle="Development updates from the guild team, newest first, plus a quick tour of everything you can do on the site."
        mb={isOverSm ? 48 : 32}
      />

      <Stack gap={isOverSm ? 56 : 40}>
        <Box component="section" aria-labelledby="dev-updates-heading">
          <SectionHeading
            id="dev-updates-heading"
            lead="DEVELOPMENT"
            accent="UPDATES"
            accentColor="#FFD074"
          />
          <Stack gap={18}>
            {ANNOUNCEMENTS.map((a) => {
              const meta = STATUS_META[a.status];
              return (
                <Box
                  component="article"
                  key={`${a.month}-${a.title}`}
                  style={{
                    background: "#17151c",
                    border: "1px solid #2a2637",
                    borderLeft: `3px solid ${meta.border}`,
                    padding: articlePad,
                  }}
                >
                  <Group gap={14} mb={10} wrap="wrap">
                    <Text
                      span
                      style={{
                        ...DISPLAY,
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        color: meta.pillFg,
                        background: meta.pillBg,
                        padding: "5px 12px",
                      }}
                    >
                      {meta.label}
                    </Text>
                    <Text
                      span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        color: "#b6b1bc",
                      }}
                    >
                      {a.month}
                    </Text>
                  </Group>
                  <Text
                    component="h3"
                    c="white"
                    style={{ ...DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}
                  >
                    {a.title}
                  </Text>
                  <Text style={{ fontSize: 16, color: "#b6b1bc", lineHeight: 1.6, margin: 0 }}>
                    {a.body}
                  </Text>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box component="section" aria-labelledby="features-heading">
          <SectionHeading
            id="features-heading"
            lead="EVERYTHING YOU"
            accent="CAN DO"
            accentColor="#E54156"
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={20}>
            {FEATURE_GROUPS.map((group) => (
              <Box key={group.title} className="dc-card" style={{ padding: cardPad }}>
                <Group gap={12} mb={14} wrap="nowrap">
                  <SnagIcon name={group.icon} size={28} color="#ffffff" cut="#17151c" />
                  <Text
                    component="h3"
                    c="white"
                    style={{
                      ...DISPLAY,
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      margin: 0,
                    }}
                  >
                    {group.title}
                  </Text>
                </Group>
                <Box
                  component="ul"
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    color: "#b6b1bc",
                    fontSize: 15,
                    lineHeight: 1.9,
                    listStyleType: "disc",
                  }}
                >
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
}
