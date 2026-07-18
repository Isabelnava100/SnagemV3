import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { HERO_GRADIENT, HERO_STRIPES } from "../common/PageHero";

/**
 * Admin-only "brand kit" / design-system reference. This is a READ-ONLY status
 * view: it shows the colors, typography, button styles, surfaces and radii the
 * site uses, so staff can see the current state at a glance and keep new work on
 * brand. It does not change how any other page renders. Modelled on a standard
 * brand-kit deck (cover, palette, typography scale, components, usage notes).
 *
 * When the theme (src/lib/mantine.ts) changes, the palette + type samples here
 * update automatically because they read from the live theme. Surface hexes and
 * the legacy homepage CTA colors are listed explicitly since they live as CSS
 * literals rather than theme tokens.
 */

const VERSION = "v1.0 · 2026 · Snagem Guild";

/* -------------------------------- helpers -------------------------------- */

function Section(props: { index: string; eyebrow: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box component="section" aria-label={props.title}>
      <Group gap={10} align="baseline" mb={4} wrap="nowrap">
        <Text ff="monospace" fz={13} c="grape.3" fw={700}>
          {props.index}
        </Text>
        <Text ff="monospace" fz={11} c="dimmed" tt="uppercase" style={{ letterSpacing: 2 }}>
          {props.eyebrow}
        </Text>
      </Group>
      <Title order={2} c="white" fz={{ base: 22, sm: 26 }} fw={800} mb={props.hint ? 2 : 14}>
        {props.title}
      </Title>
      {props.hint && (
        <Text c="dimmed" fz={14} mb={14} maw={640}>
          {props.hint}
        </Text>
      )}
      {props.children}
    </Box>
  );
}

/** A single color chip with its hex + role. Contrast dot flips on light swatches. */
function Swatch(props: { color: string; name: string; role?: string }) {
  return (
    <Box style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #232028", background: "#141318" }}>
      <Box style={{ background: props.color, height: 56 }} />
      <Box p={10}>
        <Text fz={13} fw={700} c="white" lh={1.2}>
          {props.name}
        </Text>
        <Text ff="monospace" fz={12} c="dimmed" tt="uppercase">
          {props.color}
        </Text>
        {props.role && (
          <Text fz={11} c="dimmed" mt={2} lh={1.3}>
            {props.role}
          </Text>
        )}
      </Box>
    </Box>
  );
}

function TupleRow(props: { label: string; role: string; colors: readonly string[] }) {
  return (
    <Box>
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Text fz={13} fw={700} c="white">
          {props.label}
        </Text>
        <Text fz={11} c="dimmed">
          {props.role}
        </Text>
      </Group>
      <Group gap={0} wrap="nowrap" style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #232028" }}>
        {props.colors.map((c, i) => (
          <Box
            key={`${c}-${i}`}
            title={c}
            style={{ background: c, height: 34, flex: 1 }}
          />
        ))}
      </Group>
    </Box>
  );
}

function Spec(props: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text fz={13} c="dimmed">
        {props.label}
      </Text>
      <Text ff="monospace" fz={13} c="white" ta="right">
        {props.value}
      </Text>
    </Group>
  );
}

function Panel(props: { children: React.ReactNode }) {
  return (
    <Box p="lg" style={{ borderRadius: 14, background: "#141318", border: "1px solid #232028" }}>
      {props.children}
    </Box>
  );
}

/* --------------------------------- data ---------------------------------- */

// Surfaces are CSS literals scattered across the app; documented here so there
// is one place to see the intended stacking order (darkest page up to raised).
const SURFACES: { color: string; name: string; role: string }[] = [
  { color: "#1E1D20", name: "Page", role: "App background / nav" },
  { color: "#17151c", name: "Panel", role: "Grouped section card" },
  { color: "#141318", name: "Card", role: "Inner tool / list card" },
  { color: "#232028", name: "Border", role: "Hairline on cards" },
  { color: "#2a2637", name: "Border alt", role: "Pills / dividers" },
  { color: "#3C3A3C", name: "Raised", role: "Nav tiles / chips" },
];

