import { Box, HoverCard, Text } from "@mantine/core";
import { ReactElement } from "react";
import {
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_OBTAIN,
  rarityForItem,
} from "../../lib/itemRarity";
import { ItemSource } from "../../lib/itemSources";

/** The minimum an item needs to show its info card. */
export interface HoverItem {
  id: string;
  name: string;
  category?: string;
  quantity?: number;
}

/**
 * Wraps any item sprite/tile in a hover info card: name, category, quantity,
 * obtainability rarity tier and how it's obtained. Pass `sources` (from
 * `useItemSources()`) on pages that already load them to also list where the
 * item drops; omit it elsewhere so no extra reads are triggered. The card
 * inherits the theme's viewport-safe overlay defaults, so it never renders off
 * screen.
 *
 * `children` must be a single element that accepts a ref (Avatar, Image, Box).
 */
export function ItemHoverCard(props: {
  item: HoverItem;
  sources?: ItemSource[];
  children: ReactElement;
  width?: number;
}) {
  const { item, sources, children, width = 250 } = props;
  const r = rarityForItem(item.id);
  const rarityText = r === 0 ? RARITY_LABELS[0] : `${"★".repeat(r)} ${RARITY_LABELS[r]}`;

  return (
    <HoverCard width={width} shadow="md" openDelay={120} closeDelay={80} withArrow position="top">
      <HoverCard.Target>{children}</HoverCard.Target>
      <HoverCard.Dropdown style={{ background: "#141318", border: "1px solid #2a2637" }}>
        <Text fz={14} fw={700} c="#fff">
          {item.name}
          {typeof item.quantity === "number" ? ` ×${item.quantity}` : ""}
        </Text>
        {item.category && (
          <Text fz={11} c="#12B7B6" tt="uppercase" mt={2} style={{ letterSpacing: "0.06em" }}>
            {item.category}
          </Text>
        )}
        <Text fz={12} fw={700} c={RARITY_COLORS[r]} mt={4}>
          {rarityText}
        </Text>
        <Text fz={12} c="dimmed" mt={2}>
          {RARITY_OBTAIN[r]}
        </Text>
        {sources && sources.length > 0 && (
          <Box mt={8}>
            <Text fz={11} fw={700} c="#FFD074" tt="uppercase" style={{ letterSpacing: "0.1em" }}>
              Found at
            </Text>
            {sources.map((s, i) => (
              <Text key={i} fz={12} c="#fff" mt={2}>
                {s.label}
              </Text>
            ))}
          </Box>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
