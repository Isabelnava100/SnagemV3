import { Box, Button, Container, Flex, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconArrowRight,
  IconArrowsLeftRight,
  IconBooks,
  IconBriefcase,
  IconCoin,
  IconDiamond,
  IconDice3,
  IconGhost2,
  IconLayoutDashboard,
  IconMedal2,
  IconMessageCircle,
  IconPhoto,
  IconShoppingBag,
  IconSwords,
  IconTargetArrow,
  IconTrophy,
} from "@tabler/icons-react";
import React from "react";
import { Link } from "react-router-dom";

/**
 * Public "About the Snagem Guild" page. Marketing/landing content only: no auth,
 * no reads. Shares the dark redesign language used by Research/Mall/Colosseum
 * (panel #141019 on #0b0a10, gradient CTAs, tabler icons in rounded tiles).
 */

const BG = "#0b0a10";
const PANEL = "#141019";
const PANEL_BORDER = "#232028";

/* -------------------------------- Shared bits ------------------------------ */

function Eyebrow({ children, color = "#F5C842" }: { children: React.ReactNode; color?: string }) {
  return (
    <Group gap={8} justify="inherit">
      <IconDiamond size={12} color={color} fill={color} />
      <Text fz={14} fw={700} c={color} style={{ letterSpacing: 3 }} tt="uppercase">
        {children}
      </Text>
    </Group>
  );
}

/* ---------------------------------- Data ----------------------------------- */

const FEATURES: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  body: string;
}[] = [
  {
    icon: <IconMessageCircle size={26} color="#c4b5fd" />,
    accent: "rgba(124,92,255,0.16)",
    title: "Roleplay Forums",
    body: "The heart of it all: adventures, missions, events and casual threads. Post to earn XP and grow.",
  },
  {
    icon: <IconLayoutDashboard size={26} color="#5eead4" />,
    accent: "rgba(45,212,191,0.14)",
    title: "Your Dashboard",
    body: "Build characters, form teams, and manage every Pokemon you own: level, evolve and all.",
  },
  {
    icon: <IconBriefcase size={26} color="#F5C842" />,
    accent: "rgba(245,197,24,0.14)",
    title: "The Mission Vault",
    body: "Pick up jobs across the regions, play them out, and get graded for Snag Coins, eggs and rare rewards.",
  },
  {
    icon: <IconSwords size={26} color="#ff8787" />,
    accent: "rgba(255,135,135,0.14)",
    title: "Challenges",
    body: "Run the Gym Leader gauntlet region by region, or take the Island Trials and topple every Totem for Z-Crystals.",
  },
  {
    icon: <IconTrophy size={26} color="#69db7c" />,
    accent: "rgba(105,219,124,0.14)",
    title: "The Colosseum",
    body: "Grind the Super Training Room, climb the Battle Rankings ladder, enter Tournaments, get enshrined in the Hall of Fame.",
  },
  {
    icon: <IconShoppingBag size={26} color="#f783ac" />,
    accent: "rgba(247,131,172,0.14)",
    title: "The Snag Mall",
    body: "Spend your earnings: General Store, Trash Shack, K&L Nature Tours, E.V.O. move work, and Ambrosial Alchemy crafting.",
  },
  {
    icon: <IconDice3 size={26} color="#b197fc" />,
    accent: "rgba(177,151,252,0.16)",
    title: "The Casino",
    body: "Try your luck on the Shadow Lotto and other games of chance.",
  },
  {
    icon: <IconBooks size={26} color="#74c0fc" />,
    accent: "rgba(116,192,252,0.14)",
    title: "Research & Lore",
    body: "Dig into the guild's canon, type mythologies, and the systems that run the world.",
  },
  {
    icon: <IconArrowsLeftRight size={26} color="#ffa94d" />,
    accent: "rgba(255,169,77,0.14)",
    title: "Trading",
    body: "Swap Pokemon with other members through the official exchange.",
  },
];

const CURRENCIES: {
  icon: React.ReactNode;
  iconBg: string;
  border: string;
  title: string;
  body: string;
}[] = [
  {
    icon: <IconCoin size={26} color="#F5C842" />,
    iconBg: "#231d10",
    border: "#b89b2e",
    title: "Snag Coins",
    body: "The everyday currency, earned from posting, missions and jobs.",
  },
  {
    icon: <IconGhost2 size={26} color="#c4b5fd" />,
    iconBg: "#1a1530",
    border: PANEL_BORDER,
    title: "Gengar Coins",
    body: "The casino's spooky chips, for games of chance.",
  },
  {
    icon: <IconMedal2 size={26} color="#5eead4" />,
    iconBg: "#12211f",
    border: PANEL_BORDER,
    title: "Snag Emblems",
    body: "Prestige currency, reserved for the big unlocks.",
  },
];

