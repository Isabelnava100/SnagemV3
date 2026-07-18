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
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 12px, transparent 12px, transparent 24px)";
export const HERO_GRADIENT =
  "linear-gradient(120deg, #3a1d63 0%, #2c2352 55%, #1c2a4a 100%)";
export const HERO_BORDER = "#3a3550";

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
      <Text
        fz={14}
        fw={700}
        c={props.eyebrowColor ?? "grape.3"}
        tt="uppercase"
        style={{ letterSpacing: 3 }}
      >
        {props.eyebrow}
      </Text>
    ) : (
      props.eyebrow
    );

  return (
    <Box
      p={{ base: 20, sm: 28 }}
      mb={props.mb ?? 24}
      style={{
        borderRadius: 16,
        background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
        border: `1px solid ${HERO_BORDER}`,
      }}
    >
      <Flex
        direction={{ base: "column", sm: "row" }}
        gap="md"
        align={{ base: "stretch", sm: "center" }}
        justify="space-between"
      >
        <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
          {eyebrow && <Box mb={8}>{eyebrow}</Box>}
          <Group gap={10} wrap="wrap" align="center">
            <Text
              component="h1"
              c="white"
              fw={800}
              fz={{ base: 32, sm: 44 }}
              style={{ lineHeight: 1.1, margin: 0 }}
            >
              {props.title}
            </Text>
            {props.titleSuffix}
          </Group>
          {props.subtitle && (
            <Text fz={{ base: 14, sm: 16 }} c="gray.4" mt={8} maw={680}>
              {props.subtitle}
            </Text>
          )}
        </Box>
        {props.aside && <Box style={{ flexShrink: 0 }}>{props.aside}</Box>}
      </Flex>
      {props.children && <Box mt={20}>{props.children}</Box>}
    </Box>
  );
}

/** Standard hero stat chip (value over an uppercase label). */
export function HeroStat(props: { value: React.ReactNode; label: string; gold?: boolean }) {
  return (
    <Box
      px={16}
      py={10}
      style={{
        borderRadius: 12,
        background: "rgba(0,0,0,0.35)",
        border: `1px solid ${HERO_BORDER}`,
        minWidth: 96,
      }}
    >
      <Text fz={28} fw={800} c={props.gold ? "#F5C842" : "white"} lh={1.1}>
        {props.value}
      </Text>
      <Text fz={14} fw={600} c="dimmed" tt="uppercase" mt={2} style={{ letterSpacing: 0.5 }}>
        {props.label}
      </Text>
    </Box>
  );
}
