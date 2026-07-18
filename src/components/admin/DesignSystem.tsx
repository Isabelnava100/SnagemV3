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

// The homepage CTA buttons use their own CSS palette (src/assets/styles/homepage.css).
const CTA_COLORS: { color: string; name: string; role: string }[] = [
  { color: "#E54156", name: "CTA Red", role: "Primary homepage action" },
  { color: "#772976", name: "CTA Purple", role: "Secondary homepage action" },
  { color: "#FFD074", name: "CTA Yellow", role: "Tertiary (dark text)" },
  { color: "#474D9B", name: "CTA Blue", role: "Rarely used accent" },
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
        hint="Brand purple is the primary. Pink/violet/cyan are accents and gradients; green is success. Use these tokens (theme.colors) instead of raw hex in new code."
      >
        <Stack gap={18}>
          <SimpleGrid cols={{ base: 2, xs: 3, sm: 5 }} spacing={12}>
            <Swatch color={theme.colors.brand[5]} name="Brand 5" role="Primary · buttons, active" />
            <Swatch color={theme.colors.brand[3]} name="Brand 3" role="Hover / lighter fill" />
            <Swatch color={theme.colors.pink[0]} name="Pink 0" role="Alerts, gradient start" />
            <Swatch color={theme.colors.violet[0]} name="Violet 0" role="Gradient start" />
            <Swatch color={theme.colors.cyan[0]} name="Cyan 0" role="Gradient end, links" />
            <Swatch color={theme.colors.green[0]} name="Green 0" role="Success / positive" />
          </SimpleGrid>

          <Panel>
            <Stack gap={14}>
              <TupleRow label="brand" role="10 shades · primary" colors={theme.colors.brand} />
              <TupleRow label="pink" role="alerts + gradients" colors={theme.colors.pink} />
              <TupleRow label="violet / cyan" role="secondary gradient" colors={[...theme.colors.violet.slice(0, 1), ...theme.colors.cyan.slice(0, 2)]} />
            </Stack>
          </Panel>

          <Box>
            <Text fz={13} fw={700} c="white" mb={8}>
              Homepage CTA palette
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={12}>
              {CTA_COLORS.map((c) => (
                <Swatch key={c.color} {...c} />
              ))}
            </SimpleGrid>
          </Box>

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
                Update
              </Badge>
              <Badge color="green" variant="light" radius="sm">
                Done
              </Badge>
              <Badge color="cyan" variant="outline" radius="sm">
                Beta
              </Badge>
            </Group>
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

      {/* 05 Status notes */}
      <Section
        index="05"
        eyebrow="Status"
        title="Consistency notes"
        hint="What was recently brought on brand, and what is still worth aligning. Use this as a punch list."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
          <Card withBorder radius="md" padding="lg" style={{ background: "rgba(34,181,115,0.08)", borderColor: "#22b573" }}>
            <Text fz={13} fw={700} c="green.0" tt="uppercase" mb={8} style={{ letterSpacing: 1 }}>
              On brand
            </Text>
            <Stack gap={6}>
              <Text fz={14} c="rgba(255,255,255,0.8)">Single font family (Roboto); serif removed from the Library.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Unused Inter web font dropped from the page load.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Button radius standardized to xl (pill) app-wide via the theme.</Text>
            </Stack>
          </Card>
          <Card withBorder radius="md" padding="lg" style={{ background: "rgba(245,200,66,0.06)", borderColor: "#7a5a1e" }}>
            <Text fz={13} fw={700} c="#F5C842" tt="uppercase" mb={8} style={{ letterSpacing: 1 }}>
              Still worth aligning
            </Text>
            <Stack gap={6}>
              <Text fz={14} c="rgba(255,255,255,0.8)">Casino uses an off-palette orange gradient; move to brand or define it as an official accent.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">Homepage CTA colors live in CSS, not theme tokens; fold into the palette.</Text>
              <Text fz={14} c="rgba(255,255,255,0.8)">A few one-off button colors per section could route through Primary / Secondary.</Text>
            </Stack>
          </Card>
        </SimpleGrid>
      </Section>
    </Stack>
  );
}
