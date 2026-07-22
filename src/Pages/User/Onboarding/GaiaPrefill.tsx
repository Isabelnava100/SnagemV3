import { Box, Group, Loader, Select, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { v4 as uuid } from "uuid";
import { db } from "../../../context/firebase";
import { useAuth } from "../../../context/AuthContext";
import { SnagIcon } from "../../../icons/SnagIcon";
import { ImportEntries, ImportItem, ImportPokemon } from "../../../queries/imports";
import { downloadCsv } from "./csv";

const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const CLIP_CTA = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";

/** Dark, square-cornered field look shared with the Onboarding page. */
const FIELD_SX = {
  "& label": { color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 },
  "& input": { background: "#0e0d11", border: "1px solid #2a2637", borderRadius: 0, color: "#fff" },
  "& input:focus, & input:focus-within": { borderColor: "#c79bd6" },
  "& input::placeholder": { color: "#8f8a99" },
} as const;

/** Small accented CTA used inside the Gaia option tiles. */
function TileButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  kind: "gold" | "cyan" | "purple";
}) {
  const palettes = {
    gold: { background: "#FFD074", color: "#1A1B1E", border: "none", "&:hover": { background: "#fff" } },
    cyan: {
      background: "transparent",
      color: "#12B7B6",
      border: "1px solid #12B7B6",
      "&:hover": { background: "#12B7B6", color: "#fff" },
    },
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

/** One "how do you want to continue" card in the Gaia panel. */
function OptionTile(props: {
  step: string;
  accent: string;
  borderAccent?: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      className="dc-card-tile"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 18px",
        ...(props.borderAccent ? { borderColor: props.borderAccent } : {}),
      }}
    >
      <Text
        component="span"
        fz={14}
        fw={700}
        style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.12em", color: props.accent }}
      >
        {props.step} · {props.title}
      </Text>
      <Text component="span" fz={14} c="#b6b1bc" style={{ lineHeight: 1.55, flex: 1 }}>
        {props.desc}
      </Text>
      <Group gap={8} wrap="wrap">
        {props.children}
      </Group>
    </Box>
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
  const snap = await getDoc(doc(db, "gaiaExports", "_index"));
  return (snap.data()?.names as Record<string, string>) ?? {};
};

const getExport = async (slug: string): Promise<GaiaExport | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "gaiaExports", slug));
  return snap.exists() ? (snap.data() as GaiaExport) : null;
};

