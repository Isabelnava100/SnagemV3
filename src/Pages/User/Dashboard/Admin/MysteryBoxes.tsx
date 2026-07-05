import {
  ActionIcon,
  Avatar,
  Badge,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { itemData } from "../../../../data/item";
import { getItemImageURL } from "../../../../helpers";
import {
  MysteryBoxPoolEntry,
  getMysteryBoxes,
  saveMysteryBox,
} from "../../../../queries/game";

const CURRENCY_OPTIONS = [
  { value: "pokecoin", label: "Poke Coin" },
  { value: "gengarcoin", label: "Gengar Coin" },
  { value: "snagemblem", label: "Snag Emblems" },
];

/**
 * Mystery box configuration (Q8): pick which catalog item acts as a box
 * (its sprite is the box image), then define the reward pool with drop
 * weights. Opening happens through the openMysteryBox Cloud Function.
 * Custom uploaded box art is deferred until boxes get their own art pipeline.
 */
export default function MysteryBoxes() {
  const queryClient = useQueryClient();
  const { data: boxes, isPending } = useQuery({
    queryKey: ["mystery-boxes"],
    queryFn: getMysteryBoxes,
  });

  const [boxItemId, setBoxItemId] = React.useState<string | null>(null);
  const [pool, setPool] = React.useState<MysteryBoxPoolEntry[]>([]);
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");

  // Pool-entry draft controls
  const [entryKind, setEntryKind] = React.useState<"item" | "currency">("item");
  const [entryRef, setEntryRef] = React.useState<string | null>(null);
  const [entryQty, setEntryQty] = React.useState(1);
  const [entryWeight, setEntryWeight] = React.useState(10);

  // The catalog is ordered balls-first; sort alphabetically so browsing the
  // dropdown (without searching) surfaces the whole catalog, not just balls.
  const itemOptions = React.useMemo(
    () =>
      itemData
        .map((item) => ({ value: item.id, label: item.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  // Visual option: show the item's sprite next to its name in the dropdown.
  const renderItemOption = ({ option }: { option: { value: string; label: string } }) => {
    const item = itemData.find((i) => i.id === option.value);
    return (
      <Group gap={8} wrap="nowrap">
        {item && <Avatar src={getItemImageURL(item.filePath)} size={26} />}
        <Text fz={14} c="white">
          {option.label}
        </Text>
      </Group>
    );
  };

  React.useEffect(() => {
    if (!boxItemId || loadedFor === boxItemId) return;
    setPool(boxes?.[boxItemId]?.pool ?? []);
    setLoadedFor(boxItemId);
    setMessage("");
  }, [boxItemId, boxes, loadedFor]);

  const addEntry = () => {
    if (!entryRef) return;
    const info = itemData.find((i) => i.id === entryRef);
    const currency = CURRENCY_OPTIONS.find((c) => c.value === entryRef);
    setPool([
      ...pool,
      entryKind === "item"
        ? {
            kind: "item",
            refId: entryRef,
            name: info?.name ?? entryRef,
            filePath: info?.filePath ?? "",
            category: info?.category ?? "other-item",
            qty: entryQty,
            weight: entryWeight,
          }
        : {
            kind: "currency",
            refId: entryRef,
            name: currency?.label ?? entryRef,
            qty: entryQty,
            weight: entryWeight,
          },
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const info = itemData.find((i) => i.id === boxItemId);
      await saveMysteryBox(boxItemId!, { name: info?.name ?? boxItemId!, pool });
    },
    onSuccess: () => {
      setMessage("Box saved — it can now be opened.");
      queryClient.invalidateQueries({ queryKey: ["mystery-boxes"] });
    },
  });

  if (isPending) return <SectionLoader />;

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const configuredIds = Object.keys(boxes ?? {});

  return (
    <Stack gap={12} maw={640}>
      <Title order={2} c="white" size={24} fw={400}>
        Mystery Boxes
      </Title>
      <Text fz={13} c="dimmed">
        Choose which item acts as a mystery box (its sprite is the box image), then configure the
        reward pool and drop rates. Players open boxes from Your Items on the dashboard.
      </Text>
      {!!configuredIds.length && (
        <Group gap={6}>
          <Text fz={12} c="dimmed">
            Configured boxes:
          </Text>
          {configuredIds.map((id) => (
            <Badge
              key={id}
              variant="light"
              color="cyan.0"
              style={{ cursor: "pointer" }}
              onClick={() => setBoxItemId(id)}
            >
              {boxes?.[id]?.name ?? id}
            </Badge>
          ))}
        </Group>
      )}
      <Select
        placeholder="Pick the box item (search the catalog)"
        searchable
        limit={100}
        data={itemOptions}
        renderOption={renderItemOption}
        leftSection={
          boxItemId ? (
            <Avatar
              src={getItemImageURL(itemData.find((i) => i.id === boxItemId)?.filePath ?? "")}
              size={22}
            />
          ) : undefined
        }
        value={boxItemId}
        onChange={setBoxItemId}
        maxDropdownHeight={320}
        styles={{ input: { background: "#2E2D2E" } }}
      />

      {boxItemId && (
        <Stack gap={10}>
          <Group gap={8}>
            <Avatar
              src={getItemImageURL(itemData.find((i) => i.id === boxItemId)?.filePath ?? "")}
              size={34}
            />
            <Text c="white" fw={600}>
              {itemData.find((i) => i.id === boxItemId)?.name}
            </Text>
          </Group>

          {/* Pool */}
          <Text fz={13} fw={700} c="white" tt="uppercase">
            Reward pool {totalWeight > 0 && `(total weight ${totalWeight})`}
          </Text>
          <Stack gap={6}>
            {pool.map((entry, index) => (
              <Group key={index} gap={8}>
                {entry.kind === "item" && entry.filePath && (
                  <Avatar src={getItemImageURL(entry.filePath)} size={22} />
                )}
                <Text fz={13} c="white">
                  {entry.qty}x {entry.name}
                </Text>
                <Badge size="xs" variant="outline" color="gray">
                  {totalWeight > 0
                    ? `${Math.round((entry.weight / totalWeight) * 100)}%`
                    : `${entry.weight}`}
                </Badge>
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  onClick={() => setPool(pool.filter((_, i) => i !== index))}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
            {!pool.length && (
              <Text fz={12} c="dimmed">
                No rewards yet — add at least one below.
              </Text>
            )}
          </Stack>

          {/* Add entry */}
          <Group gap={8} wrap="wrap">
            <Select
              data={[
                { value: "item", label: "Item" },
                { value: "currency", label: "Currency" },
              ]}
              value={entryKind}
              onChange={(v) => {
                setEntryKind((v as "item" | "currency") ?? "item");
                setEntryRef(null);
              }}
              w={110}
              size="xs"
              styles={{ input: { background: "#2E2D2E" } }}
            />
            <Select
              placeholder={entryKind === "item" ? "Search items" : "Currency"}
              searchable={entryKind === "item"}
              limit={100}
              data={entryKind === "item" ? itemOptions : CURRENCY_OPTIONS}
              renderOption={entryKind === "item" ? renderItemOption : undefined}
              maxDropdownHeight={320}
              value={entryRef}
              onChange={setEntryRef}
              w={200}
              size="xs"
              styles={{ input: { background: "#2E2D2E" } }}
            />
            <Group gap={4}>
              <Text fz={12} c="white">
                Qty:
              </Text>
              <NumberInput
                value={entryQty}
                onChange={(v) => setEntryQty(Math.max(1, Number(v) || 1))}
                min={1}
                w={70}
                size="xs"
                styles={{ input: { background: "#2E2D2E" } }}
              />
            </Group>
            <Group gap={4}>
              <Text fz={12} c="white">
                Weight:
              </Text>
              <NumberInput
                value={entryWeight}
                onChange={(v) => setEntryWeight(Math.max(1, Number(v) || 1))}
                min={1}
                w={70}
                size="xs"
                styles={{ input: { background: "#2E2D2E" } }}
              />
            </Group>
            <GradientButtonSecondary size="xs" radius="xl" onClick={addEntry}>
              Add to Pool
            </GradientButtonSecondary>
          </Group>

          {message && (
            <Text fz={13} c="green.0">
              {message}
            </Text>
          )}
          <GradientButtonPrimary
            radius="xl"
            w="fit-content"
            disabled={!pool.length}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutateAsync()}
          >
            Save Mystery Box
          </GradientButtonPrimary>
        </Stack>
      )}
    </Stack>
  );
}
