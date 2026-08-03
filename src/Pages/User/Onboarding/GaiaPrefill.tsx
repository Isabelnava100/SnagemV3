import {
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import React from "react";
import { v4 as uuid } from "uuid";
import { getDb } from "../../../context/firebase";
import { useAuth } from "../../../context/AuthContext";
import { SnagIcon } from "../../../icons/SnagIcon";
import { getCharacters } from "../../../queries/dashboard";
import { ImportEntries, ImportItem, ImportPokemon } from "../../../queries/imports";
import {
  StarterPicker,
  useOnboardingStatus,
} from "../../../components/onboarding/OnboardingChecklist";
import { CreateCharacterStep, CreateTeamStep, StepCard } from "../../Welcome";
import PokemonEditCard from "./PokemonEditCard";

const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const CLIP_CTA = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";

/** Dark, square-cornered field look shared with the Onboarding page. */
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

/** Small accented CTA used inside the Gaia option tabs. */
function TileButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  kind: "gold" | "purple";
}) {
  const palettes = {
    gold: { background: "#FFD074", color: "#1A1B1E", border: "none", "&:hover": { background: "#fff" } },
    purple: {
      background: "transparent",
      color: "#c79bd6",
      border: "1px solid #c79bd6",
      "&:hover": { background: "#c79bd6", color: "#1A1B1E" },
    },
  } as const;
  return (
    <UnstyledButton
      onClick={props.onClick}
      disabled={props.loading}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "11px 16px",
        clipPath: CLIP_CTA,
        transition: "background .2s ease, color .2s ease, border-color .2s ease",
        opacity: props.loading ? 0.6 : 1,
        pointerEvents: props.loading ? "none" : "auto",
        ...palettes[props.kind],
      }}
    >
      {props.loading ? <Loader size={15} color="#c79bd6" /> : props.children}
    </UnstyledButton>
  );
}

/**
 * One member's packet from the Gaia Member Profiles export
 * (gaiaExports/{slug}, uploaded by functions/scripts/upload-gaia-exports.mjs).
 */
interface GaiaExport {
  gaiaName: string;
  rank: string;
  snagCoins: number;
  snagEmblems: number;
  emblemPieces: string;
  characters: Array<{
    name: string;
    age: string;
    gender: string;
    species: string;
    hometown: string;
    history: string;
    /** Present since the owner-curated CSV upload (July 2026). */
    pronouns?: string;
    birthday?: string;
    height?: string;
    shortDescription?: string;
  }>;
  pokemon: Array<{
    raw: string;
    species: string;
    slug: string;
    pokedex: string;
    form: string;
    character: string;
    gender: "M" | "F" | "";
    shiny: boolean;
    shadow: boolean;
    notes: string[];
    level: number;
    /** Present since the owner-curated CSV upload (July 2026). */
    nickname?: string;
  }>;
  itemsMatched: Array<ImportItem>;
  itemsUnmatched: Array<{ raw: string; qty: number; character: string }>;
  rosterUpdates: Array<{ author: string; posted: string; text: string }>;
  gaps: string[];
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getIndex = async (): Promise<Record<string, string>> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "gaiaExports", "_index"));
  return (snap.data()?.names as Record<string, string>) ?? {};
};

/** Fetch one export packet; also used by the import page to know the
 * character names for grouping pokemon (same query key, so it is cached). */
export const getGaiaExport = async (slug: string): Promise<GaiaExport | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "gaiaExports", slug));
  return snap.exists() ? (snap.data() as GaiaExport) : null;
};

const getOwnGaiaName = async (uid: string): Promise<string> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data()?.gaiaName as string) ?? "";
};