const getOwnGaiaName = async (uid: string): Promise<string> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data()?.gaiaName as string) ?? "";
};

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Entries + a reviewer-note appendix built from one export packet. */
export function entriesFromExport(packet: GaiaExport): {
  entries: ImportEntries;
  noteAppend: string;
} {
  const pokemon: ImportPokemon[] = packet.pokemon
    .filter((p) => p.slug)
    .map((p) => ({
      species: p.species,
      slug: p.slug,
      pokedex: p.pokedex,
      gender: p.gender || (Math.random() < 0.5 ? "M" : "F"),
      shiny: p.shiny,
      level: p.level,
      friendship: 0,
      shadow: p.shadow ? 100 : 0,
      purification: 0,
    }));
  const noteLines: string[] = [`Prefilled from the Gaia export for ${packet.gaiaName}.`];
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
 * Self-serve Gaia prefill: pick your old Gaia account, then prefill the draft,
 * create your characters (history included), or download the filled
 * spreadsheet instead of the empty template.
 */
export default function GaiaPrefill(props: {
  onPrefill: (entries: ImportEntries, noteAppend: string) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [slug, setSlug] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");

  const { data: index } = useQuery({ queryKey: ["gaia-export-index"], queryFn: getIndex });
  const { data: ownGaiaName } = useQuery({
    queryKey: ["own-gaia-name", user?.uid],
    queryFn: () => getOwnGaiaName(user!.uid),
    enabled: !!user,
  });

  // Preselect by the gaiaName given at registration, else by site username.
  React.useEffect(() => {
    if (slug || !index) return;
    for (const candidate of [ownGaiaName, user?.username]) {
      if (candidate && index[slugify(candidate)]) {
        setSlug(slugify(candidate));
        return;
      }
    }
  }, [index, ownGaiaName, user, slug]);

  const { data: packet } = useQuery({
    queryKey: ["gaia-export", slug],
    queryFn: () => getExport(slug!),
    enabled: !!slug,
  });

  const createCharacters = useMutation({
    mutationFn: async () => {
      if (!user || !packet) return 0;
      const { doc, getDoc, setDoc } = await import("firebase/firestore");
      const ref = doc(db, "users", user.uid, "bag", "characters");
      const existing = ((await getDoc(ref)).data() as Record<string, { name?: string }>) ?? {};
      const have = new Set(
        Object.values(existing).map((c) => (c.name ?? "").toLowerCase())
      );
      const additions: Record<string, unknown> = {};
      let count = 0;
      for (const c of packet.characters) {
        if (!c.name || have.has(c.name.toLowerCase())) continue;
        const headline = [
          c.age && `Age: ${c.age}`,
          c.gender && `Gender: ${c.gender}`,
          c.species && `Species: ${c.species}`,
          c.hometown && `Hometown: ${c.hometown}`,
        ]
          .filter(Boolean)
          .join("\n");
        additions[uuid()] = {
          age: c.age || "",
          birthday: "",
          height: "",
          moveset: "",
          name: c.name,
          short_description: "",
          history: [headline, c.history].filter(Boolean).join("\n\n"),
          species: "Human",
          pronouns: "",
          type: "None",
          imageURL: "",
          createdAt: new Date(),
        };
        count += 1;
      }
      if (count) await setDoc(ref, additions, { merge: true });
      return count;
    },
    onSuccess: async (count) => {
      setMessage(
        count
          ? `${count} character(s) created with their Gaia history. Review them on the Characters page.`
          : "All of these characters already exist on your account."
      );
      await queryClient.invalidateQueries({ queryKey: ["get-characters"] });
    },
    onError: () => setMessage("Could not create the characters. Try again."),
  });

  if (!index || Object.keys(index).length === 0) return null;

  const options = Object.entries(index)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const downloadPokemonCsv = () => {
    if (!packet) return;
    const rows = packet.pokemon
      .filter((p) => p.slug)
      .map((p) =>
        [
          csvCell(p.species),
          p.gender || "M",
          p.shiny ? "Y" : "N",
          String(p.level),
          "0",
          p.shadow ? "100" : "0",
          "0",
        ].join(",")
      );
    downloadCsv(
      "snagem-pokemon-gaia.csv",
      "Species,Gender (M/F),Shiny (Y/N),Level,Friendship,Shadow,Purification\n" +
        rows.join("\n") +
        "\n"
    );
  };

  const downloadItemsCsv = () => {
    if (!packet) return;
    const rows = packet.itemsMatched.map((i) => `${csvCell(i.name)},${i.qty}`);
    downloadCsv("snagem-items-gaia.csv", "Item Name,Quantity\n" + rows.join("\n") + "\n");
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
            Prefill from Gaia archive
          </Text>
        </Group>
        <Text fz={14.5} c="#b6b1bc" lh={1.6}>
          We exported every profile from the Gaia guild board. Pick your old account and we can fill
          in this import for you: characters, Pokemon, and items. You can still edit everything
          before submitting.
        </Text>
        <Select
          label="Your Gaia account"
          placeholder="Search your Gaia username"
          searchable
          data={options}
          value={slug}
          onChange={setSlug}
          maw={320}
          radius={0}
          sx={FIELD_SX}
        />
        {packet && (
          <>
            <Text fz={14.5} c="#b6b1bc" lh={1.6}>
              Good news, the export matching{" "}
              <Text component="strong" c="white" fw={700}>
                {packet.gaiaName}
              </Text>{" "}
              is ready: {packet.characters.length} characters, {packet.pokemon.length} Pokemon,{" "}
              {packet.itemsMatched.length} items matched, {packet.snagCoins} coins and{" "}
              {packet.snagEmblems} emblems. Pick how you want to continue:
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={12}>
              <OptionTile
                step="1"
                accent="#FFD074"
                borderAccent="rgba(255,208,116,.5)"
                title="Prefill the draft"
                desc="Fill your currency, Pokemon, and items from the export, then review and finalize below."
              >
                <TileButton
                  kind="gold"
                  onClick={() => {
                    const { entries, noteAppend } = entriesFromExport(packet);
                    props.onPrefill(entries, noteAppend);
                    setMessage(
                      "Draft prefilled. Review each section below, adjust anything, then submit."
                    );
                  }}
                >
                  Prefill my draft
                </TileButton>
              </OptionTile>
              <OptionTile
                step="2"
                accent="#12B7B6"
                title="Use the CSV template"
                desc="Prefer a spreadsheet? Download your data filled in, edit it, and upload it below."
              >
                <TileButton kind="cyan" onClick={downloadPokemonCsv}>
                  Pokemon CSV
                </TileButton>
                <TileButton kind="cyan" onClick={downloadItemsCsv}>
                  Items CSV
                </TileButton>
              </OptionTile>
              <OptionTile
                step="3"
                accent="#c79bd6"
                title="Create your characters"
                desc="Add your Gaia characters, with their history, straight to your account."
              >
                <TileButton
                  kind="purple"
                  loading={createCharacters.isPending}
                  onClick={() => createCharacters.mutateAsync()}
                >
                  Create my characters
                </TileButton>
              </OptionTile>
            </SimpleGrid>
            {packet.itemsUnmatched.length > 0 && (
              <Text fz={13} c="#8f8a99" lh={1.55}>
                {packet.itemsUnmatched.length} Gaia item entries have no catalog match; prefilling
                adds them to the reviewer note so staff can decide.
              </Text>
            )}
          </>
        )}
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
