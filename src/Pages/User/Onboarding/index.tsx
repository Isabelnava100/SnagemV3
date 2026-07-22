import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import React from "react";
import Seo from "../../../components/common/Seo";
import { ItemHoverCard } from "../../../components/common/ItemHoverCard";
import { PokemonHoverCard } from "../../../components/pokemon/PokemonHoverCard";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { itemData } from "../../../data/item";
import { pokemonData } from "../../../data/pokemon";
import { getItemImageURL, getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../../helpers";
import { SnagIcon, SnagIconName } from "../../../icons/SnagIcon";
import { MAX_LEVEL } from "../../../lib/leveling";
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
import GaiaPrefill from "./GaiaPrefill";

const CURRENCY_LABELS: { key: keyof ImportEntries["currency"]; label: string }[] = [
  { key: "pokecoin", label: "Snag Coins" },
  { key: "gengarcoin", label: "Gengar Coins" },
  { key: "snagemblem", label: "Snag Emblems" },
  { key: "snagEmblemPieces", label: "Emblem Pieces" },
];

const pokemonByName = new Map(pokemonData.map((p) => [p.name.toLowerCase(), p]));
const itemByName = new Map(itemData.map((i) => [i.name.toLowerCase(), i]));

const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const CLIP_CTA = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";

/** Dark, square-cornered field look shared by every input on the page. */
const FIELD_SX = {
  "& label": { color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 },
  "& input, & textarea": {
    background: "#0e0d11",
    border: "1px solid #2a2637",
    borderRadius: 0,
    color: "#fff",
  },
  "& input:focus, & input:focus-within, & textarea:focus": { borderColor: "#c79bd6" },
  "& input::placeholder, & textarea::placeholder": { color: "#8f8a99" },
} as const;

/* -------------------------------------------------------------------------- */

/** Angular clip-path CTA in the redesign language, with loading + disabled. */
function AngularButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  kind: "red" | "outline" | "cyan";
  size?: "sm" | "md";
}) {
  const palettes = {
    red: {
      background: "#E54156",
      color: "#fff",
      border: "none",
      "&:hover": { background: "#fff", color: "#1A1B1E" },
    },
    outline: {
      background: "transparent",
      color: "#fff",
      border: "1.5px solid rgba(255,255,255,0.4)",
      "&:hover": { borderColor: "#fff" },
    },
    cyan: {
      background: "transparent",
      color: "#12B7B6",
      border: "1px solid #12B7B6",
      "&:hover": { background: "#12B7B6", color: "#fff" },
    },
  } as const;
  const disabled = props.disabled || props.loading;
  return (
    <UnstyledButton
      onClick={props.onClick}
      disabled={disabled}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: props.size === "sm" ? "9px 16px" : "14px 24px",
        clipPath: CLIP_CTA,
        transition: "background .2s ease, color .2s ease, border-color .2s ease",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        ...palettes[props.kind],
      }}
    >
      {props.loading ? <Loader size={16} color={props.kind === "red" ? "#fff" : "#12B7B6"} /> : props.children}
    </UnstyledButton>
  );
}

/** Tinted status banner (gold draft note, review states) with a glyph. */
function StatusNote(props: { icon: SnagIconName; accent: string; children: React.ReactNode }) {
  return (
    <Group
      role="status"
      aria-live="polite"
      wrap="nowrap"
      align="flex-start"
      gap={12}
      style={{
        background: `${props.accent}17`,
        border: `1px solid ${props.accent}80`,
        padding: "14px 18px",
      }}
    >
      <Box style={{ flexShrink: 0, marginTop: 1 }}>
        <SnagIcon name={props.icon} size={20} color={props.accent} cut="#0e0d11" />
      </Box>
      <Text fz={14.5} style={{ color: props.accent, lineHeight: 1.5 }}>
        {props.children}
      </Text>
    </Group>
  );
}

