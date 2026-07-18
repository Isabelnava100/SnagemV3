import {
  Avatar,
  Flex,
  Group,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../../../context/AuthContext";
import { getItemImageURL } from "../../../../helpers";
import { getItems } from "../../../../queries/dashboard";
import { ItemUsedBlock } from "../../types";
import { ForumPanel, GameResultText, PanelHint } from "../ui";

export interface ItemSelection {
  itemId: string;
  qty: number;
  note: string;
}

const isBall = (category: string) => category.toLowerCase().includes("ball");

/** Locked "Used Items" panel shown when editing a published post. */
export function UsedItemsPanel(props: { items: ItemUsedBlock[] }) {
  if (!props.items.length) return null;
  return (
    <ForumPanel title="Used Items" mt={16}>
      <PanelHint>These items have been used.</PanelHint>
      <Stack gap={6}>
        {props.items.map((item, i) => (
          <Group key={`${item.itemId}${i}`} gap={8}>
            <Avatar src={getItemImageURL(item.filePath)} alt={item.name} size={24} />
            <Text fz={14} c="white">
              {item.name} x{item.qty}
            </Text>
          </Group>
        ))}
      </Stack>
    </ForumPanel>
  );
}

/**
 * "Use Items" composer panel: quantity steppers against the user's inventory,
 * inline error state when a quantity can't be used, and a description box for
 * item types that need one (board 18).
 */
export default function UseItemsPanel(props: {
  value: ItemSelection[];
  onChange: (next: ItemSelection[]) => void;
  /** Active boss battle blocks ball usage for non-excluded players. */
  ballsBlocked?: boolean;
}) {
  const { user } = useAuth();
  const { value, onChange } = props;
  const [search, setSearch] = React.useState("");

  const { data: inventory } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user,
  });

  const setQty = (itemId: string, qty: number) => {
    const existing = value.find((v) => v.itemId === itemId);
    if (qty <= 0) {
      onChange(value.filter((v) => v.itemId !== itemId));
      return;
    }
    if (existing) {
      onChange(value.map((v) => (v.itemId === itemId ? { ...v, qty } : v)));
    } else {
      onChange([...value, { itemId, qty, note: "" }]);
    }
  };

  const items = inventory ?? [];

  const ownedItems = items.filter((item) => item.quantity > 0);
  const q = search.trim().toLowerCase();
  const shownItems = q
    ? ownedItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
    : ownedItems;

  // Items the player has chosen to use (qty > 0), for the confirmation summary.
  const usedSummary = value
    .filter((v) => v.qty > 0)
    .map((v) => ({ selection: v, item: items.find((i) => i.id === v.itemId) }))
    .filter((entry) => !!entry.item);

  return (
    <ForumPanel title="Use Items" mt={16}>
      <PanelHint>
        The selection of certain items will open an additional menu below. Any used item cannot
        be recovered without admin intervention.
      </PanelHint>
      <TextInput
        placeholder="Search items by name or category"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        size="xs"
        mb={6}
        styles={{ input: { background: "#2E2D2E" } }}
      />
      <Flex justify="space-between" px={4} mb={4}>
        <Text fz={14} fw={700} c="white" tt="uppercase">
          Items
        </Text>
        <Text fz={14} fw={700} c="white" tt="uppercase">
          Qty to use
        </Text>
      </Flex>
      <ScrollArea.Autosize mah={180} bg="#211f21" style={{ borderRadius: 8 }}>
        {/* Extra right padding so the scrollbar never overlaps the qty steppers. */}
        <Stack gap={2} pt={6} pb={6} pl={6} pr={16}>
          {shownItems
            .map((item) => {
              const selection = value.find((v) => v.itemId === item.id);
              const qty = selection?.qty ?? 0;
              const overLimit = qty > item.quantity;
              const blocked = !!props.ballsBlocked && isBall(item.category);
              return (
                <Stack key={item.id} gap={2}>
                  <Flex justify="space-between" align="center" gap={8}>
                    <Group gap={6} wrap="nowrap">
                      <Avatar src={getItemImageURL(item.filePath)} alt={item.name} size={22} />
                      <Text fz={14} c={blocked ? "dimmed" : "white"}>
                        {item.name} x{item.quantity}
                      </Text>
                    </Group>
                    <NumberInput
                      value={qty}
                      onChange={(v) => setQty(item.id, Number(v) || 0)}
                      min={0}
                      max={item.quantity}
                      clampBehavior="strict"
                      w={72}
                      size="xs"
                      disabled={blocked}
                      error={overLimit}
                      styles={{ input: { background: "#2E2D2E" } }}
                    />
                  </Flex>
                  {blocked && (
                    <GameResultText>This item cannot be used in a team battle.</GameResultText>
                  )}
                  {overLimit && (
                    <GameResultText>
                      You only have {item.quantity} of this item. Lower the quantity.
                    </GameResultText>
                  )}
                </Stack>
              );
            })}
          {!shownItems.length && (
            <Text fz={14} c="dimmed" p={6}>
              {!ownedItems.length
                ? "Your bag is empty."
                : "No items match your search."}
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>

      {usedSummary.length > 0 && (
        <Stack gap={6} mt={10} p={10} bg="#211f21" style={{ borderRadius: 8 }}>
          <Group gap={6} wrap="nowrap">
            <IconAlertTriangle size={16} color="#f0a500" />
            <Text fz={14} fw={700} c="white">
              These items will be used up in your post
            </Text>
          </Group>
          {usedSummary.map(({ selection, item }) => (
            <Group key={selection.itemId} gap={8} wrap="nowrap">
              <Avatar src={getItemImageURL(item!.filePath)} alt={item!.name} size={22} />
              <Text fz={14} c="white">
                {item!.name} x{selection.qty}
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </ForumPanel>
  );
}
