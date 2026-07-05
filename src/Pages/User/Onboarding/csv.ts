import { ImportItem, ImportPokemon } from "../../../queries/imports";

/** Trigger a client-side download of a small text file (a CSV template). */
export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal RFC-4180-ish CSV parser (handles quotes, commas and newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") pushField();
    else if (c === "\n") pushRow();
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) pushRow();
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

interface Lookups {
  pokemonByName: Map<string, { name: string; idx: string; slug: string }>;
  itemByName: Map<string, { id: string; name: string; category: string; filePath: string }>;
}

export interface ParseResult {
  items: ImportItem[];
  pokemon: ImportPokemon[];
  matched: number;
  skipped: string[];
}

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());
const clampNum = (v: string, min: number, max: number) => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

/**
 * Parse an uploaded CSV into import entries. `kind` selects the expected shape;
 * unrecognized species/items are collected in `skipped` so the member can fix
 * them, and everything matched is returned for review before submitting.
 */
export function parseImportCsv(text: string, kind: "items" | "pokemon", look: Lookups): ParseResult {
  const rows = parseCsv(text);
  const items: ImportItem[] = [];
  const pokemon: ImportPokemon[] = [];
  const skipped: string[] = [];
  if (rows.length < 2) return { items, pokemon, matched: 0, skipped };

  // Skip the header row.
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (kind === "items") {
      const name = (cols[0] ?? "").trim();
      if (!name) continue;
      const item = look.itemByName.get(name.toLowerCase());
      if (!item) {
        skipped.push(name);
        continue;
      }
      items.push({
        refId: item.id,
        name: item.name,
        filePath: item.filePath,
        category: item.category,
        qty: clampNum(cols[1] ?? "1", 1, 100000),
      });
    } else {
      const name = (cols[0] ?? "").trim();
      if (!name) continue;
      const p = look.pokemonByName.get(name.toLowerCase());
      if (!p) {
        skipped.push(name);
        continue;
      }
      pokemon.push({
        species: p.name,
        slug: p.slug,
        pokedex: String(Number(p.idx)),
        gender: /^f/i.test((cols[1] ?? "M").trim()) ? "F" : "M",
        shiny: yes(cols[2] ?? "N"),
        level: clampNum(cols[3] ?? "5", 1, 100),
        friendship: clampNum(cols[4] ?? "0", 0, 255),
        shadow: clampNum(cols[5] ?? "0", 0, 100000000),
        purification: clampNum(cols[6] ?? "0", 0, 100000000),
      });
    }
  }
  return { items, pokemon, matched: items.length + pokemon.length, skipped };
}
