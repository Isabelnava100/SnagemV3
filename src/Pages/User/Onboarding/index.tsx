import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconTrash, IconUpload } from "@tabler/icons-react";
import React from "react";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { itemData } from "../../../data/item";
import { pokemonData } from "../../../data/pokemon";
import { getItemImageURL, getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../../helpers";
import { MAX_LEVEL, xpForLevel } from "../../../lib/leveling";
import {
  ImportEntries,
  ImportItem,
  ImportPokemon,
  completeOnboarding,
  emptyEntries,
  getImportRequest,
  saveImportDraft,
  submitImportRequest,
} from "../../../queries/imports";
import { downloadCsv, parseImportCsv } from "./csv";

const CURRENCY_LABELS: { key: keyof ImportEntries["currency"]; label: string }[] = [
  { key: "pokecoin", label: "Poke Coins" },
  { key: "gengarcoin", label: "Gengar Coins" },
  { key: "snagemblem", label: "Snag Emblems" },
];

const pokemonByName = new Map(pokemonData.map((p) => [p.name.toLowerCase(), p]));
const itemByName = new Map(itemData.map((i) => [i.name.toLowerCase(), i]));

export default function Onboarding() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();

  const { data: request, isPending } = useQuery({
    queryKey: ["import-request", uid],
    queryFn: () => getImportRequest(uid as string),
    enabled: !!uid,
  });

  const [entries, setEntries] = React.useState<ImportEntries>(emptyEntries());
  const [note, setNote] = React.useState("");
  const [seeded, setSeeded] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [uploadInfo, setUploadInfo] = React.useState("");
  const [completeOpen, { open: openComplete, close: closeComplete }] = useDisclosure(false);

  React.useEffect(() => {
    if (isPending || seeded) return;
    if (request) {
      setEntries({
        currency: request.currency ?? emptyEntries().currency,
        items: request.items ?? [],
        pokemon: request.pokemon ?? [],
      });
      setNote(request.note ?? "");
    }
    setSeeded(true);
  }, [request, isPending, seeded]);

  const status = request?.status ?? "draft";
  const locked = status === "pending" || status === "completed";

  const saveDraft = useMutation({
    mutationFn: (next: ImportEntries) => saveImportDraft(uid as string, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-request", uid] }),
  });

  // Persist after each change so a returning member never loses progress.
  const update = (next: ImportEntries) => {
    setEntries(next);
    if (uid) saveDraft.mutate(next);
  };

  const submit = useMutation({
    mutationFn: () => submitImportRequest(uid as string, entries, note),
    onSuccess: () => {
      setMessage("Submitted for review. A staff member will approve it soon.");
      queryClient.invalidateQueries({ queryKey: ["import-request", uid] });
    },
  });

  const finish = useMutation({
    mutationFn: () => completeOnboarding(uid as string),
    onSuccess: () => {
      closeComplete();
      queryClient.invalidateQueries({ queryKey: ["import-request", uid] });
    },
  });

  if (isPending || !seeded) return <SectionLoader />;

  const totalCount =
    entries.items.length +
    entries.pokemon.length +
    CURRENCY_LABELS.reduce((n, c) => n + (entries.currency[c.key] > 0 ? 1 : 0), 0);

  return (
    <Box maw={860} mx="auto" p={{ base: 16, sm: 24 }}>
      <Stack gap={16}>
        <Stack gap={4}>
          <Title order={1} c="white" size={28} fw={600}>
            Welcome back! Import your collection
          </Title>
          <Text fz={14} c="dimmed">
            Returning from the Gaia guild? Add the currency, items, and Pokemon you had so a staff
            member can restore them. Add things by hand below, or use the spreadsheet if you have a
            lot. You can come back to this page any time until you mark it complete.
          </Text>
        </Stack>

        {status === "pending" && (
          <Alert color="gold.1" title="Waiting for approval">
            You submitted your import for review. You can see it below. Once a staff member approves
            it, the items land in your account and you can add more or finish.
          </Alert>
        )}
        {status === "rejected" && request?.reviewerNote && (
          <Alert color="red" title="A change is needed">
            {request.reviewerNote}
          </Alert>
        )}
        {status === "granted" && (
          <Alert color="green" title="Import approved" icon={<IconCheck size={18} />}>
            Your last batch was added to your account. Add more below, or mark your import complete
            when you are done.
          </Alert>
        )}

        {locked ? (
          <SubmittedPreview entries={entries} />
        ) : (
          <>
            <CurrencySection
              currency={entries.currency}
              onChange={(currency) => update({ ...entries, currency })}
            />
            <ItemsSection
              items={entries.items}
              onChange={(items) => update({ ...entries, items })}
            />
            <PokemonSection
              pokemon={entries.pokemon}
              onChange={(pokemon) => update({ ...entries, pokemon })}
            />
            <BulkUpload
              onImported={(added, info) => {
                update({
                  ...entries,
                  items: [...entries.items, ...added.items],
                  pokemon: [...entries.pokemon, ...added.pokemon],
                });
                setUploadInfo(info);
              }}
            />
            {uploadInfo && (
              <Text fz={13} c="dimmed">
                {uploadInfo}
              </Text>
            )}

            <Divider />
            <Textarea
              label="Note for the reviewer (optional)"
              placeholder="Anything the staff should know about your import"
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              autosize
              minRows={2}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />

            {message && (
              <Text fz={13} c="green.0" role="status" aria-live="polite">
                {message}
              </Text>
            )}

            <Group justify="space-between" wrap="wrap" gap={10}>
              <GradientButtonPrimary
                radius="xl"
                disabled={totalCount === 0}
                loading={submit.isPending}
                onClick={() => submit.mutateAsync()}
              >
                Submit for review
              </GradientButtonPrimary>
              <Button variant="subtle" color="gray" onClick={openComplete}>
                My import is complete
              </Button>
            </Group>
          </>
        )}

        {status === "completed" && (
          <Alert color="gray" title="Import complete">
            You have marked your import as complete, so this page is closed. If you still need
            something restored, contact a staff member.
          </Alert>
        )}
      </Stack>

      {completeOpen && (
        <CompleteConfirm
          loading={finish.isPending}
          onConfirm={() => finish.mutateAsync()}
          onClose={closeComplete}
        />
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <Paper p={16} radius={12} style={{ background: "#1E1D2080" }}>
      <Stack gap={12}>
        <Text c="white" fw={600}>
          {props.title}
        </Text>
        {props.children}
      </Stack>
    </Paper>
  );
}

function CurrencySection(props: {
  currency: ImportEntries["currency"];
  onChange: (c: ImportEntries["currency"]) => void;
}) {
  return (
    <SectionCard title="Currency">
      <Group gap={12} wrap="wrap">
        {CURRENCY_LABELS.map(({ key, label }) => (
          <NumberInput
            key={key}
            label={label}
            min={0}
            max={100000000}
            value={props.currency[key]}
            onChange={(v) => props.onChange({ ...props.currency, [key]: Math.max(0, Number(v) || 0) })}
            w={150}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
        ))}
      </Group>
    </SectionCard>
  );
}

function ItemsSection(props: { items: ImportItem[]; onChange: (i: ImportItem[]) => void }) {
  const [itemId, setItemId] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState(1);

  const options = React.useMemo(
    () =>
      itemData
        .map((i) => ({ value: i.id, label: i.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const add = () => {
    const item = itemData.find((i) => i.id === itemId);
    if (!item) return;
    props.onChange([
      ...props.items,
      { refId: item.id, name: item.name, filePath: item.filePath, category: item.category, qty },
    ]);
    setItemId(null);
    setQty(1);
  };

  return (
    <SectionCard title="Items">
      <Group align="flex-end" gap={10} wrap="wrap">
        <Select
          label="Item"
          placeholder="Search items"
          searchable
          limit={50}
          data={options}
          value={itemId}
          onChange={setItemId}
          w={240}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <NumberInput
          label="Qty"
          min={1}
          max={100000}
          value={qty}
          onChange={(v) => setQty(Math.max(1, Number(v) || 1))}
          w={90}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <GradientButtonSecondary radius="xl" disabled={!itemId} onClick={add}>
          Add item
        </GradientButtonSecondary>
      </Group>
      <Stack gap={6}>
        {props.items.map((it, i) => (
          <Group key={i} gap={8} wrap="nowrap">
            {it.filePath && <Avatar src={getItemImageURL(it.filePath)} alt={it.name} size={24} />}
            <Text fz={13} c="white">
              {it.qty}x {it.name}
            </Text>
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              onClick={() => props.onChange(props.items.filter((_, j) => j !== i))}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
        {!props.items.length && (
          <Text fz={12} c="dimmed">
            No items added yet.
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}

function PokemonSection(props: { pokemon: ImportPokemon[]; onChange: (p: ImportPokemon[]) => void }) {
  const [slug, setSlug] = React.useState<string | null>(null);
  const [gender, setGender] = React.useState<"M" | "F">("M");
  const [shiny, setShiny] = React.useState(false);
  const [level, setLevel] = React.useState(5);
  const [friendship, setFriendship] = React.useState(0);
  const [shadow, setShadow] = React.useState(0);
  const [purification, setPurification] = React.useState(0);

  const options = React.useMemo(
    () => pokemonData.map((p) => ({ value: p.slug, label: p.name })),
    []
  );

  const add = () => {
    const p = pokemonData.find((x) => x.slug === slug);
    if (!p) return;
    props.onChange([
      ...props.pokemon,
      {
        species: p.name,
        slug: p.slug,
        pokedex: String(Number(p.idx)),
        gender,
        shiny,
        level,
        friendship,
        shadow,
        purification,
      },
    ]);
    setSlug(null);
    setShiny(false);
    setLevel(5);
    setFriendship(0);
    setShadow(0);
    setPurification(0);
  };

  return (
    <SectionCard title="Pokemon">
      <Group align="flex-end" gap={10} wrap="wrap">
        <Select
          label="Species"
          placeholder="Search Pokemon"
          searchable
          limit={50}
          data={options}
          value={slug}
          onChange={setSlug}
          w={200}
          leftSection={
            slug ? (
              <Avatar
                src={getPokemonImageURL(slug)}
                alt=""
                size={22}
                imageProps={{ style: { imageRendering: "pixelated" } }}
              />
            ) : undefined
          }
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Select
          label="Gender"
          data={[
            { value: "M", label: "Male" },
            { value: "F", label: "Female" },
          ]}
          value={gender}
          onChange={(v) => setGender((v as "M" | "F") ?? "M")}
          w={100}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <NumberInput
          label="Level"
          min={1}
          max={MAX_LEVEL}
          value={level}
          onChange={(v) => setLevel(Math.max(1, Math.min(MAX_LEVEL, Number(v) || 1)))}
          w={90}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <NumberInput
          label="Friendship"
          min={0}
          max={255}
          value={friendship}
          onChange={(v) => setFriendship(Math.max(0, Math.min(255, Number(v) || 0)))}
          w={110}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <NumberInput
          label="Shadow"
          min={0}
          value={shadow}
          onChange={(v) => setShadow(Math.max(0, Number(v) || 0))}
          w={100}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <NumberInput
          label="Purification"
          min={0}
          value={purification}
          onChange={(v) => setPurification(Math.max(0, Number(v) || 0))}
          w={110}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Checkbox
          label="Shiny"
          checked={shiny}
          onChange={(e) => setShiny(e.currentTarget.checked)}
          styles={{ label: { color: "white" } }}
        />
        <GradientButtonSecondary radius="xl" disabled={!slug} onClick={add}>
          Add Pokemon
        </GradientButtonSecondary>
      </Group>
      <Stack gap={6}>
        {props.pokemon.map((p, i) => (
          <Group key={i} gap={8} wrap="nowrap">
            <Avatar
              src={getPokemonImageURL(p.slug)}
              alt={p.species}
              size={28}
              imageProps={{ style: { imageRendering: "pixelated" } }}
            >
              <img src={POKEMON_SPRITE_FALLBACK} alt="" width={20} height={20} />
            </Avatar>
            <Text fz={13} c="white">
              {p.species} · Lv {p.level} · {p.gender}
              {p.shiny ? " · Shiny" : ""}
            </Text>
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              onClick={() => props.onChange(props.pokemon.filter((_, j) => j !== i))}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
        {!props.pokemon.length && (
          <Text fz={12} c="dimmed">
            No Pokemon added yet.
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}

function BulkUpload(props: {
  onImported: (added: { items: ImportItem[]; pokemon: ImportPokemon[] }, info: string) => void;
}) {
  const itemsInput = React.useRef<HTMLInputElement>(null);
  const pokeInput = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, kind: "items" | "pokemon") => {
    const text = await file.text();
    const { items, pokemon, matched, skipped } = parseImportCsv(text, kind, {
      pokemonByName,
      itemByName,
    });
    props.onImported(
      { items, pokemon },
      `Imported ${matched} row${matched === 1 ? "" : "s"} from ${file.name}` +
        (skipped.length ? `. Skipped ${skipped.length} unrecognized: ${skipped.slice(0, 8).join(", ")}` : ".")
    );
  };

  return (
    <SectionCard title="Bulk import from a spreadsheet">
      <Text fz={13} c="dimmed">
        Have a lot to add? Download a template, fill it in (in Google Sheets or Excel), export it as
        CSV, and upload it here. You can review and edit everything before submitting.
      </Text>
      <Group gap={10} wrap="wrap">
        <Button
          size="xs"
          variant="light"
          onClick={() =>
            downloadCsv("snagem-items-template.csv", "Item Name,Quantity\nRare Candy,5\n")
          }
        >
          Download items template
        </Button>
        <Button
          size="xs"
          variant="light"
          onClick={() =>
            downloadCsv(
              "snagem-pokemon-template.csv",
              "Species,Gender (M/F),Shiny (Y/N),Level,Friendship,Shadow,Purification\nPikachu,M,N,25,120,0,0\n"
            )
          }
        >
          Download Pokemon template
        </Button>
      </Group>
      <Group gap={10} wrap="wrap">
        <input
          ref={itemsInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) handleFile(f, "items");
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={pokeInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) handleFile(f, "pokemon");
            e.currentTarget.value = "";
          }}
        />
        <Button
          size="xs"
          leftSection={<IconUpload size={14} />}
          onClick={() => itemsInput.current?.click()}
        >
          Upload items CSV
        </Button>
        <Button
          size="xs"
          leftSection={<IconUpload size={14} />}
          onClick={() => pokeInput.current?.click()}
        >
          Upload Pokemon CSV
        </Button>
      </Group>
    </SectionCard>
  );
}

function SubmittedPreview(props: { entries: ImportEntries }) {
  const { currency, items, pokemon } = props.entries;
  return (
    <SectionCard title="Your submitted import">
      <Group gap={8} wrap="wrap">
        {CURRENCY_LABELS.filter((c) => currency[c.key] > 0).map((c) => (
          <Badge key={c.key} variant="light" color="cyan.0">
            {currency[c.key]} {c.label}
          </Badge>
        ))}
      </Group>
      <Stack gap={4}>
        {items.map((it, i) => (
          <Text key={i} fz={13} c="white">
            {it.qty}x {it.name}
          </Text>
        ))}
        {pokemon.map((p, i) => (
          <Text key={i} fz={13} c="white">
            {p.species} · Lv {p.level} · {p.gender}
            {p.shiny ? " · Shiny" : ""}
          </Text>
        ))}
        {!items.length && !pokemon.length && (
          <Text fz={12} c="dimmed">
            No items or Pokemon in this submission.
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}

function CompleteConfirm(props: { loading: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Box
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: 16,
      }}
    >
      <Paper
        p={20}
        radius={12}
        maw={420}
        style={{ background: "#1E1D20" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap={12}>
          <Text c="white" fw={600} fz={18}>
            Finish importing?
          </Text>
          <Text fz={14} c="dimmed">
            "My import is complete" ends the import process. This onboarding page will close and you
            will not be able to submit more imports. Anything already approved stays in your account.
            You are not just closing a window: you are done importing.
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" color="gray" onClick={props.onClose}>
              Keep importing
            </Button>
            <Button color="red" loading={props.loading} onClick={props.onConfirm}>
              My import is complete
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}