/** Entries + a reviewer-note appendix built from one export packet. */
export function entriesFromExport(packet: GaiaExport): {
  entries: ImportEntries;
  noteAppend: string;
} {
  // Every pokemon must belong to a character: unmatched ones fall back to
  // the packet's first character, and a packet with no characters at all
  // prefills no pokemon (there is nobody to assign them to).
  const charNames = packet.characters.map((c) => c.name).filter(Boolean);
  const knownChars = new Set(charNames);
  const pokemon: ImportPokemon[] = charNames.length
    ? packet.pokemon
        .filter((p) => p.slug)
        .map((p) => ({
          species: p.species,
          slug: p.slug,
          pokedex: p.pokedex,
          character: knownChars.has(p.character) ? p.character : charNames[0],
          name: p.nickname || "",
          gender: p.gender || (Math.random() < 0.5 ? "M" : "F"),
          shiny: p.shiny,
          level: p.level,
          friendship: 0,
          shadow: p.shadow ? 100 : 0,
          purification: 0,
        }))
    : [];
  const noteLines: string[] = [`Prefilled from the Gaia export for ${packet.gaiaName}.`];
  if (!charNames.length && packet.pokemon.length) {
    noteLines.push(
      "The Gaia export lists pokemon but no characters, so no pokemon were prefilled (every pokemon needs a character). Staff should check the export."
    );
  }
  // "2/3" style piece counts import as the leading number; odd formats go to
  // the note for the reviewer instead.
  const pieces = parseInt(String(packet.emblemPieces), 10);
  if (packet.emblemPieces && !Number.isFinite(pieces)) {
    noteLines.push(`Emblem pieces on Gaia: ${packet.emblemPieces}.`);
  }
  const forms = packet.pokemon.filter((p) => p.form);
  if (forms.length) {
    noteLines.push(
      `Regional forms to check: ${forms.map((p) => `${p.form} ${p.species}`).join(", ")}.`
    );
  }
  // Eggs and "unknown" listings have no Pokedex match, so they cannot
  // prefill; hand them to the reviewer instead of dropping them silently.
  const unmatchedPokes = packet.pokemon.filter((p) => !p.slug);
  if (unmatchedPokes.length) {
    noteLines.push(
      "Gaia pokemon with no Pokedex match (for reviewer judgment): " +
        unmatchedPokes.map((p) => `${p.species}${p.character ? ` (${p.character})` : ""}`).join("; ")
    );
  }
  if (packet.itemsUnmatched.length) {
    noteLines.push(
      "Gaia items with no catalog match (for reviewer judgment): " +
        packet.itemsUnmatched.map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.raw}`).join("; ")
    );
  }
  if (packet.rosterUpdates.length) {
    noteLines.push(
      `NOTE: ${packet.rosterUpdates.length} roster update post(s) from 2023-2026 were never applied to the listing; staff should review them with me.`
    );
  }
  return {
    entries: {
      currency: {
        pokecoin: packet.snagCoins || 0,
        gengarcoin: 0,
        snagemblem: packet.snagEmblems || 0,
        snagEmblemPieces: Number.isFinite(pieces) && pieces > 0 ? pieces : 0,
      },
      items: packet.itemsMatched.map((i) => ({ ...i })),
      pokemon,
    },
    noteAppend: noteLines.join("\n"),
  };
}

/**
 * One character being reviewed before creation. Every member-editable field
 * of the Character doc is here; species and type stay at their defaults
 * (Human/None) because they are master-only fields on the dashboard too.
 */
interface CharDraft {
  include: boolean;
  name: string;
  age: string;
  pronouns: string;
  birthday: string;
  height: string;
  short_description: string;
  history: string;
  /** Original character name in the export: the stable key that matches
   * ImportPokemon.character even after the name field is edited. */
  sourceName: string;
  /** Species tied to this character in the Gaia export (fallback display
   * while the draft holds no pokemon for them yet, i.e. before prefill). */
  gaiaPokemon: string[];
}

/** Seed the review drafts from the export packet, nothing lost: age becomes
 * its own field, and gender/species/hometown stay in the history text where
 * the member can rework them. */
function draftsFromPacket(packet: GaiaExport): CharDraft[] {
  return packet.characters
    .filter((c) => c.name)
    .map((c) => {
      const headline = [
        c.age && `Age: ${c.age}`,
        c.gender && `Gender: ${c.gender}`,
        c.species && `Species: ${c.species}`,
        c.hometown && `Hometown: ${c.hometown}`,
      ]
        .filter(Boolean)
        .join("\n");
      // "Pikachu, Eevee x2" style roster of the pokemon the export lists
      // under this character.
      const counts = new Map<string, number>();
      packet.pokemon
        .filter((p) => p.character === c.name && p.species)
        .forEach((p) => counts.set(p.species, (counts.get(p.species) ?? 0) + 1));
      return {
        include: true,
        name: c.name,
        age: c.age || "",
        pronouns: c.pronouns || "",
        birthday: c.birthday || "",
        height: c.height || "",
        short_description: c.shortDescription || "",
        history: [headline, c.history].filter(Boolean).join("\n\n"),
        sourceName: c.name,
        gaiaPokemon: [...counts.entries()].map(([s, n]) => (n > 1 ? `${s} x${n}` : s)),
      };
    });
}

/** Editable review card for one character from the export. */
function CharacterReviewCard(props: {
  draft: CharDraft;
  exists: boolean;
  onChange: (patch: Partial<CharDraft>) => void;
  /** True once the draft holds live pokemon for this character (rendered
   * below the card), which supersedes the static Gaia roster line. */
  hideRoster?: boolean;
}) {
  const { draft, exists, onChange } = props;
  const skipped = exists || !draft.include;
  const field = (label: string, key: keyof CharDraft, placeholder: string) => (
    <TextInput
      label={label}
      placeholder={placeholder}
      value={draft[key] as string}
      onChange={(e) => onChange({ [key]: e.currentTarget.value })}
      disabled={skipped}
      radius={0}
      sx={FIELD_SX}
    />
  );
  return (
    <Stack
      gap={12}
      p={14}
      style={{
        background: "#0e0d11",
        border: "1px solid #2a2637",
        opacity: skipped ? 0.6 : 1,
      }}
    >
      <Group justify="space-between" align="center" gap={10} wrap="wrap">
        <Text c="white" fw={700} fz={15} style={{ fontFamily: FONT_DISPLAY }}>
          {draft.name || "Unnamed character"}
        </Text>
        {exists ? (
          <Text fz={13} c="#FFD074">
            Already on your account, will be skipped
          </Text>
        ) : (
          <Checkbox
            label="Create this character"
            checked={draft.include}
            onChange={(e) => onChange({ include: e.currentTarget.checked })}
            sx={{ "& label": { color: "#fff" } }}
          />
        )}
      </Group>
      {!props.hideRoster && draft.gaiaPokemon.length > 0 && (
        <Text fz={13} c="#8f8a99" lh={1.55}>
          Their Pokemon on Gaia: {draft.gaiaPokemon.join(", ")} (prefill the draft to edit them
          here)
        </Text>
      )}
      {!exists && (
        <>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={10}>
            {field("Name", "name", "Character name")}
            {field("Age", "age", "Age")}
            {field("Pronouns", "pronouns", "e.g. she/her, they/them")}
            {field("Birthday", "birthday", "Birthday")}
            {field("Height", "height", "Height")}
          </SimpleGrid>
          <Textarea
            label="Short description"
            placeholder="A sentence or two about who they are"
            value={draft.short_description}
            onChange={(e) => onChange({ short_description: e.currentTarget.value })}
            disabled={skipped}
            autosize
            minRows={2}
            radius={0}
            sx={FIELD_SX}
          />
          <Textarea
            label="History"
            placeholder="Their background and story"
            value={draft.history}
            onChange={(e) => onChange({ history: e.currentTarget.value })}
            disabled={skipped}
            autosize
            minRows={3}
            maxRows={12}
            radius={0}
            sx={FIELD_SX}
          />
        </>
      )}
    </Stack>
  );
}

/** Small "OR" wedge between the option tabs. */
function OrDivider() {
  return (
    <Text
      component="span"
      aria-hidden
      fz={12}
      fw={700}
      c="#8f8a99"
      px={4}
      style={{ alignSelf: "center", fontFamily: FONT_DISPLAY, letterSpacing: "0.1em" }}
    >
      OR
    </Text>
  );
}

/**
 * Option 2 panel: the regular new-trainer onboarding, inline. Same three
 * steps as the First Adventure wizard (character, starter, team); nothing
 * from the Gaia prefill is used, and the page hides the draft while this
 * tab is open.
 */
function StartFromScratchPanel() {
  const status = useOnboardingStatus();
  return (
    <Stack gap={12}>
      <Text fz={14.5} c="#b6b1bc" lh={1.6}>
        Skip the Gaia data and set up like a brand new member instead. Your prefill will not be
        imported; finish these three steps and you are ready to roleplay.
      </Text>
      <StepCard num="01" title="Create your character" done={status.hasCharacter}>
        {status.hasCharacter ? (
          <Text fz={14} c="#3ecf8e">Character created.</Text>
        ) : (
          <CreateCharacterStep />
        )}
      </StepCard>
      <StepCard num="02" title="Pick your first Pokemon" done={status.hasPokemon}>
        {status.hasPokemon ? (
          <Text fz={14} c="#3ecf8e">Starter claimed.</Text>
        ) : (
          <>
            <Text fz={14} c="#b6b1bc" lh={1.55}>
              Every trainer starts with one partner. Choose any 1 star Pokemon, or one of the
              classic starters. Choose well, this one is yours for good.
            </Text>
            <StarterPicker />
          </>
        )}
      </StepCard>
      <StepCard num="03" title="Build your team" done={status.hasReadyTeam}>
        {status.hasReadyTeam ? (
          <Text fz={14} c="#3ecf8e">Team ready.</Text>
        ) : (
          <CreateTeamStep />
        )}
      </StepCard>
      {status.complete && (
        <Stack gap={10}>
          <Text fz={14} c="#3ecf8e">
            All set, Trainer! Your character, partner, and team are ready.
          </Text>
          <Group gap={10} wrap="wrap">
            <Button component={Link} to="/Forum/Main-Forum" color="grape">
              Go to the Forums
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

/** Shared "pick your account first" hint for the tabs that need a packet. */
function NeedAccountHint() {
  return (
    <Text fz={14.5} c="#8f8a99" lh={1.6}>
      Pick your Gaia account above first, then this option unlocks.
    </Text>
  );
}

/**
 * Self-serve Gaia import tools, shown at the top of the import page. Two
 * exclusive options work as tabs (with OR between them): use the Gaia export
 * (the page auto-prefills the draft from it on first load — everything stays
 * editable below), or ignore the Gaia data and start from scratch (closes the
 * import). The characters review renders separately below Items via
 * GaiaCharactersSection.
 */
export default function GaiaPrefill(props: {
  /** Selected export slug, owned by the page so the characters section
   * (rendered further down, below Items) reads the same account. */
  slug: string | null;
  onSlugChange: (slug: string | null) => void;
  /** Active option tab, owned by the page: when "scratch" is selected the
   * page hides the whole prefill draft (it will not be imported). */
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const { user } = useAuth();
  const { slug, onSlugChange, tab, onTabChange } = props;

  const { data: index } = useQuery({ queryKey: ["gaia-export-index"], queryFn: getIndex });
  const { data: ownGaiaName, isPending: ownGaiaNamePending } = useQuery({
    queryKey: ["own-gaia-name", user?.uid],
    queryFn: () => getOwnGaiaName(user!.uid),
    enabled: !!user,
  });

  // A Gaia name saved on the account (given at registration, copied at
  // approval) locks the packet to that account: no picking someone else's
  // export. The dropdown only appears for accounts with no Gaia name on file.
  const lockedSlug =
    ownGaiaName && index?.[slugify(ownGaiaName)] ? slugify(ownGaiaName) : null;

  // Locked accounts always use their own packet; otherwise preselect by site
  // username when it happens to match an export.
  React.useEffect(() => {
    if (!index) return;
    if (lockedSlug) {
      if (slug !== lockedSlug) onSlugChange(lockedSlug);
      return;
    }
    if (slug) return;
    if (user?.username && index[slugify(user.username)]) {
      onSlugChange(slugify(user.username));
    }
  }, [index, lockedSlug, user, slug, onSlugChange]);

  const { data: packet } = useQuery({
    queryKey: ["gaia-export", slug],
    queryFn: () => getGaiaExport(slug!),
    enabled: !!slug,
  });

  // Wait for the account's Gaia name before showing anything: flashing an
  // open dropdown that then locks shut reads as a bug.
  if (!index || Object.keys(index).length === 0 || (!!user && ownGaiaNamePending)) return null;

  const options = Object.entries(index)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const tabSx = {
    color: "#8f8a99",
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    borderRadius: 0,
    padding: "10px 14px",
    "&[data-active]": { color: "#fff", borderColor: "#E54156" },
    "&:hover": { background: "#201d27" },
  };

  return (
    <Box p={{ base: 18, sm: 28 }} style={{ background: "#17151c", border: "1px solid #2a2637" }}>
      <Stack gap={16}>
        <Group gap={12} align="center" wrap="nowrap">
          <SnagIcon name="gift" size={24} color="#fff" cut="#17151c" />
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={16}
            tt="uppercase"
            style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.06em", margin: 0 }}
          >
            Import your collection from Gaiaonline
          </Text>
        </Group>
        <Text fz={14.5} c="#b6b1bc" lh={1.6}>
          We exported every profile from the Gaia guild board. Review and adjust as needed before
          submitting. An admin will review and approve your submission.
        </Text>
        {lockedSlug ? (
          <Text fz={14.5} c="#b6b1bc" lh={1.6}>
            Your account is linked to the Gaia username{" "}
            <Text component="strong" c="white" fw={700}>
              {index[lockedSlug]}
            </Text>
            , so that is the export we will use.
          </Text>
        ) : ownGaiaName ? (
          <Text fz={14.5} c="#b6b1bc" lh={1.6}>
            Your account is linked to the Gaia username{" "}
            <Text component="strong" c="white" fw={700}>
              {ownGaiaName}
            </Text>
            , but no export matches it. Ask a staff member to check the archive for you.
          </Text>
        ) : (
          <Select
            label="Your Gaia account"
            placeholder="Search your Gaia username"
            searchable
            data={options}
            value={slug}
            onChange={onSlugChange}
            maw={320}
            radius={0}
            sx={FIELD_SX}
          />
        )}

        <Tabs
          value={tab}
          onChange={(v) => onTabChange(v ?? "prefill")}
          keepMounted={false}
          styles={{ list: { borderBottom: "1px solid #2a2637", gap: 4, flexWrap: "wrap" } }}
        >
          <Tabs.List>
            <Tabs.Tab value="prefill" sx={tabSx}>
              1 · Prefill the draft
            </Tabs.Tab>
            <OrDivider />
            <Tabs.Tab value="scratch" sx={tabSx}>
              2 · Start from scratch
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="prefill" pt={16}>
            {packet ? (
              <Stack gap={12}>
                <Text fz={14.5} c="#b6b1bc" lh={1.6}>
                  Good news, we have found data for the user{" "}
                  <Text component="strong" c="white" fw={700}>
                    {packet.gaiaName}
                  </Text>
                  : {packet.characters.length} characters, {packet.pokemon.length} Pokemon,{" "}
                  {packet.itemsMatched.length} items matched, {packet.snagCoins} coins and{" "}
                  {packet.snagEmblems} emblems. It has been added to your draft below — review and
                  adjust anything before submitting.
                </Text>
                {packet.itemsUnmatched.length > 0 && (
                  <Text fz={13} c="#8f8a99" lh={1.55}>
                    {packet.itemsUnmatched.length} Gaia item entries have no catalog match; they go
                    to the reviewer note so staff can decide.
                  </Text>
                )}
              </Stack>
            ) : (
              <NeedAccountHint />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="scratch" pt={16}>
            <StartFromScratchPanel />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
}

/**
 * "Characters from Gaia" review section, rendered by the import page below
 * the Items section: every pokemon in the export belongs to one of these
 * characters, so they sit right above the Pokemon list. Always visible while
 * a packet is selected, whatever option tab is open. Shares the account slug
 * picked in the tools panel at the top of the page.
 */
export function GaiaCharactersSection(props: {
  slug: string | null;
  /** The draft's pokemon: each character's own render under their card. */
  pokemon: ImportPokemon[];
  onPokemonChange: (pokemon: ImportPokemon[]) => void;
  /** Every assignable character name (Gaia + already-created), for the
   * Character select on the pokemon cards. */
  characterOptions: string[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState("");

  // Patch one pokemon by its index in the FULL draft list (the per-character
  // grids are filtered views over the same array).
  const patchPokemon = (index: number, patch: Partial<ImportPokemon>) =>
    props.onPokemonChange(props.pokemon.map((x, j) => (j === index ? { ...x, ...patch } : x)));
  const removePokemon = (index: number) =>
    props.onPokemonChange(props.pokemon.filter((_, j) => j !== index));

  const { data: packet } = useQuery({
    queryKey: ["gaia-export", props.slug],
    queryFn: () => getGaiaExport(props.slug!),
    enabled: !!props.slug,
  });

  // Editable review copies of the packet's characters; reseeded whenever a
  // different export loads. Edits live here until "Create" writes them.
  const [charDrafts, setCharDrafts] = React.useState<CharDraft[]>([]);
  React.useEffect(() => {
    let drafts = packet ? draftsFromPacket(packet) : [];
    // TEMPORARY (owner testing, July 2026): duplicate PixelSylveon's
    // characters so the two-character layout can be previewed on the live
    // page. The copies are excluded by default so nothing gets created by
    // accident. Remove this block once the layout is signed off.
    if (props.slug === "pixelsylveon") {
      drafts = [
        ...drafts,
        ...drafts.map((d) => ({ ...d, include: false, name: `${d.name} (Test Copy)` })),
      ];
    }
    setCharDrafts(drafts);
  }, [packet, props.slug]);
  const patchDraft = (i: number, patch: Partial<CharDraft>) =>
    setCharDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  // Names already on the account, to flag duplicates in the review list
  // (shares the dashboard's query key, so it is usually already cached).
  const { data: existingChars } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const existingNames = new Set(
    (existingChars?.sortedData ?? []).map((c) => c.name.toLowerCase())
  );
  const creatableCount = charDrafts.filter(
    (d) => d.include && d.name.trim() && !existingNames.has(d.name.trim().toLowerCase())
  ).length;

  const createCharacters = useMutation({
    mutationFn: async () => {
      if (!user) return { count: 0, created: [] as Array<{ sourceName: string; newName: string }> };
      const { doc, getDoc, setDoc } = await import("firebase/firestore");
      const db = await getDb();
      const ref = doc(db, "users", user.uid, "bag", "characters");
      const existing = ((await getDoc(ref)).data() as Record<string, { name?: string }>) ?? {};
      const have = new Set(
        Object.values(existing).map((c) => (c.name ?? "").toLowerCase())
      );
      const additions: Record<string, unknown> = {};
      const created: Array<{ sourceName: string; newName: string }> = [];
      for (const d of charDrafts) {
        const name = d.name.trim();
        if (!d.include || !name || have.has(name.toLowerCase())) continue;
        additions[uuid()] = {
          age: d.age,
          birthday: d.birthday,
          height: d.height,
          moveset: "",
          name,
          short_description: d.short_description,
          history: d.history,
          species: "Human",
          pronouns: d.pronouns,
          type: "None",
          imageURL: "",
          createdAt: new Date(),
        };
        created.push({ sourceName: d.sourceName, newName: name });
      }
      if (created.length) await setDoc(ref, additions, { merge: true });
      return { count: created.length, created };
    },
    onSuccess: async ({ count, created }) => {
      setMessage(
        count
          ? `${count} character(s) created. Review them any time on the Characters page.`
          : "All of these characters already exist on your account."
      );
      // When a character got created under an edited name, retag their
      // pokemon (and the group key) so the approval-time name match still
      // assigns them to the right character. Skip ambiguous sources (two
      // drafts sharing one source, e.g. the temporary test copies).
      const renames = new Map(
        created
          .filter(
            (r) =>
              r.newName !== r.sourceName &&
              charDrafts.filter((d) => d.sourceName === r.sourceName).length === 1
          )
          .map((r) => [r.sourceName, r.newName])
      );
      if (renames.size) {
        props.onPokemonChange(
          props.pokemon.map((p) =>
            renames.has(p.character ?? "") ? { ...p, character: renames.get(p.character ?? "") } : p
          )
        );
        setCharDrafts((ds) =>
          ds.map((d) =>
            renames.has(d.sourceName) ? { ...d, sourceName: renames.get(d.sourceName)! } : d
          )
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
    },
    onError: () => setMessage("Could not create the characters. Try again."),
  });

  if (!packet || charDrafts.length === 0) return null;

  return (
    <Box p={{ base: 18, sm: 28 }} style={{ background: "#17151c", border: "1px solid #2a2637" }}>
      <Stack gap={16}>
        <Group gap={12} align="center" wrap="nowrap">
          <SnagIcon name="users" size={24} color="#fff" cut="#17151c" />
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={16}
            tt="uppercase"
            style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.06em", margin: 0 }}
          >
            Characters from Gaia
          </Text>
        </Group>
        <Text fz={14.5} c="#b6b1bc" lh={1.6}>
          These are the characters on your Gaia profile, each with the Pokemon that belong to
          them. Everything we have is filled in; review and edit anything, add whatever is
          missing, then create the ones you want. Everything stays editable later on the
          Characters page.
        </Text>
        {charDrafts.map((d, i) => {
          // This character's pokemon, as (pokemon, full-list index) pairs so
          // edits land on the right entry of the shared draft array.
          const theirs = props.pokemon
            .map((p, index) => ({ p, index }))
            .filter(({ p }) => (p.character ?? "") === d.sourceName);
          return (
            <Stack key={i} gap={10}>
              <CharacterReviewCard
                draft={d}
                exists={existingNames.has(d.name.trim().toLowerCase())}
                onChange={(patch) => patchDraft(i, patch)}
                hideRoster={theirs.length > 0}
              />
              {theirs.length > 0 && (
                <Box pl={{ base: 0, xs: 16 }}>
                  <Stack gap={8}>
                    <Text fz={13} fw={700} c="#8f8a99" tt="uppercase" style={{ letterSpacing: "0.08em" }}>
                      {d.name.trim() || d.sourceName}&apos;s Pokemon ({theirs.length})
                    </Text>
                    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={10}>
                      {theirs.map(({ p, index }) => (
                        <PokemonEditCard
                          key={index}
                          p={p}
                          characterOptions={props.characterOptions}
                          onChange={(patch) => patchPokemon(index, patch)}
                          onRemove={() => removePokemon(index)}
                        />
                      ))}
                    </SimpleGrid>
                  </Stack>
                </Box>
              )}
            </Stack>
          );
        })}
        <Box>
          <TileButton
            kind="purple"
            loading={createCharacters.isPending}
            onClick={() => creatableCount > 0 && createCharacters.mutateAsync()}
          >
            {creatableCount === 0
              ? "Nothing selected to add"
              : creatableCount === 1
                ? "Add a character"
                : `Add ${creatableCount} characters`}
          </TileButton>
        </Box>
        {message && (
          <Group
            role="status"
            aria-live="polite"
            wrap="nowrap"
            align="flex-start"
            gap={12}
            style={{
              background: "rgba(199,155,214,.1)",
              border: "1px solid rgba(199,155,214,.5)",
              padding: "12px 16px",
            }}
          >
            <Box style={{ flexShrink: 0, marginTop: 1 }}>
              <SnagIcon name="sparkle" size={18} color="#c79bd6" cut="#17151c" />
            </Box>
            <Text fz={14} style={{ color: "#c79bd6", lineHeight: 1.5 }}>
              {message}
            </Text>
          </Group>
        )}
      </Stack>
    </Box>
  );
}
