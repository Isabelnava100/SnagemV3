import { ImportEntries, ImportItem, ImportPokemon } from "../../../queries/imports";

/** Quote a value for a CSV cell when it needs it. */
export const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

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

/**
 * Which template shape an uploaded file matched: the current combined
 * template, one of the retired single-type templates (members may still hold
 * files downloaded before the merge), or nothing we recognize.
 */
export type CsvFormat = "combined" | "items" | "pokemon" | "unknown";

export interface ParseResult {
  items: ImportItem[];
  pokemon: ImportPokemon[];
  matched: number;
  skipped: string[];
}

export interface UploadResult extends ParseResult {
  format: CsvFormat;
}

/** Header of the single combined template (items and pokemon in one file). */
export const IMPORT_TEMPLATE_HEADER =
  "Type,Name,Quantity,Gender (M/F),Shiny (Y/N),Level,Friendship,Shadow,Purification";

/**
 * Build the one downloadable template. With no entries (or an empty draft) it
 * carries two example rows; with a draft it carries the member's current
 * items and pokemon so they can edit the import in a spreadsheet.
 */
export function buildImportCsv(entries?: ImportEntries | null): string {
  const lines = [IMPORT_TEMPLATE_HEADER];
  const hasData = !!entries && (entries.items.length > 0 || entries.pokemon.length > 0);
  if (!hasData) {
    lines.push("Item,Rare Candy,5,,,,,,");
    lines.push("Pokemon,Pikachu,,M,N,25,120,0,0");
  } else {
    for (const it of entries.items) {
      lines.push(`Item,${csvCell(it.name)},${it.qty},,,,,,`);
    }
    for (const p of entries.pokemon) {
      lines.push(
        `Pokemon,${csvCell(p.species)},,${p.gender},${p.shiny ? "Y" : "N"},${p.level},${p.friendship},${p.shadow},${p.purification}`
      );
    }
  }
  return lines.join("\n") + "\n";
}

const yes = (v: string) => /^(y|yes|true|1)$/i.test(v.trim());
const clampNum = (v: string, min: number, max: number) => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

/** Match an item row by catalog name; null goes to `skipped`. */
function matchItem(name: string, qty: string, look: Lookups): ImportItem | null {
  const item = look.itemByName.get(name.toLowerCase());
  if (!item) return null;
  return {
    refId: item.id,
    name: item.name,
    filePath: item.filePath,
    category: item.category,
    qty: clampNum(qty, 1, 100000),
  };
}

/** Match a pokemon row by species name; null goes to `skipped`. */
function matchPokemon(
  name: string,
  [gender, shiny, level, friendship, shadow, purification]: string[],
  look: Lookups
): ImportPokemon | null {
  const p = look.pokemonByName.get(name.toLowerCase());
  if (!p) return null;
  return {
    species: p.name,
    slug: p.slug,
    pokedex: String(Number(p.idx)),
    gender: /^f/i.test((gender ?? "M").trim()) ? "F" : "M",
    shiny: yes(shiny ?? "N"),
    level: clampNum(level ?? "5", 1, 100),
    friendship: clampNum(friendship ?? "0", 0, 255),
    shadow: clampNum(shadow ?? "0", 0, 100000000),
    purification: clampNum(purification ?? "0", 0, 100000000),
  };
}

/**
 * Parse an uploaded CSV into import entries, detecting the shape from the
 * header row: the combined template (Type column), or one of the retired
 * single-type templates so files downloaded before the merge still work.
 * Unrecognized species/items land in `skipped` so the member can fix them.
 */
export function parseUploadCsv(text: string, look: Lookups): UploadResult {
  const rows = parseCsv(text);
  const items: ImportItem[] = [];
  const pokemon: ImportPokemon[] = [];
  const skipped: string[] = [];
  const done = (format: CsvFormat): UploadResult => ({
    items,
    pokemon,
    matched: items.length + pokemon.length,
    skipped,
    format,
  });

  const header = (rows[0] ?? []).map((c) => c.trim().toLowerCase());
  const format: CsvFormat = header[0]?.startsWith("type")
    ? "combined"
    : header[0]?.startsWith("item")
      ? "items"
      : header[0]?.startsWith("species")
        ? "pokemon"
        : "unknown";
  if (format === "unknown" || rows.length < 2) return done(format);

  for (const cols of rows.slice(1)) {
    if (format === "combined") {
      const type = (cols[0] ?? "").trim().toLowerCase();
      const name = (cols[1] ?? "").trim();
      if (!name) continue;
      if (type.startsWith("i")) {
        const item = matchItem(name, cols[2] ?? "1", look);
        if (item) items.push(item);
        else skipped.push(name);
      } else if (type.startsWith("p")) {
        const poke = matchPokemon(name, cols.slice(3), look);
        if (poke) pokemon.push(poke);
        else skipped.push(name);
      } else {
        skipped.push(name || type);
      }
    } else if (format === "items") {
      const name = (cols[0] ?? "").trim();
      if (!name) continue;
      const item = matchItem(name, cols[1] ?? "1", look);
      if (item) items.push(item);
      else skipped.push(name);
    } else {
      const name = (cols[0] ?? "").trim();
      if (!name) continue;
      const poke = matchPokemon(name, cols.slice(1), look);
      if (poke) pokemon.push(poke);
      else skipped.push(name);
    }
  }
  return done(format);
}
