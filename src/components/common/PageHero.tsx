import { Box, Flex, Group, Text } from "@mantine/core";
import React from "react";

/**
 * The shared page header used across the main sections (Shop, Casino,
 * Missions, Research, Colosseum, Challenges, Library, Users, Forum, Policies)
 * so every page opens the same way: a rounded striped-gradient banner, an
 * uppercase eyebrow, an 800-weight h1, a muted subtitle, and an optional
 * right-hand slot for stat chips or a search box. Place it inside the page's
 * Container. The Snag Dashboard keeps its own header (announcements and
 * notifications make it a special case) but borrows the same banner styling.
 */

export const HERO_STRIPES =
  "repeating-linear-gradient(120deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 14px)";
export const HERO_GRADIENT =
  "linear-gradient(120deg, #3a1d63 0%, #2c2352 55%, #1c2a4a 100%)";
export const HERO_BORDER = "#3a3550";
/** Angled bottom-right corner cut shared by the redesigned hero banner + panels. */
export const HERO_CLIP =
  "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)";

export function PageHero(props: {
  /** Small uppercase line above the title. A node is allowed for badges. */
  eyebrow?: React.ReactNode;
  /** Accent color for a plain-string eyebrow (Mantine color or CSS). */
  eyebrowColor?: string;
  title: React.ReactNode;
  /** Rendered inline after the title (status badges etc.). */
  titleSuffix?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-hand slot: stat chips, currency chips, or a search input. */
  aside?: React.ReactNode;
  /** Extra content below the title block, still inside the banner (tab rows). */
  children?: React.ReactNode;
  mb?: number;
}) {
  const eyebrow =
    typeof props.eyebrow === "string" ? (
      <Group gap={12} align="center" wrap="nowrap">
        <Box
          style={{ width: 36, height: 3, background: "#E54156", flexShrink: 0 }}
          aria-hidden
        />
        <Text
          fz={14}
          fw={700}
          c={props.eyebrowColor ?? "#FFD074"}
          tt="uppercase"
          style={{
            letterSpacing: "0.3em",
            fontFamily: "var(--font-display, 'Quantico', sans-serif)",
          }}
        >
          {props.eyebrow}
        </Text>
      </Group>
    ) : (
      props.eyebrow
    );

  return (
    <Box
      p={{ base: 20, sm: 40 }}
      mb={props.mb ?? 24}
      style={{
        position: "relative",
        overflow: "hidden",
        clipPath: HERO_CLIP,
        background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
        border: `1px solid ${HERO_BORDER}`,
      }}
    >
      {/* Diagonal red glow anchored to the top-right, per the AppHero mockup. */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: "38%",
          background: "linear-gradient(200deg, rgba(229,65,86,.16), transparent 70%)",
          clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)",
          pointerEvents: "none",
        }}
      />
      <Flex
        direction={{ base: "column", sm: "row" }}
        gap="md"
        align={{ base: "stretch", sm: "flex-end" }}
        justify="space-between"
        style={{ position: "relative" }}
      >
        <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
          {eyebrow && <Box mb={14}>{eyebrow}</Box>}
          <Group gap={10} wrap="wrap" align="center">
            <Text
              component="h1"
              c="white"
              fw={700}
              fz={{ base: 34, sm: 54 }}
              style={{
                lineHeight: 1,
                margin: 0,
                fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                letterSpacing: "0.02em",
              }}
            >
              {props.title}
            </Text>
            {props.titleSuffix}
          </Group>
          {props.subtitle && (
            <Text fz={{ base: 14, sm: 17 }} c="#b6b1bc" mt={16} maw={640} lh={1.55}>
              {props.subtitle}
            </Text>
          )}
        </Box>
        {props.aside && <Box style={{ flexShrink: 0 }}>{props.aside}</Box>}
      </Flex>
      {props.children && (
        <Box mt={20} style={{ position: "relative" }}>
          {props.children}
        </Box>
      )}
    </Box>
  );
}

/** Standard hero stat chip (value over an uppercase label), angled clip. */
export function HeroStat(props: {
  value: React.ReactNode;
  label: string;
  gold?: boolean;
  /** Accent color for the border/value (defaults gold when `gold`, else neutral). */
  color?: string;
}) {
  const accent = props.color ?? (props.gold ? "#F5C842" : undefined);
  return (
    <Box
      px={16}
      py={10}
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
        background: "rgba(0,0,0,0.35)",
        border: `1px solid ${accent ?? HERO_BORDER}`,
        minWidth: 96,
      }}
    >
      <Text fz={28} fw={800} c={accent ?? "white"} lh={1.1}>
        {props.value}
      </Text>
      <Text fz={14} fw={600} c="dimmed" tt="uppercase" mt={2} style={{ letterSpacing: 0.5 }}>
        {props.label}
      </Text>
    </Box>
  );
}
