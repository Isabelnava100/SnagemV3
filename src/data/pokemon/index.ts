import pokemonJSONData from "./pokemon.json";

interface SinglePokemonData {
  name: string;
  idx: string;
  slug: string;
}

function formatPokemonJSONData(data: Record<string, any>): SinglePokemonData[] {
  const formattedData: SinglePokemonData[] = [];

  for (const key in data) {
    const pokemonData = data[key];
    const name = pokemonData.name.eng;
    const slug = pokemonData.slug.eng;
    const idx = pokemonData.idx;
    const sanitizedPokemon: SinglePokemonData = { name, idx, slug };
    formattedData.push(sanitizedPokemon);
  }

  return formattedData;
}

export const pokemonData = formatPokemonJSONData(pokemonJSONData);
