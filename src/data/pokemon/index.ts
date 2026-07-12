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

  // JS object key order puts the zero-padded keys ("001".."099") after the
  // integer-like ones ("100"+), which made every dex listing start at #100.
  // Sort by numeric dex index so the Pokedex runs 1 -> 1025.
  formattedData.sort((a, b) => parseInt(a.idx, 10) - parseInt(b.idx, 10));

  return formattedData;
}

export const pokemonData = formatPokemonJSONData(pokemonJSONData);