const STEPS = [
  { n: 1, title: "Sign up", body: "Create your account and make your first character." },
  { n: 2, title: "Jump in", body: "Pick up a mission or dive into a Main Adventure thread." },
  { n: 3, title: "Climb", body: "Post, earn, and rise. The guild grows with you." },
];

const ROLE_PILLS: { label: string; color: string; border: string }[] = [
  { label: "Legacy", color: "#F5C842", border: "#b89b2e" },
  { label: "Hybrid", color: "#b197fc", border: "#5a3fb0" },
  { label: "Master", color: "#69db7c", border: "#2f7d4f" },
  { label: "+ more", color: "#9a94a8", border: PANEL_BORDER },
];

/* ---------------------------------- Page ----------------------------------- */

export default function About() {
  return (
    <Box style={{ background: BG, minHeight: "100%" }}>
      <Container size="lg" py={{ base: 40, sm: 72 }} px={{ base: 16, sm: 24 }}>
        {/* ------------------------------- Hero ------------------------------- */}
        <Stack gap="lg" align="center" mb={{ base: 64, sm: 120 }} ta="center">
          <Box
            px={18}
            py={8}
            style={{ borderRadius: 999, border: "1px solid #b89b2e", background: "rgba(245,197,24,0.05)" }}
          >
            <Eyebrow>A Pokemon Roleplay Community</Eyebrow>
          </Box>

          <Text component="h1" fw={800} fz={{ base: 48, sm: 76 }} c="white" style={{ lineHeight: 1.02, margin: 0 }}>
            About the{" "}
            <Text span inherit variant="gradient" gradient={{ from: "grape", to: "violet", deg: 90 }}>
              Snagem Guild
            </Text>
          </Text>

          <Text fz={{ base: 20, sm: 24 }} c="gray.4" maw={640}>
            Roleplay, raise Pokemon, pull the perfect heist. Every great story starts with a snatch of
            ambition, and <Text span c="white" fw={700}>ours started with a Snag Machine.</Text>
          </Text>

          <Group gap="md" mt="md" justify="center">
            <Button
              component={Link}
              to="/Register"
              variant="gradient"
              gradient={{ from: "grape", to: "cyan", deg: 90 }}
              radius="xl"
              size="lg"
              rightSection={<IconArrowRight size={18} />}
            >
              Run with us
            </Button>
            <Button
              component="a"
              href="#what-you-can-do"
              variant="default"
              radius="xl"
              size="lg"
              styles={{ root: { background: "#1a1720", borderColor: PANEL_BORDER, color: "#e6e2ee" } }}
            >
              See what you can do
            </Button>
          </Group>
        </Stack>

        {/* ---------------------------- Who we are ---------------------------- */}
        <Flex gap={{ base: 32, md: 48 }} direction={{ base: "column", md: "row" }} align="stretch" mb={{ base: 64, sm: 120 }}>
          {/* Left: copy + THE WORLD badge (moved here, under the text) */}
          <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
            <Eyebrow color="#b197fc">Who we are</Eyebrow>
            <Text component="h2" fw={800} fz={{ base: 34, sm: 44 }} c="white" mt={16} mb="lg" style={{ lineHeight: 1.1 }}>
              Writers, artists, schemers &amp; softies, one shared world.
            </Text>
            <Text fz={20} c="gray.4" mb="md">
              The Snagem Guild is a long-running Pokemon roleplay community, built one post at a time.
              Team Snagem has a reputation for "acquiring" what it wants, but under the swagger, we're a
              home. A place to grow a character, chase a rival, hatch an egg, and belong to a crew that
              has your back.
            </Text>
            <Text fz={20} c="gray.4" mb="xl">
              No pressure, no grind you didn't sign up for. Just a living world, a friendly staff, and
              room to make your mark.
            </Text>

            {/* THE WORLD badge, now under the text instead of under the image */}
            <Box
              p="lg"
              style={{
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(34,211,238,0.01))",
                border: "1px solid #1c3a44",
              }}
            >
              <Eyebrow color="#22d3ee">The World</Eyebrow>
              <Text fz={16} c="gray.3" mt={10}>
                Snag Machines. Shadow Pokemon. A guild balanced on the line between outlaw and family.
                You start as one of us, pick your path, and write yourself into the lore.{" "}
                <Text span c="white" fw={600}>
                  Every mission, every gym, every Pokemon you purify becomes guild history.
                </Text>
              </Text>
            </Box>
          </Box>

          {/* Right: guild art placeholder */}
          <Box
            style={{
              flex: "1 1 0%",
              minWidth: 0,
              minHeight: 320,
              borderRadius: 20,
              border: `1px dashed ${PANEL_BORDER}`,
              background: PANEL,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <IconPhoto size={40} color="#4a4560" />
            <Text fz={16} c="dimmed" fw={600}>
              Guild art / group shot
            </Text>
          </Box>
        </Flex>

        {/* ------------------------- What you can do -------------------------- */}
        <Box id="what-you-can-do" mb={{ base: 64, sm: 120 }} style={{ scrollMarginTop: 80 }}>
          <Stack gap={4} align="center" ta="center" mb={{ base: 32, sm: 48 }}>
            <Eyebrow>What you can do here</Eyebrow>
            <Text component="h2" fw={800} fz={{ base: 34, sm: 48 }} c="white" mt={8} style={{ lineHeight: 1.1 }}>
              Nine ways to make your mark
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {FEATURES.map((f) => (
              <Box
                key={f.title}
                p="lg"
                style={{
                  borderRadius: 18,
                  background: PANEL,
                  border: `1px solid ${PANEL_BORDER}`,
                  backgroundImage: `radial-gradient(120% 90% at 100% 0%, ${f.accent}, transparent 60%)`,
                }}
              >
                <Box
                  mb="md"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "#1a1622",
                    border: `1px solid ${PANEL_BORDER}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {f.icon}
                </Box>
                <Text fz={24} fw={800} c="white" mb={6}>
                  {f.title}
                </Text>
                <Text fz={16} c="gray.5">
                  {f.body}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* --------------------------- Earn your keep ------------------------- */}
        <Flex gap={{ base: 32, md: 56 }} direction={{ base: "column", md: "row" }} align="center" mb={{ base: 64, sm: 120 }}>
          <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
            <Eyebrow>Earn your keep</Eyebrow>
            <Text component="h2" fw={800} fz={{ base: 36, sm: 52 }} c="white" mt={12} mb="md" style={{ lineHeight: 1.05 }}>
              Post, scheme, get paid.
            </Text>
            <Text fz={20} c="gray.4" mb="lg">
              Three currencies flow through the guild, and the badges you collect along the way mark
              exactly who you are: Legacy, Hybrid, Master and more.
            </Text>
            <Group gap={10}>
              {ROLE_PILLS.map((p) => (
                <Text
                  key={p.label}
                  fz={16}
                  fw={700}
                  px={14}
                  py={6}
                  c={p.color}
                  style={{ borderRadius: 999, border: `1px solid ${p.border}`, background: "rgba(255,255,255,0.02)" }}
                >
                  {p.label}
                </Text>
              ))}
            </Group>
          </Box>

          <Stack gap="md" style={{ flex: "1 1 0%", minWidth: 0, width: "100%" }}>
            {CURRENCIES.map((c) => (
              <Group
                key={c.title}
                gap="md"
                wrap="nowrap"
                p="md"
                align="center"
                style={{ borderRadius: 16, background: PANEL, border: `1px solid ${c.border}` }}
              >
                <Box
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: c.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {c.icon}
                </Box>
                <Box style={{ minWidth: 0 }}>
                  <Text fz={22} fw={800} c="white">
                    {c.title}
                  </Text>
                  <Text fz={16} c="gray.5">
                    {c.body}
                  </Text>
                </Box>
              </Group>
            ))}
          </Stack>
        </Flex>

        {/* ------------------------------ Final CTA --------------------------- */}
        <Box
          p={{ base: "lg", sm: 48 }}
          style={{
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(124,92,255,0.14), rgba(34,211,238,0.06))",
            border: "1px solid #2a2440",
          }}
        >
          <Stack gap={6} align="center" ta="center" mb="xl">
            <Text component="h2" fw={800} fz={{ base: 34, sm: 48 }} c="white" style={{ lineHeight: 1.05 }}>
              Ready to run with us?
            </Text>
            <Text fz={{ base: 16, sm: 22 }} c="gray.4">
              Three steps to start. Team Snagem is <Text span c="#F5C842" fw={700}>always recruiting.</Text>
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
            {STEPS.map((s) => (
              <Box
                key={s.n}
                p="lg"
                ta="center"
                style={{ borderRadius: 16, background: "rgba(11,10,16,0.4)", border: `1px solid ${PANEL_BORDER}` }}
              >
                <Box
                  mx="auto"
                  mb="md"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #a855f7, #6d28d9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text fz={26} fw={800} c="white">
                    {s.n}
                  </Text>
                </Box>
                <Text fz={22} fw={800} c="white" mb={4}>
                  {s.title}
                </Text>
                <Text fz={16} c="gray.5">
                  {s.body}
                </Text>
              </Box>
            ))}
          </SimpleGrid>

          <Group justify="center">
            <Button
              component={Link}
              to="/Register"
              variant="gradient"
              gradient={{ from: "gold.3", to: "gold.0", deg: 90 }}
              radius="xl"
              size="lg"
              leftSection={<IconTargetArrow size={20} />}
            >
              Join the Guild
            </Button>
          </Group>
        </Box>

        <Text ta="center" fz={16} c="dimmed" mt={{ base: 40, sm: 56 }}>
          Snagem Guild, a rogue's guild with a good heart. Made by the crew, for the crew.
        </Text>
      </Container>
    </Box>
  );
}
