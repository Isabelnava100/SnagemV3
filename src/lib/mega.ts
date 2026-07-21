/**
 * Mega Evolution forms. A per-post activation, NOT a permanent evolution: the
 * Mega Stone is required but never consumed (like a fishing rod), and the form
 * lasts only the post it is used on. Sprites use pokesprite's "-mega" /
 * "-mega-x" / "-mega-y" slugs. Mirror of MEGA_STONE_SPECIES / MEGA_FORMS in
 * functions/src/index.ts; keep the two in sync when new megas are added.
 */

export interface MegaForm {
  stone: string;
  name: string;
  slug: string;
}

const MEGA_STONE_SPECIES: Record<string, string> = {
  Abomasite: "abomasnow", Absolite: "absol", Aerodactylite: "aerodactyl", Aggronite: "aggron",
  Alakazite: "alakazam", Altarianite: "altaria", Ampharosite: "ampharos", Audinite: "audino",
  Banettite: "banette", Beedrillite: "beedrill", Blastoisinite: "blastoise", Blazikenite: "blaziken",
  Cameruptite: "camerupt", "Charizardite X": "charizard", "Charizardite Y": "charizard",
  Diancite: "diancie", Galladite: "gallade", Garchompite: "garchomp", Gardevoirite: "gardevoir",
  Gengarite: "gengar", Glalitite: "glalie", Gyaradosite: "gyarados", Heracronite: "heracross",
  Houndoominite: "houndoom", Kangaskhanite: "kangaskhan", Latiasite: "latias", Latiosite: "latios",
  Lopunnite: "lopunny", Lucarionite: "lucario", Manectite: "manectric", Mawilite: "mawile",
  Medichamite: "medicham", "Mewtwonite X": "mewtwo", "Mewtwonite Y": "mewtwo",
  Metagrossite: "metagross", Pidgeotite: "pidgeot", Pinsirite: "pinsir",
  Sablenite: "sableye", Salamencite: "salamence", Sceptilite: "sceptile", Scizorite: "scizor",
  Sharpedonite: "sharpedo", Slowbronite: "slowbro", Steelixite: "steelix", Swampertite: "swampert",
  Tyranitarite: "tyranitar", Venusaurite: "venusaur",
};

const cap = (s: string) =>
  s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export const MEGA_FORMS: Record<string, MegaForm[]> = (() => {
  const out: Record<string, MegaForm[]> = {};
  for (const [stone, species] of Object.entries(MEGA_STONE_SPECIES)) {
    const xy = stone.endsWith(" X") ? "x" : stone.endsWith(" Y") ? "y" : "";
    const slug = xy ? `${species}-mega-${xy}` : `${species}-mega`;
    const name = `Mega ${cap(species)}${xy ? ` ${xy.toUpperCase()}` : ""}`;
    if (!out[species]) out[species] = [];
    out[species].push({ stone, name, slug });
  }
  return out;
})();

/** Mega forms available to a species slug ([] if it cannot Mega Evolve). */
export function megaFormsForSlug(slug: string): MegaForm[] {
  return MEGA_FORMS[slug] ?? [];
}
