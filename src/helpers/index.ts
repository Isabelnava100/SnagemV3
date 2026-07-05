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