// The homepage CTA classes (src/assets/styles/homepage.css) reference the
// theme tokens via Mantine CSS variables; listed here with their fun names.
const CTA_COLORS: { color: string; name: string; role: string }[] = [
  { color: "#E54156", name: "Magikarp Red", role: "pink.0 · CTAs, alerts, red text" },
  { color: "#772976", name: "Gengar Purple", role: "brand.5 · the primary purple" },
  { color: "#FFD074", name: "Pikachu Gold", role: "gold.0 · gold fills (dark text)" },
  { color: "#4049C9", name: "Great Ball Blue", role: "indigo.0 · saturated CTA blue" },
];

const TYPE_SCALE: { label: string; size: string; sample: string; fz: number; fw: number; c?: string }[] = [
  { label: "Hero H1", size: "28 → 40 / 800", sample: "The Snagem Guild", fz: 34, fw: 800 },
  { label: "Section H2", size: "22 → 26 / 800", sample: "Everything you can do", fz: 24, fw: 800 },
  { label: "Card title", size: "16 → 22 / 700", sample: "The Pokédex", fz: 20, fw: 700 },
  { label: "Body", size: "14 → 16 / 400", sample: "We created this platform for roleplay.", fz: 15, fw: 400, c: "rgba(255,255,255,0.75)" },
  { label: "Label / eyebrow", size: "10 → 12 / 700 · caps", sample: "WHAT'S NEW", fz: 12, fw: 700 },
];

/* ------------------------------- component ------------------------------- */

