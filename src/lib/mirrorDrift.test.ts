import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  STAR_ATTACK_DAMAGE,
  STAR_FLEE_CHANCE,
  STAR_POSTS_TO_BEAT,
} from "./encounterStars";
import { STARTER_DEX } from "./starters";

/**
 * Drift guard for the hand-mirrored constants between functions/src/index.ts
 * (server) and the client modules. The server file is read as TEXT and the
 * literals are parsed out, so a genuine value drift fails while formatting
 * differences (whitespace, quote style) do not.
 */

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const serverSrc = readFileSync(`${repoRoot}functions/src/index.ts`, "utf8");

/** Slice out the balanced `{...}` literal assigned to `const <name>`. */
function extractObjectLiteral(src: string, name: string): string {
  const decl = src.indexOf(`const ${name}`);
  if (decl < 0) throw new Error(`${name} not found in source`);
  const open = src.indexOf("{", decl);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${name}`);
}

/** Parse a flat `key: number` object literal body into string-keyed entries. */
function parseFlatTable(literal: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of literal.matchAll(/(\w+)\s*:\s*(-?[\d.]+)/g)) {
    const key = m[1];
    const val = m[2];
    // Both capture groups are required by the regex, so this never triggers.
    if (key === undefined || val === undefined) continue;
    out[key] = Number(val);
  }
  if (Object.keys(out).length === 0) throw new Error("no numeric entries parsed");
  return out;
}

/** Parse a one-level-nested `key: { key: number }` literal (TYPE_CHART). */
function parseNestedTable(literal: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const m of literal.matchAll(/(\w+)\s*:\s*\{([^{}]*)\}/g)) {
    const key = m[1];
    const body = m[2];
    // Both capture groups are required by the regex, so this never triggers.
    if (key === undefined || body === undefined) continue;
    out[key] = parseFlatTable(body);
  }
  if (Object.keys(out).length === 0) throw new Error("no nested entries parsed");
  return out;
}

/** Parse the number list inside `new Set<number>([ ... ])`. */
function parseNumberSet(src: string, name: string): number[] {
  const decl = src.indexOf(`const ${name}`);
  if (decl < 0) throw new Error(`${name} not found in source`);
  const open = src.indexOf("[", decl);
  const close = src.indexOf("]", open);
  if (open < 0 || close < 0) throw new Error(`array for ${name} not found`);
  return (src.slice(open, close).match(/\d+/g) ?? []).map(Number);
}

const asStringKeys = (t: Record<number, number>): Record<string, number> =>
  Object.fromEntries(Object.entries(t));

describe("server/client constant mirrors (functions/src/index.ts)", () => {
  it("DEFAULT_MECHANICS matches DEFAULT_BATTLE_MECHANICS (src/queries/game.ts)", () => {
    // game.ts initializes Firebase at import time, so its mirror is parsed
    // from text the same way instead of importing the module.
    const clientSrc = readFileSync(`${repoRoot}src/queries/game.ts`, "utf8");
    const server = parseFlatTable(extractObjectLiteral(serverSrc, "DEFAULT_MECHANICS"));
    const client = parseFlatTable(extractObjectLiteral(clientSrc, "DEFAULT_BATTLE_MECHANICS"));
    expect(server).toEqual(client);
  });

  it("TYPE_CHART matches CHART (src/lib/typeChart.ts)", () => {
    // CHART is module-private in typeChart.ts, so it is parsed from text too.
    const clientSrc = readFileSync(`${repoRoot}src/lib/typeChart.ts`, "utf8");
    const server = parseNestedTable(extractObjectLiteral(serverSrc, "TYPE_CHART"));
    const client = parseNestedTable(extractObjectLiteral(clientSrc, "CHART"));
    expect(server).toEqual(client);
  });

  it("STAR_POSTS_TO_BEAT matches src/lib/encounterStars.ts", () => {
    const server = parseFlatTable(extractObjectLiteral(serverSrc, "STAR_POSTS_TO_BEAT"));
    expect(server).toEqual(asStringKeys(STAR_POSTS_TO_BEAT));
  });

  it("STAR_FLEE_CHANCE matches src/lib/encounterStars.ts", () => {
    const server = parseFlatTable(extractObjectLiteral(serverSrc, "STAR_FLEE_CHANCE"));
    expect(server).toEqual(asStringKeys(STAR_FLEE_CHANCE));
  });

  it("DEFAULT_STAR_DAMAGE matches STAR_ATTACK_DAMAGE (src/lib/encounterStars.ts)", () => {
    // The server names its mirror DEFAULT_STAR_DAMAGE; same table.
    const server = parseFlatTable(extractObjectLiteral(serverSrc, "DEFAULT_STAR_DAMAGE"));
    expect(server).toEqual(asStringKeys(STAR_ATTACK_DAMAGE));
  });

  it("STARTER_DEX matches src/lib/starters.ts", () => {
    const server = parseNumberSet(serverSrc, "STARTER_DEX");
    expect(server).toEqual([...STARTER_DEX]);
  });
});
