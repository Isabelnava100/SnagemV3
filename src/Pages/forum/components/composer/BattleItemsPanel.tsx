import { Anchor, Checkbox, Stack, Text } from "@mantine/core";
import React from "react";
import { Link } from "react-router-dom";
import { Item } from "../../../../components/types/typesUsed";
import { battleItemLabel, isBattleItem } from "../../../../lib/battleItems";
import { ForumPanel } from "../ui";

/**
 * Consumable battle items (X Attack / Dire Hit / X Defense / X Speed and Gems)
 * used on THIS post. Unlike a Z-Move these are spent: pick which owned battle
 * items to spend, each applies its one-post effect and is used up. A Gem only
 * helps when its type matches the fighter's own type.
 */
export default function BattleItemsPanel(props: {
  items: Item[];
  value: { itemId: string; name: string }[];
  onChange: (v: { itemId: string; name: string }[]) => void;
}) {
  const { items, value, onChange } = props;
  const [enabled, setEnabled] = React.useState(false);

  const owned = React.useMemo(
    () => items.filter((i) => Number(i.quantity) > 0 && isBattleItem(i.id)),
    [items]
  );

  React.useEffect(() => {
    if (!enabled && value.length) onChange([]);
  }, [enabled, value.length, onChange]);

  if (!owned.length) return null;

  const toggle = (item: Item, checked: boolean) => {
    if (checked) onChange([...value.filter((v) => v.itemId !== item.id), { itemId: item.id, name: item.name }]);
    else onChange(value.filter((v) => v.itemId !== item.id));
  };

  return (
    <ForumPanel title="Battle Items">
      <Stack gap={8}>
        <Anchor component={Link} to="/Library?tab=battle" fz={14} c="grape.3">
          How battle items work →
        </Anchor>
        <Checkbox
          label="Use battle items this post? (X items, Dire Hit, Gems. These are used up.)"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
          color="grape"
          styles={{ label: { color: "white", fontSize: 14 } }}
        />
        {enabled && (
          <Stack gap={6}>
            {owned.map((item) => (
              <Checkbox
                key={item.id}
                label={`${item.name}: ${battleItemLabel(item.id) ?? "battle item"} (×${item.quantity})`}
                checked={value.some((v) => v.itemId === item.id)}
                onChange={(e) => toggle(item, e.currentTarget.checked)}
                color="grape"
                styles={{ label: { color: "white", fontSize: 14 } }}
              />
            ))}
            {value.length > 0 && (
              <Text fz={13} c="grape.3" role="status" aria-live="polite">
                {value.length} battle item{value.length > 1 ? "s" : ""} will be spent this post.
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </ForumPanel>
  );
}
