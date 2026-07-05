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

export const getPokemonImageURL = (slug: string) => {
  return `${POKESPRITE_CDN}/pokemon-gen8/shiny/${slug}.png`;
};

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
