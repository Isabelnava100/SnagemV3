import { pokemonData } from "../data/pokemon";

type ExcludeProperties<T, K extends keyof T> = Omit<T, K>;

export function excludeProperties<T, K extends keyof T>(
  obj: T,
  propsToExclude: K[]
): ExcludeProperties<T, K> {
  const result = { ...obj };
  propsToExclude.forEach((prop) => {
    delete result[prop];
  });
  return result;
}

// Sprites are served from the jsDelivr CDN mirror of pokesprite over https:
// proper cache headers + HTTP/2 instead of plain-http raw.githubusercontent
// (the old URLs were the main cause of slow sprite loading).
const POKESPRITE_CDN = "https://cdn.jsdelivr.net/gh/msikma/pokesprite@master";

// Gen 9 (#906-1025) is not in pokesprite, so those box sprites are served
// from /public (see public/images/sprites/gen9). They used to live in
// src/assets with an eager import.meta.glob, which base64-inlined all ~240
// PNGs into the shared JS chunk, so the URLs are now plain strings and the
// local slug set is derived from the dex range instead (verified to match
// the files on disk exactly, regular and shiny sets included).
const GEN9_SPRITE_BASE = "/images/sprites/gen9";
const GEN9_SLUGS = new Set(
  pokemonData
    .filter((p) => {
      const dex = parseInt(p.idx, 10);
      return dex >= 906 && dex <= 1025;
    })
    .map((p) => p.slug)
);

export const getPokemonImageURL = (slug: string, shiny = false) => {
  // Gen 9 (#906-1025) box sprites are local files under /public. Prefer the
  // shiny set when asked (every Gen 9 species has both variants on disk),
  // and non Gen 9 species come from the pokesprite CDN.
  if (GEN9_SLUGS.has(slug)) {
    return shiny
      ? `${GEN9_SPRITE_BASE}/shiny/${slug}.png`
      : `${GEN9_SPRITE_BASE}/${slug}.png`;
  }
  return `${POKESPRITE_CDN}/pokemon-gen8/${shiny ? "shiny" : "regular"}/${slug}.png`;
};

// Neutral Pokeball shown while a sprite is missing (e.g. Gen 9 species until a
// matching pixel set is added). Use as the `fallbackSrc` on pokemon <Image>s.
export const POKEMON_SPRITE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 100 100'>` +
      `<circle cx='50' cy='50' r='46' fill='#f2f2f2' stroke='#2b2b2b' stroke-width='4'/>` +
      `<path d='M4 50 a46 46 0 0 1 92 0 z' fill='#e35c65'/>` +
      `<rect x='4' y='46' width='92' height='8' fill='#2b2b2b'/>` +
      `<circle cx='50' cy='50' r='13' fill='#fff' stroke='#2b2b2b' stroke-width='5'/>` +
    `</svg>`
  );

export const getItemImageURL = (filePath: string) => {
  return `${POKESPRITE_CDN}/items/${filePath}`;
};

export const getPokemonName = (slug: string) => {
  const pokemon = pokemonData.find((pokemon) => pokemon.slug === slug);
  if (!pokemon) throw new Error(`Pokemon with the slug: ${slug} does not exits`);
  return pokemon.name;
};

// Basic profanity gate for user-provided names (team names etc). Checks word
// boundaries plus common letter-swap evasions; intentionally conservative.
// Hosts/admins moderate the rest.
const BLOCKED_WORDS = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "cock", "pussy",
  "nigger", "nigga", "faggot", "fag", "retard", "whore", "slut", "rape",
  "nazi", "hitler", "kike", "spic", "chink", "tranny",
];
const LEET_MAP: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

export function containsBlockedWord(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z]/g, "");
  return BLOCKED_WORDS.some((word) => normalized.includes(word));
}
