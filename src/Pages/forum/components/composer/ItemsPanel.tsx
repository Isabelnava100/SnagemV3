import {
  Avatar,
  Flex,
  Group,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
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
            <Avatar src={getItemImageURL(item.filePath)} size={24} />
            <Text fz={13} c="white">
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

  const setNote = (itemId: string, note: string) => {
    onChange(value.map((v) => (v.itemId === itemId ? { ...v, note } : v)));
  };

  const items = inventory ?? [];
  const selectedWithNote = value.filter((v) => {
    const item = items.find((i) => i.id === v.itemId);
    return item && !isBall(item.category);
  });

  return (
    <ForumPanel title="Use Items" mt={16}>
      <PanelHint>
        The selection of certain items will open an additional menu below. Any used item cannot
        be recovered without admin intervention.
      </PanelHint>
      <Flex justify="space-between" px={4} mb={4}>
        <Text fz={11} fw={700} c="white" tt="uppercase">
          Items
        </Text>
        <Text fz={11} fw={700} c="white" tt="uppercase">
          Qty to use
        </Text>
      </Flex>
      <ScrollArea.Autosize mah={180} bg="#211f21" style={{ borderRadius: 8 }}>
        <Stack gap={2} p={6}>
          {items
            .filter((item) => item.quantity > 0)
            .map((item) => {
              const selection = value.find((v) => v.itemId === item.id);
              const qty = selection?.qty ?? 0;
              const overLimit = qty > item.quantity;
              const blocked = !!props.ballsBlocked && isBall(item.category);
              return (
                <Stack key={item.id} gap={2}>
                  <Flex justify="space-between" align="center" gap={8}>
                    <Group gap={6} wrap="nowrap">
                      <Avatar src={getItemImageURL(item.filePath)} size={22} />
                      <Text fz={13} c={blocked ? "dimmed" : "white"}>
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
                      You only have {item.quantity} of this item — lower the quantity.
                    </GameResultText>
                  )}
                </Stack>
              );
            })}
          {!items.filter((i) => i.quantity > 0).length && (
            <Text fz={13} c="dimmed" p={6}>
              Your bag is empty.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>

      {selectedWithNote.length > 0 && (
        <Stack gap={8} mt={10}>
          <Text fz={12} c="dimmed">
            Choose how to use your item.
          </Text>
          {selectedWithNote.map((selection) => {
            const item = items.find((i) => i.id === selection.itemId);
            return (
              <Textarea
                key={selection.itemId}
                label={item?.name}
                placeholder={`Describe how ${item?.name ?? "this item"} is used in your post.`}
                value={selection.note}
                onChange={(e) => setNote(selection.itemId, e.currentTarget.value)}
                autosize
                minRows={2}
                size="xs"
                styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
              />
            );
          })}
        </Stack>
      )}
    </ForumPanel>
  );
}
