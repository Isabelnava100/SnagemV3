import { Alert, Badge, Button, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { IconDownload, IconSparkles, IconUserPlus } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { v4 as uuid } from "uuid";
import { db } from "../../../context/firebase";
import { useAuth } from "../../../context/AuthContext";
import { ImportEntries, ImportItem, ImportPokemon } from "../../../queries/imports";
import { downloadCsv } from "./csv";

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
    <Paper p={16} radius={12} bg="#2a2430" style={{ border: "1px solid #5a3fb0" }}>
      <Stack gap={10}>
        <Group gap={8}>
          <IconSparkles size={18} color="#c9b6ff" aria-hidden />
          <Text fw={700} c="white" fz={17}>
            We saved your Gaia profile
          </Text>
        </Group>
        <Text fz={14} c="dimmed">
          We exported every profile from the Gaia guild board. Pick your old account and we can fill
          in this import for you: characters, pokemon and items. You can still edit everything
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
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        {packet && (
          <>
            <Group gap={6}>
              <Badge color="grape" variant="light">
                {packet.characters.length} characters
              </Badge>
              <Badge color="teal" variant="light">
                {packet.pokemon.length} pokemon
              </Badge>
              <Badge color="yellow" variant="light">
                {packet.itemsMatched.length} items matched
              </Badge>
              <Badge color="pink" variant="light">
                {packet.snagCoins} coins, {packet.snagEmblems} emblems
              </Badge>
            </Group>
            <Group gap={8} wrap="wrap">
              <Button
                size="xs"
                color="grape"
                leftSection={<IconSparkles size={14} />}
                onClick={() => {
                  const { entries, noteAppend } = entriesFromExport(packet);
                  props.onPrefill(entries, noteAppend);
                  setMessage(
                    "Draft prefilled. Review each section below, adjust anything, then submit."
                  );
                }}
              >
                Prefill my import draft
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconUserPlus size={14} />}
                loading={createCharacters.isPending}
                onClick={() => createCharacters.mutateAsync()}
              >
                Create my characters
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                onClick={downloadPokemonCsv}
              >
                Pokemon CSV (filled)
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                onClick={downloadItemsCsv}
              >
                Items CSV (filled)
              </Button>
            </Group>
            {packet.itemsUnmatched.length > 0 && (
              <Text fz={13} c="dimmed">
                {packet.itemsUnmatched.length} Gaia item entries have no catalog match; prefilling
                adds them to the reviewer note so staff can decide.
              </Text>
            )}
          </>
        )}
        {message && (
          <Alert color="grape" variant="light" role="status" aria-live="polite">
            {message}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