export default function DesignSystem() {
  const theme = useMantineTheme();

  return (
    <Stack gap={36}>
      {/* Cover */}
      <Box
        p={{ base: 20, sm: 28 }}
        style={{
          borderRadius: 16,
          background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
          border: "1px solid #3a3550",
        }}
      >
        <Text ff="monospace" fz={12} c="grape.3" tt="uppercase" mb={8} style={{ letterSpacing: 3 }}>
          Brand Kit · Reference only
        </Text>
        <Title order={1} c="white" fz={{ base: 30, sm: 44 }} fw={800} lh={1.05}>
          Snagem Guild Design System
        </Title>
        <Text c="gray.4" fz={{ base: 14, sm: 16 }} mt={10} maw={620}>
          The single source of truth for colors, type and components. Match new work to
          what you see here so the site stays consistent across the board.
        </Text>
        <Text ff="monospace" fz={12} c="dimmed" mt={16}>
          {VERSION}
        </Text>
      </Box>

      {/* 01 Palette */}
      <Section
        index="01"
        eyebrow="Palette"
        title="Brand colors"
        hint="One tight family: the homepage colors, the 10-shade Gengar Purple ramp, and the Espeon Violet to Suicune Cyan gradient pair. Cyan doubles as the success color (greens are retired). Use these tokens (theme.colors) instead of raw hex in new code."
      >
        <Stack gap={18}>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={12}>
            {CTA_COLORS.map((c) => (
              <Swatch key={c.color} {...c} />
            ))}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={12}>
            <Swatch color={theme.colors.brand[3]} name="Guild Lilac" role="brand.3 · light purple accents" />
            <Swatch color={theme.colors.violet[0]} name="Espeon Violet" role="violet.0 · gradient start" />
            <Swatch color={theme.colors.cyan[0]} name="Suicune Cyan" role="cyan.0 · gradient end, success" />
            <Swatch color={theme.colors.gold[1]} name="Zapdos Spark" role="gold.1 · gold text on dark" />
          </SimpleGrid>

          <Panel>
            <Stack gap={14}>
              <TupleRow label="Gengar Purple ramp" role="brand, 10 shades · primary" colors={theme.colors.brand} />
              <TupleRow label="Magikarp Red ramp" role="pink.* · alerts + primary gradient" colors={theme.colors.pink.slice(0, 4)} />
              <TupleRow label="Pikachu Gold ramp" role="gold.* · fills + accents" colors={theme.colors.gold.slice(0, 4)} />
              <TupleRow label="Violet / Cyan pair" role="violet.0 + cyan.* · secondary gradient" colors={[...theme.colors.violet.slice(0, 1), ...theme.colors.cyan.slice(0, 2)]} />
            </Stack>
          </Panel>

          <Box>
            <Text fz={13} fw={700} c="white" mb={8}>
              Surfaces & lines (dark theme)
            </Text>
            <SimpleGrid cols={{ base: 2, xs: 3, sm: 6 }} spacing={12}>
              {SURFACES.map((s) => (
                <Swatch key={s.color} {...s} />
              ))}
            </SimpleGrid>
          </Box>
        </Stack>
      </Section>

      {/* 02 Typography */}
      <Section
        index="02"
        eyebrow="Typography"
        title="One family, one scale"
        hint="Roboto for everything: titles and body share the family, separated by weight and size. Monospace is reserved for data labels (codes, counts, hex). No serif."
      >
        <Panel>
          <Stack gap={18}>
            {TYPE_SCALE.map((t) => (
              <Group key={t.label} justify="space-between" align="baseline" wrap="nowrap" gap="lg">
                <Text
                  fz={t.fz}
                  fw={t.fw}
                  c={t.c ?? "white"}
                  tt={t.label.startsWith("Label") ? "uppercase" : undefined}
                  style={{ letterSpacing: t.label.startsWith("Label") ? 2 : undefined, minWidth: 0 }}
                  lineClamp={1}
                >
                  {t.sample}
                </Text>
                <Box style={{ flexShrink: 0, textAlign: "right" }}>
                  <Text fz={12} fw={600} c="white">
                    {t.label}
                  </Text>
                  <Text ff="monospace" fz={11} c="dimmed">
                    {t.size}
                  </Text>
                </Box>
              </Group>
            ))}
            <Group justify="space-between" align="baseline" wrap="nowrap" gap="lg">
              <Text ff="monospace" fz={15} c="grape.3" fw={700}>
                QL · 700 · 1,025
              </Text>
              <Box style={{ flexShrink: 0, textAlign: "right" }}>
                <Text fz={12} fw={600} c="white">
                  Data / mono
                </Text>
                <Text ff="monospace" fz={11} c="dimmed">
                  monospace · codes & counts
                </Text>
              </Box>
            </Group>
          </Stack>
        </Panel>
      </Section>

      {/* 03 Buttons */}
      <Section
        index="03"
        eyebrow="Components"
        title="Buttons"
        hint="Standard radius is xl (pill). Primary is the pink gradient; secondary is violet → cyan. Use light for inline actions and default for neutral ones. Keep to sizes sm / md / lg."
      >
        <Panel>
          <Stack gap={20}>
            <Box>
              <Text fz={11} c="dimmed" tt="uppercase" mb={10} style={{ letterSpacing: 1 }}>
                Variants (radius xl)
              </Text>
              <Group gap={12}>
                <Button radius="xl" variant="gradient" gradient={{ from: theme.colors.pink[2], to: theme.colors.pink[0] }}>
                  Primary
                </Button>
                <Button radius="xl" variant="gradient" gradient={{ from: theme.colors.violet[0], to: theme.colors.cyan[0] }}>
                  Secondary
                </Button>
                <Button radius="xl" color="grape" variant="filled">
                  Filled
                </Button>
                <Button radius="xl" color="grape" variant="light">
                  Light
                </Button>
                <Button radius="xl" color="grape" variant="subtle">
                  Subtle
                </Button>
                <Button radius="xl" variant="default">
                  Default
                </Button>
                <Button radius="xl" color="grape" variant="outline">
                  Outline
                </Button>
              </Group>
            </Box>

            <Box>
              <Text fz={11} c="dimmed" tt="uppercase" mb={10} style={{ letterSpacing: 1 }}>
                Sizes
              </Text>
              <Group gap={12} align="center">
                <Button radius="xl" color="grape" size="xs">
                  Extra small
                </Button>
                <Button radius="xl" color="grape" size="sm">
                  Small
                </Button>
                <Button radius="xl" color="grape" size="md">
                  Medium
                </Button>
                <Button radius="xl" color="grape" size="lg">
                  Large
                </Button>
              </Group>
            </Box>

            <Box>
              <Text fz={11} c="dimmed" tt="uppercase" mb={10} style={{ letterSpacing: 1 }}>
                Specs
              </Text>
              <Stack gap={8} maw={360}>
                <Spec label="Radius" value="xl (pill)" />
                <Spec label="Weight" value="700" />
                <Spec label="Primary" value="pink gradient" />
                <Spec label="Secondary" value="violet → cyan" />
                <Spec label="Sizes" value="sm · md · lg" />
              </Stack>
            </Box>
          </Stack>
        </Panel>
      </Section>

      {/* 04 Surfaces, radii & chips */}
      <Section
        index="04"
        eyebrow="Layout"
        title="Cards, radii & chips"
        hint="Content sits on layered dark surfaces with hairline borders. Radii step up with the element's size; badges and stat chips carry the accent colors."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
          <Panel>
            <Text fz={13} fw={700} c="white" mb={12}>
              Radius scale
            </Text>
            <Group gap={14} align="flex-end">
              {([
                ["sm", 8],
                ["md", 12],
                ["lg", 16],
                ["xl", 999],
              ] as const).map(([name, r]) => (
                <Stack key={name} gap={6} align="center">
                  <Box
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: r,
                      background: "#232028",
                      border: "1px solid #3C3A3C",
                    }}
                  />
                  <Text ff="monospace" fz={11} c="dimmed">
                    {name}
                  </Text>
                </Stack>
              ))}
            </Group>
          </Panel>

          <Panel>
            <Text fz={13} fw={700} c="white" mb={12}>
              Badges & chips
            </Text>
            <Group gap={10} mb={14}>
              <Badge color="grape" variant="light" radius="sm">
                New
              </Badge>
              <Badge color="pink" variant="light" radius="sm">
                Alert
              </Badge>
              <Badge color="cyan" variant="light" radius="sm">
                Done
              </Badge>
              <Badge color="gold.1" variant="light" radius="sm">
                Featured
              </Badge>
              <Badge color="indigo" variant="light" radius="sm">
                Info
              </Badge>
              <Badge color="cyan" variant="outline" radius="sm">
                Beta
              </Badge>
            </Group>
            <Text fz={12} c="dimmed" mb={10}>
              Badge colors come from the same family: grape (purple), pink (Magikarp
              Red), cyan for success ("Done" instead of green), gold for featured,
              indigo (Great Ball Blue) for info.
            </Text>
            <Group gap={10}>
              <Box px={16} py={10} style={{ borderRadius: 12, background: "rgba(0,0,0,0.35)", border: "1px solid #3a3550", minWidth: 96 }}>
                <Text fz={22} fw={800} c="#F5C842" lh={1.1}>
                  1,025
                </Text>
                <Text fz={10} fw={600} c="dimmed" tt="uppercase" mt={2} style={{ letterSpacing: 0.5 }}>
                  Species
                </Text>
              </Box>
              <Box px={16} py={10} style={{ borderRadius: 12, background: "rgba(0,0,0,0.35)", border: "1px solid #3a3550", minWidth: 96 }}>
                <Text fz={22} fw={800} c="white" lh={1.1}>
                  994
                </Text>
                <Text fz={10} fw={600} c="dimmed" tt="uppercase" mt={2} style={{ letterSpacing: 0.5 }}>
                  Items
                </Text>
              </Box>
            </Group>
          </Panel>
        </SimpleGrid>
      </Section>

      {/* 05 Content width */}
      <Section
        index="05"
        eyebrow="Layout"
        title="Content width"
        hint="Pages sit in a centered Mantine Container. Reading pages use size md, wide tool pages use size lg; both share the same vertical and horizontal padding scale."
      >
        <Panel>
          <Stack gap={14}>
            {([
              ["md · 960px", "Reading pages: Policies, Announcements, Library, About", 0.72],
              ["lg · 1140px", "Wide tool pages: Admin, Forum, Dashboard, Shop", 0.86],
              ["100% · fluid", "The homepage hero and full-bleed banners", 1],
            ] as const).map(([label, role, frac]) => (
              <Box key={label}>
                <Group justify="space-between" mb={4} wrap="nowrap">
                  <Text ff="monospace" fz={12} c="white">
                    {label}
                  </Text>
                  <Text fz={12} c="dimmed" ta="right">
                    {role}
                  </Text>
                </Group>
                <Box
                  h={10}
                  w={`${frac * 100}%`}
                  style={{
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #772976, #4D14C4)",
                  }}
                />
              </Box>
            ))}
            <Stack gap={8} maw={420}>
              <Spec label="Page padding (mobile)" value="py 24 / px 16" />
              <Spec label="Page padding (desktop)" value="py 40 / px 24" />
              <Spec label="Body copy measure" value="maw 620-680" />
              <Spec label="Breakpoints" value="xs 480 · sm 800 · md 900 · lg 1200" />
            </Stack>
          </Stack>
        </Panel>
      </Section>

      {/* 06 Banner styles */}
      <Section
        index="06"
        eyebrow="Layout"
        title="Banner styles"
        hint="Two banner families: the page hero every section opens with, and the in-thread game banners (boss, encounter, mission targets). Each has a fixed surface + border pair."
      >
        <Stack gap={12}>
          <Box
            p={16}
            style={{
              borderRadius: 16,
              background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
              border: "1px solid #3a3550",
            }}
          >
            <Text fz={11} fw={700} c="grape.3" tt="uppercase" style={{ letterSpacing: 3 }}>
              Page hero
            </Text>
            <Text fz={18} fw={800} c="white">
              PageHero: striped gradient, eyebrow, fw 800 title
            </Text>
            <Text fz={12} c="gray.4">
              Every main section opens with this banner (src/components/common/PageHero.tsx).
            </Text>
          </Box>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={12}>
            <Box p={12} style={{ background: "#2a1a1e", border: "1px solid #E54156", borderRadius: 10 }}>
              <Text fz={13} fw={700} c="white" mb={2}>
                Boss battle banner
              </Text>
              <Text ff="monospace" fz={11} c="dimmed">
                bg #2a1a1e · border Magikarp Red
              </Text>
              <Text fz={12} c="dimmed" mt={4}>
                Shared boss with a red draining health bar; pinned for everyone.
              </Text>
            </Box>
            <Box p={12} style={{ background: "#14252a", border: "1px solid #1f6f7a", borderRadius: 10 }}>
              <Text fz={13} fw={700} c="white" mb={2}>
                Encounter banner
              </Text>
              <Text ff="monospace" fz={11} c="dimmed">
                bg #14252a · border #1f6f7a
              </Text>
              <Text fz={12} c="dimmed" mt={4}>
                Personal wild encounter: star, traits and health; only the roller sees it.
              </Text>
            </Box>
            <Box p={12} style={{ background: "#241f2e", border: "1px solid #4b3f63", borderRadius: 10 }}>
              <Text fz={13} fw={700} c="white" mb={2}>
                Mission targets banner
              </Text>
              <Text ff="monospace" fz={11} c="dimmed">
                bg #241f2e · border #4b3f63
              </Text>
              <Text fz={12} c="dimmed" mt={4}>
                Purple checklist of required foes with cyan checks when beaten.
              </Text>
            </Box>
          </SimpleGrid>
        </Stack>
      </Section>

      {/* 07 Status notes */}
      <Section
        index="07"
        eyebrow="Status"
        title="Consistency notes"
        hint="What was recently brought on brand, and what is still worth aligning. Use this as a punch list."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
          <Card withBorder radius="md" padding="lg" style={{ background: "rgba(18,183,182,0.08)", borderColor: "#12B7B6" }}>
            <Text fz={13} fw={700} c="green.0" tt="uppercase" mb={8} style={{ letterSpacing: 1 }}>
              On brand
            </Text>
            <Stack gap={6}>
              <Text fz={14} c="rgba(255,255,255,0.8)">Single font family (Roboto); serif removed from the Library.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Button radius standardized to xl (pill) app-wide via the theme.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">One gold: the three near-identical golds unified into the Pikachu Gold ramp.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Greens retired: success states now render in Suicune Cyan everywhere.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Pinks now carry Magikarp Red; grape accents share the Gengar Purple ramp.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Homepage blue saturated up into Great Ball Blue and used by the indigo gradients.</Text>
            </Stack>
          </Card>
          <Card withBorder radius="md" padding="lg" style={{ background: "rgba(245,200,66,0.06)", borderColor: "#7a5a1e" }}>
            <Text fz={13} fw={700} c="#F5C842" tt="uppercase" mb={8} style={{ letterSpacing: 1 }}>
              Still worth aligning
            </Text>
            <Stack gap={6}>
              <Text fz={14} c="rgba(255,255,255,0.8)">A few one-off button colors per section could route through Primary / Secondary.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Casino per-game accents (teal, pink, purple) are close to the palette but not tokens yet.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Mall storefront accent rotation is its own set; consider deriving from the theme.</Text>
            </Stack>
          </Card>
        </SimpleGrid>
      </Section>
    </Stack>
  );
}
