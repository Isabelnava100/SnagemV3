import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Combobox,
  Group,
  Input,
  InputBase,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  useCombobox,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
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
 * Controlled item combobox. Unlike a plain Select it stays open until an
 * option is submitted (closeOnClickOutside is off), so on mobile you can
 * scroll the list without a stray tap dismissing it. Tap the field again
 * or press Escape to close without choosing.
 */
function ItemPicker({
  value,
  onChange,
  placeholder,
  size,
  w,
}: {
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  size?: string;
  w?: number | string;
}) {
  const [opened, setOpened] = React.useState(false);
  // Controlled open state: honor requests to open, ignore Mantine's
  // auto-close on outside click/blur so scrolling the list on mobile can't
  // dismiss it. It only closes on an explicit toggle or an option submit.
  const combobox = useCombobox({
    opened,
    onOpenedChange: (o) => {
      if (o) setOpened(true);
    },
  });
  const [search, setSearch] = React.useState("");

  const selected = value ? itemData.find((i) => i.id === value) : undefined;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const opts = itemData
      .map((item) => ({ value: item.id, label: item.name, filePath: item.filePath }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const list = q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
    return list.slice(0, 100);
  }, [search]);

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(val) => {
        onChange(val);
        setSearch("");
        setOpened(false);
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          size={size}
          w={w}
          aria-label={placeholder}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          leftSection={
            selected ? (
              <Avatar src={getItemImageURL(selected.filePath)} alt={`${selected.name} icon`} size={22} />
            ) : undefined
          }
          onClick={() => setOpened((o) => !o)}
          styles={{ input: { background: "#2E2D2E" } }}
        >
          {selected ? (
            <Text fz={size === "xs" ? 12 : 14} c="white" truncate>
              {selected.name}
            </Text>
          ) : (
            <Input.Placeholder>{placeholder}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search items"
        />
        <Combobox.Options mah={320} style={{ overflowY: "auto" }}>
          {filtered.length ? (
            filtered.map((o) => (
              <Combobox.Option value={o.value} key={o.value}>
                <Group gap={8} wrap="nowrap">
                  <Avatar src={getItemImageURL(o.filePath)} alt={o.label} size={26} />
                  <Text fz={14} c="white">
                    {o.label}
                  </Text>
                </Group>
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>No items found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

/**
 * Mystery box configuration (Q8): pick which catalog item acts as a box
 * (its sprite is the box image), then define the reward pool with drop
 * weights. Opening happens through the openMysteryBox Cloud Function.
 * Custom uploaded box art is deferred until boxes get their own art pipeline.
 */
export default function MysteryBoxes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: boxes, isPending } = useQuery({
    queryKey: ["mystery-boxes"],
    queryFn: getMysteryBoxes,
  });

  const [boxItemId, setBoxItemId] = React.useState<string | null>(null);
  const [boxName, setBoxName] = React.useState("");
  const [pool, setPool] = React.useState<MysteryBoxPoolEntry[]>([]);
  const [archived, setArchived] = React.useState(false);
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");

  // Pool-entry draft controls
  const [entryKind, setEntryKind] = React.useState<"item" | "currency">("item");
  const [entryRef, setEntryRef] = React.useState<string | null>(null);
  const [entryQty, setEntryQty] = React.useState(1);
  const [entryWeight, setEntryWeight] = React.useState(10);

  React.useEffect(() => {
    if (!boxItemId || loadedFor === boxItemId) return;
    setPool(boxes?.[boxItemId]?.pool ?? []);
    // Prefill the name from a saved box, else default to the item's own name.
    const itemName = itemData.find((i) => i.id === boxItemId)?.name ?? "";
    setBoxName(boxes?.[boxItemId]?.name || itemName);
    setArchived(!!boxes?.[boxItemId]?.archived);
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
      await saveMysteryBox(boxItemId!, { name: boxName.trim(), pool, archived });
      await logAuditEvent({
        action: "mysterybox.edit",
        ...actorFrom(user),
        targetPath: `admin/mystery_boxes/${boxItemId}`,
        details: { name: boxName.trim(), rewards: pool.length, archived },
      });
    },
    onSuccess: () => {
      setMessage("Box saved. It can now be opened.");
      queryClient.invalidateQueries({ queryKey: ["mystery-boxes"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (next: boolean) => {
      await saveMysteryBox(boxItemId!, { name: boxName.trim(), pool, archived: next });
      await logAuditEvent({
        action: "mysterybox.edit",
        ...actorFrom(user),
        targetPath: `admin/mystery_boxes/${boxItemId}`,
        details: { name: boxName.trim(), archived: next },
      });
      return next;
    },
    onSuccess: (next) => {
      setArchived(next);
      setMessage(
        next
          ? "Box archived. It can no longer be given out, but members who own one can still open it."
          : "Box unarchived. It can be given out again."
      );
      queryClient.invalidateQueries({ queryKey: ["mystery-boxes"] });
    },
  });

  if (isPending) return <SectionLoader />;

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const configuredIds = Object.keys(boxes ?? {});
  const activeIds = configuredIds.filter((id) => !boxes?.[id]?.archived);
  const archivedIds = configuredIds.filter((id) => boxes?.[id]?.archived);

  return (
    <Stack gap={12} maw={640}>
      <Title order={2} c="white" size={24} fw={400}>
        Mystery Boxes
      </Title>
      <Text fz={13} c="dimmed">
        Choose which item acts as a mystery box (its sprite is the box image), then configure the
        reward pool and drop rates. Players open boxes from Your Items on the dashboard.
      </Text>
      {!!activeIds.length && (
        <Group gap={6}>
          <Text fz={12} c="dimmed">
            Active boxes:
          </Text>
          {activeIds.map((id) => (
            <Badge
              key={id}
              variant="light"
              color="cyan.0"
              style={{ cursor: "pointer" }}
              onClick={() => setBoxItemId(id)}
            >
              {boxes?.[id]?.name || id}
            </Badge>
          ))}
        </Group>
      )}
      {!!archivedIds.length && (
        <Group gap={6}>
          <Text fz={12} c="dimmed">
            Archived (still openable, not given out):
          </Text>
          {archivedIds.map((id) => (
            <Badge
              key={id}
              variant="outline"
              color="gray"
              style={{ cursor: "pointer" }}
              onClick={() => setBoxItemId(id)}
            >
              {boxes?.[id]?.name || id}
            </Badge>
          ))}
        </Group>
      )}
      <ItemPicker
        placeholder="Pick the box item (search the catalog)"
        value={boxItemId}
        onChange={setBoxItemId}
      />

      {boxItemId && (
        <Stack gap={10}>
          <Group gap={8}>
            <Avatar
              src={getItemImageURL(itemData.find((i) => i.id === boxItemId)?.filePath ?? "")}
              alt={`${itemData.find((i) => i.id === boxItemId)?.name ?? "Box"} icon`}
              size={34}
            />
            <Text c="white" fw={600}>
              {itemData.find((i) => i.id === boxItemId)?.name}
            </Text>
          </Group>

          <TextInput
            label="Box name"
            required
            placeholder="Name shown to players (e.g. Starter Surprise Box)"
            value={boxName}
            onChange={(e) => setBoxName(e.currentTarget.value)}
            maxLength={60}
            styles={{ input: { background: "#2E2D2E" } }}
          />

          {/* Pool */}
          <Text fz={13} fw={700} c="white" tt="uppercase">
            Reward pool {totalWeight > 0 && `(total weight ${totalWeight})`}
          </Text>
          <Stack gap={6}>
            {pool.map((entry, index) => (
              <Group key={index} gap={8}>
                {entry.kind === "item" && entry.filePath && (
                  <Avatar src={getItemImageURL(entry.filePath)} alt={entry.name} size={22} />
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
                No rewards yet. Add at least one below.
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
            {entryKind === "item" ? (
              <ItemPicker
                placeholder="Search items"
                value={entryRef}
                onChange={setEntryRef}
                size="xs"
                w={200}
              />
            ) : (
              <Select
                placeholder="Currency"
                data={CURRENCY_OPTIONS}
                value={entryRef}
                onChange={setEntryRef}
                w={200}
                size="xs"
                styles={{ input: { background: "#2E2D2E" } }}
              />
            )}
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

          <Text fz={12} c="dimmed">
            Weight sets how common a reward is relative to the others, not a
            percentage. A reward with weight 30 is picked three times as often as
            one with weight 10. The badge next to each reward shows the resulting
            chance once every weight is added up, so you can use any numbers you
            like (they do not need to total 100).
          </Text>

          {archived && (
            <Text fz={12} c="orange.3">
              This box is archived. It cannot be given out, but members who already own one can
              still open it.
            </Text>
          )}
          {message && (
            <Text fz={13} c="green.0" role="status" aria-live="polite">
              {message}
            </Text>
          )}
          <Group gap={10}>
            <GradientButtonPrimary
              radius="xl"
              w="fit-content"
              disabled={!pool.length || !boxName.trim()}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutateAsync()}
            >
              Save Mystery Box
            </GradientButtonPrimary>
            {/* Archiving keeps the record so existing owners can still open it. */}
            {boxes?.[boxItemId] && (
              <Button
                variant="light"
                color={archived ? "cyan" : "orange"}
                radius="xl"
                loading={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate(!archived)}
              >
                {archived ? "Unarchive" : "Archive"}
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