/** Flat angular panel with a Quantico section header and optional right action. */
function SectionCard(props: {
  title: string;
  icon?: SnagIconName;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box p={{ base: 18, sm: 28 }} style={{ background: "#17151c", border: "1px solid #2a2637" }}>
      <Group justify="space-between" align="center" wrap="nowrap" mb={18} gap={12}>
        <Group gap={12} align="center" wrap="nowrap">
          {props.icon && <SnagIcon name={props.icon} size={22} color="#fff" cut="#17151c" />}
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={16}
            tt="uppercase"
            style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.06em", margin: 0 }}
          >
            {props.title}
          </Text>
        </Group>
        {props.action}
      </Group>
      <Stack gap={14}>{props.children}</Stack>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */

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
  // Which import path the member picked on the first screen. Null shows the
  // three-way chooser; a returning draft with entries skips straight to the form.
  const [mode, setMode] = React.useState<"prefill" | "csv" | null>(null);

  React.useEffect(() => {
    if (isPending || seeded) return;
    if (request) {
      const seededEntries = {
        currency: request.currency ?? emptyEntries().currency,
        items: request.items ?? [],
        pokemon: request.pokemon ?? [],
      };
      setEntries(seededEntries);
      setNote(request.note ?? "");
      const hasEntries =
        seededEntries.items.length > 0 ||
        seededEntries.pokemon.length > 0 ||
        CURRENCY_LABELS.some((c) => (seededEntries.currency[c.key] ?? 0) > 0);
      if (hasEntries) setMode("prefill");
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
    <Box maw={900} mx="auto" p={{ base: 16, sm: 36 }} pb={{ base: 56, sm: 90 }}>
      <Seo noindex title="Onboarding | Snagem Guild" />
      <Stack gap={22}>
        <Box>
          <Text
            component="h1"
            c="white"
            fz={{ base: 30, sm: 40 }}
            fw={700}
            tt="uppercase"
            style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.02em", lineHeight: 1.05, margin: 0 }}
          >
            Welcome back. Import your collection
          </Text>
          <Text fz={{ base: 15, sm: 16 }} c="#b6b1bc" mt={12} lh={1.6}>
            Returning from the Gaia guild? Add the currency, items, and Pokemon you had so a staff
            member can restore them. Add things by hand below, or use the spreadsheet if you have a
            lot. You can come back to this page any time until you mark it complete.
          </Text>
        </Box>

        {status === "draft" && (
          <StatusNote icon="clock" accent="#FFD074">
            Your draft is saved as you go. It has not been submitted for review yet.
          </StatusNote>
        )}
        {status === "pending" && (
          <StatusNote icon="clock" accent="#FFD074">
            You submitted your import for review. You can see it below. Once a staff member approves
            it, the items land in your account and you can add more or finish.
          </StatusNote>
        )}
        {status === "rejected" && request?.reviewerNote && (
          <StatusNote icon="refresh" accent="#E54156">
            A change is needed: {request.reviewerNote}
          </StatusNote>
        )}
        {status === "granted" && (
          <StatusNote icon="shieldcheck" accent="#12B7B6">
            Your last batch was added to your account. Add more below, or mark your import complete
            when you are done.
          </StatusNote>
        )}

        {locked ? (
          <SubmittedPreview entries={entries} />
        ) : mode === null ? (
          <ImportChoice
            onPrefill={() => setMode("prefill")}
            onCsv={() => setMode("csv")}
            onScratch={openComplete}
          />
        ) : (
          <>
            {mode === "prefill" && (
            <GaiaPrefill
              onPrefill={(prefill, noteAppend) => {
                // Merge, never clobber: per currency field, a hand-entered
                // value wins and the prefill fills only what is still zero.
                const mergedCurrency = { ...entries.currency };
                CURRENCY_LABELS.forEach((c) => {
                  if ((mergedCurrency[c.key] ?? 0) <= 0) {
                    mergedCurrency[c.key] = prefill.currency[c.key] ?? 0;
                  }
                });
                update({
                  currency: mergedCurrency,
                  items: [...entries.items, ...prefill.items],
                  pokemon: [...entries.pokemon, ...prefill.pokemon],
                });
                setNote((prev) => (prev ? `${prev}\n\n${noteAppend}` : noteAppend));
              }}
            />
            )}
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
            {mode === "csv" && (
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
            )}
            {uploadInfo && (
              <Text fz={14} c="#b6b1bc">
                {uploadInfo}
              </Text>
            )}

            <SectionCard title="Note for the reviewer" icon="chat">
              <Textarea
                aria-label="Note for the reviewer (optional)"
                placeholder="Anything the staff should know about your import"
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                autosize
                minRows={2}
                radius={0}
                sx={FIELD_SX}
              />
            </SectionCard>

            {message && (
              <StatusNote icon="shieldcheck" accent="#12B7B6">
                {message}
              </StatusNote>
            )}

            <Group
              justify="space-between"
              align="center"
              wrap="wrap"
              gap={12}
              pt={20}
              style={{ borderTop: "1px solid #2a2637" }}
            >
              <Text fz={14} c="#b6b1bc">
                Every edit auto-saves as a draft.
              </Text>
              <Group gap={10} wrap="wrap">
                <AngularButton kind="outline" onClick={openComplete}>
                  My import is complete
                </AngularButton>
                <AngularButton
                  kind="red"
                  disabled={totalCount === 0}
                  loading={submit.isPending}
                  onClick={() => submit.mutateAsync()}
                >
                  Submit for review
                </AngularButton>
              </Group>
            </Group>
            <Anchor
              component="button"
              type="button"
              onClick={() => setMode(null)}
              fz={14}
              c="grape.3"
              ta="center"
            >
              Choose a different import method
            </Anchor>
          </>
        )}

        {status === "completed" && (
          <StatusNote icon="lock" accent="#b6b1bc">
            You have marked your import as complete, so this page is closed. If you still need
            something restored, contact a staff member.
          </StatusNote>
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

/**
 * First screen: the member picks how they want to onboard before any form is
 * shown. Prefill (Gaia), spreadsheet (CSV), or skip and create from scratch.
 */
function ImportChoice(props: {
  onPrefill: () => void;
  onCsv: () => void;
  onScratch: () => void;
}) {
  const options = [
    {
      key: "prefill",
      title: "Prefill from your Gaia account",
      body: "Pick your old Gaia profile and we fill in the currency, items and Pokemon we have on record. Fastest if you were a Gaia member.",
      cta: "Use Gaia prefill",
      onClick: props.onPrefill,
      accent: "#772976",
    },
    {
      key: "csv",
      title: "Import from a spreadsheet",
      body: "Download the CSV templates, fill them in, and upload. Best if you have a lot to add or kept your own records.",
      cta: "Use a spreadsheet",
      onClick: props.onCsv,
      accent: "#12B7B6",
    },
    {
      key: "scratch",
      title: "Skip import, start fresh",
      body: "Add nothing and go straight to creating your first character. You cannot return to this import page once you do this.",
      cta: "Start from scratch",
      onClick: props.onScratch,
      accent: "#E54156",
    },
  ];
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={16}>
      {options.map((o) => (
        <UnstyledButton
          key={o.key}
          onClick={o.onClick}
          aria-label={o.cta}
          style={{
            display: "block",
            textAlign: "left",
            padding: 20,
            background: "#17151c",
            border: `1px solid ${o.accent}`,
            height: "100%",
          }}
        >
          <Stack gap={10} h="100%" justify="space-between">
            <Box>
              <Text c="white" fw={700} fz={17} style={{ fontFamily: FONT_DISPLAY }}>
                {o.title}
              </Text>
              <Text fz={14} c="#b6b1bc" mt={8} lh={1.55}>
                {o.body}
              </Text>
            </Box>
            <Text fz={13} fw={700} c={o.accent} tt="uppercase" style={{ letterSpacing: "0.08em" }}>
              {o.cta} →
            </Text>
          </Stack>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
}

/* -------------------------------------------------------------------------- */

function CurrencySection(props: {
  currency: ImportEntries["currency"];
  onChange: (c: ImportEntries["currency"]) => void;
}) {
  return (
    <SectionCard title="Currency" icon="coin">
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing={12}>
        {CURRENCY_LABELS.map(({ key, label }) => (
          <NumberInput
            key={key}
            label={label}
            min={0}
            max={100000000}
            value={props.currency[key]}
            onChange={(v) => props.onChange({ ...props.currency, [key]: Math.max(0, Number(v) || 0) })}
            radius={0}
            sx={FIELD_SX}
          />
        ))}
      </SimpleGrid>
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
    <SectionCard title="Items" icon="bag">
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
          radius={0}
          sx={FIELD_SX}
        />
        <NumberInput
          label="Qty"
          min={1}
          max={100000}
          value={qty}
          onChange={(v) => setQty(Math.max(1, Number(v) || 1))}
          w={90}
          radius={0}
          sx={FIELD_SX}
        />
        <AngularButton kind="cyan" size="sm" disabled={!itemId} onClick={add}>
          + Add item
        </AngularButton>
      </Group>
      <Stack gap={8}>
        {props.items.map((it, i) => (
          <Group
            key={i}
            wrap="nowrap"
            align="center"
            gap={12}
            style={{ background: "#0e0d11", border: "1px solid #232028", padding: "10px 14px" }}
          >
            {it.filePath && (
              <ItemHoverCard item={{ id: it.refId, name: it.name, category: it.category, quantity: it.qty }}>
                <Avatar src={getItemImageURL(it.filePath)} alt={it.name} size={28} radius={0} />
              </ItemHoverCard>
            )}
            <Text fz={14} fw={700} c="white" style={{ flex: 1, minWidth: 0 }}>
              {it.qty}x {it.name}
            </Text>
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              aria-label={`Remove ${it.name}`}
              onClick={() => props.onChange(props.items.filter((_, j) => j !== i))}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
        {!props.items.length && (
          <Text fz={14} c="#8f8a99">
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
    <SectionCard title="Pokemon" icon="pokeball">
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
          radius={0}
          leftSection={
            slug ? (
              <PokemonHoverCard species={{ slug }}>
                <Avatar
                  src={getPokemonImageURL(slug)}
                  alt=""
                  size={22}
                  imageProps={{ style: { imageRendering: "pixelated" } }}
                />
              </PokemonHoverCard>
            ) : undefined
          }
          sx={FIELD_SX}
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
          radius={0}
          sx={FIELD_SX}
        />
        <NumberInput
          label="Level"
          min={1}
          max={MAX_LEVEL}
          value={level}
          onChange={(v) => setLevel(Math.max(1, Math.min(MAX_LEVEL, Number(v) || 1)))}
          w={90}
          radius={0}
          sx={FIELD_SX}
        />
        <NumberInput
          label="Friendship"
          min={0}
          max={255}
          value={friendship}
          onChange={(v) => setFriendship(Math.max(0, Math.min(255, Number(v) || 0)))}
          w={110}
          radius={0}
          sx={FIELD_SX}
        />
        <NumberInput
          label="Shadow"
          min={0}
          value={shadow}
          onChange={(v) => setShadow(Math.max(0, Number(v) || 0))}
          w={100}
          radius={0}
          sx={FIELD_SX}
        />
        <NumberInput
          label="Purification"
          min={0}
          value={purification}
          onChange={(v) => setPurification(Math.max(0, Number(v) || 0))}
          w={110}
          radius={0}
          sx={FIELD_SX}
        />
        <Checkbox
          label="Shiny"
          checked={shiny}
          onChange={(e) => setShiny(e.currentTarget.checked)}
          sx={{ "& label": { color: "#fff" } }}
        />
        <AngularButton kind="cyan" size="sm" disabled={!slug} onClick={add}>
          + Add Pokemon
        </AngularButton>
      </Group>
      <Stack gap={8}>
        {props.pokemon.map((p, i) => (
          <Group
            key={i}
            wrap="nowrap"
            align="center"
            gap={12}
            style={{ background: "#0e0d11", border: "1px solid #232028", padding: "10px 14px" }}
          >
            <PokemonHoverCard species={{ slug: p.slug }}>
              <Avatar
                src={getPokemonImageURL(p.slug)}
                alt={p.species}
                size={32}
                radius={0}
                imageProps={{ style: { imageRendering: "pixelated" } }}
              >
                <img src={POKEMON_SPRITE_FALLBACK} alt="" width={20} height={20} />
              </Avatar>
            </PokemonHoverCard>
            <Text fz={14} fw={700} c="white" style={{ flex: 1, minWidth: 0 }}>
              {p.species}
              {p.shiny ? " (Shiny)" : ""}
            </Text>
            <Text fz={14} c="#b6b1bc" style={{ flexShrink: 0 }}>
              Lv {p.level} · {p.gender}
            </Text>
            <ActionIcon
              size="sm"
              color="red"
              variant="subtle"
              aria-label={`Remove ${p.species}`}
              onClick={() => props.onChange(props.pokemon.filter((_, j) => j !== i))}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        ))}
        {!props.pokemon.length && (
          <Text fz={14} c="#8f8a99">
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
    <SectionCard title="Bulk import from a spreadsheet" icon="chart">
      <Text fz={14} c="#b6b1bc" lh={1.6}>
        Have a lot to add? Download a template, fill it in (in Google Sheets or Excel), export it as
        CSV, and upload it here. You can review and edit everything before submitting.
      </Text>
      <Group gap={10} wrap="wrap">
        <AngularButton
          kind="cyan"
          size="sm"
          onClick={() =>
            downloadCsv("snagem-items-template.csv", "Item Name,Quantity\nRare Candy,5\n")
          }
        >
          Download items template
        </AngularButton>
        <AngularButton
          kind="cyan"
          size="sm"
          onClick={() =>
            downloadCsv(
              "snagem-pokemon-template.csv",
              "Species,Gender (M/F),Shiny (Y/N),Level,Friendship,Shadow,Purification\nPikachu,M,N,25,120,0,0\n"
            )
          }
        >
          Download Pokemon template
        </AngularButton>
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
        <AngularButton kind="cyan" size="sm" onClick={() => itemsInput.current?.click()}>
          <IconUpload size={14} /> Upload items CSV
        </AngularButton>
        <AngularButton kind="cyan" size="sm" onClick={() => pokeInput.current?.click()}>
          <IconUpload size={14} /> Upload Pokemon CSV
        </AngularButton>
      </Group>
    </SectionCard>
  );
}

function SubmittedPreview(props: { entries: ImportEntries }) {
  const { currency, items, pokemon } = props.entries;
  return (
    <SectionCard title="Your submitted import" icon="gift">
      <Group gap={8} wrap="wrap">
        {CURRENCY_LABELS.filter((c) => currency[c.key] > 0).map((c) => (
          <Badge key={c.key} variant="filled" color="cyan.0" radius={0}>
            {currency[c.key]} {c.label}
          </Badge>
        ))}
      </Group>
      <Stack gap={8}>
        {items.map((it, i) => (
          <Group
            key={`i-${i}`}
            wrap="nowrap"
            align="center"
            gap={12}
            style={{ background: "#0e0d11", border: "1px solid #232028", padding: "10px 14px" }}
          >
            {it.filePath && (
              <ItemHoverCard item={{ id: it.refId, name: it.name, category: it.category, quantity: it.qty }}>
                <Avatar src={getItemImageURL(it.filePath)} alt={it.name} size={28} radius={0} />
              </ItemHoverCard>
            )}
            <Text fz={14} fw={700} c="white">
              {it.qty}x {it.name}
            </Text>
          </Group>
        ))}
        {pokemon.map((p, i) => (
          <Group
            key={`p-${i}`}
            wrap="nowrap"
            align="center"
            gap={12}
            style={{ background: "#0e0d11", border: "1px solid #232028", padding: "10px 14px" }}
          >
            <PokemonHoverCard species={{ slug: p.slug }}>
              <Avatar
                src={getPokemonImageURL(p.slug)}
                alt={p.species}
                size={32}
                radius={0}
                imageProps={{ style: { imageRendering: "pixelated" } }}
              >
                <img src={POKEMON_SPRITE_FALLBACK} alt="" width={20} height={20} />
              </Avatar>
            </PokemonHoverCard>
            <Text fz={14} fw={700} c="white" style={{ flex: 1, minWidth: 0 }}>
              {p.species}
              {p.shiny ? " (Shiny)" : ""}
            </Text>
            <Text fz={14} c="#b6b1bc" style={{ flexShrink: 0 }}>
              Lv {p.level} · {p.gender}
            </Text>
          </Group>
        ))}
        {!items.length && !pokemon.length && (
          <Text fz={14} c="#8f8a99">
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
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: 16,
      }}
    >
      <Box
        maw={440}
        w="100%"
        p={{ base: 20, sm: 28 }}
        style={{ background: "#17151c", border: "1px solid #2a2637" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap={14}>
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={22}
            tt="uppercase"
            style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.04em", margin: 0 }}
          >
            Finish importing?
          </Text>
          <Text fz={15} c="#b6b1bc" lh={1.6}>
            "My import is complete" ends the import process. This onboarding page will close and you
            will not be able to submit more imports. Anything already approved stays in your account.
            You are not just closing a window: you are done importing.
          </Text>
          <Group justify="flex-end" gap={10} wrap="wrap">
            <AngularButton kind="outline" size="sm" onClick={props.onClose}>
              Keep importing
            </AngularButton>
            <AngularButton kind="red" size="sm" loading={props.loading} onClick={props.onConfirm}>
              My import is complete
            </AngularButton>
          </Group>
        </Stack>
      </Box>
    </Box>
  );
}
