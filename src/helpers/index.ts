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

export const getPokemonImageURL = (slug: string) => {
  const url = "http://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/shiny";
  const extension = "png";
  return `${url}/${slug}.${extension}`;
};

export const getItemImageURL = (filePath: string) => {
  const url = "http://raw.githubusercontent.com/msikma/pokesprite/master/items";
  return `${url}/${filePath}`;
};

export const getPokemonName = (slug: string) => {
  const pokemon = pokemonData.find((pokemon) => pokemon.slug === slug);
  if (!pokemon) throw new Error(`Pokemon with the slug: ${slug} does not exits`);
  return pokemon.name;
};
