// Seed the Snag Mall, Missions, and Research collections with starter content.
// Idempotent: uses fixed doc ids and merge writes, so re-running updates in place.
//
// Auth (run from the functions/ dir):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//   node scripts/seed.mjs
//
// Resolves item ids from the app's item catalog so bag items render correctly.

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const here = dirname(fileURLToPath(import.meta.url));
const itemJSON = JSON.parse(readFileSync(resolve(here, "../../src/data/item/item.json"), "utf8"));

// Build a "group/name" -> {itemId, name, filePath, category} lookup.
const byKey = new Map();
const titled = (raw, group) => {
  const t = raw.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  if (group === "ball") return `${t} Ball`;
  if (group === "berry") return `${t} Berry`;
  return t;
};
for (const k of Object.keys(itemJSON)) {
  const it = itemJSON[k];
  byKey.set(`${it.Group}/${it.Name}`, {
    itemId: it["Item ID"],
    name: titled(it.Name, it.Group),
    filePath: it.Filename,
    category: it.Group,
  });
}
// Resolve an item; falls back to a synthetic entry so a missing catalog row
// never aborts the seed (the id just will not match a real catalog sprite).
const item = (group, name, price) => {
  const found = byKey.get(`${group}/${name}`) || {
    itemId: `${group}-${name}`,
    name: titled(name, group),
    filePath: `${group}/${name}.png`,
    category: group,
  };
  return price === undefined ? found : { ...found, price };
};

// --------------------------------------------------------------------------
// Shops
// --------------------------------------------------------------------------
const shops = {
  "golden-sarcophagus": {
    name: "The Golden Sarcophagus",
    type: "General Store",
    kind: "store",
    currency: "pokecoin",
    npc_name: "Nebu",
    order: 1,
    active: true,
    flavor_intro:
      "<p>Yii em hotep! By Ra I welcome you to my humble shop. My name is Nebu. It has been such a long time since I have had customers, please, look around. I accept only gold (Snag Coins) here, so as long as you carry a piece of that precious substance you are welcome. Buy something, and if you do not see what you want in the rare section, return tomorrow: my rare wares change daily.</p>",
    sections: [
      {
        title: "Pokeballs",
        items: [
          item("ball", "poke", 5),
          item("ball", "great", 8),
          item("ball", "ultra", 12),
          item("ball", "net", 8),
        ],
      },
      {
        title: "Recovery",
        items: [item("medicine", "potion", 4), item("medicine", "super-potion", 8)],
      },
    ],
    rare_section: { rotates_daily: true, pool: [item("valuable", "nugget", 20)] },
  },
  "trash-shack": {
    name: "The Trash Shack",
    type: "Recycling Center",
    kind: "recycle",
    currency: "pokecoin",
    npc_name: "Garbodor",
    order: 2,
    active: true,
    flavor_intro: "<p>One trainer's junk is Garbodor's treasure. Hand over what you do not want and walk away with Snag Coins.</p>",
  },
  "kl-tours": {
    name: "K&L Nature Tours & Market",
    type: "RNG Tours",
    kind: "tour",
    currency: "pokecoin",
    npc_name: "Kai & Lyra",
    order: 3,
    active: true,
    flavor_intro: "<p>Pick a biome, pay your fare, and see what the wilds turn up. Every fourth tour is on the house.</p>",
  },
  evo: {
    name: "E.V.O.",
    type: "Move & Ability Studio",
    kind: "evo",
    currency: "snagemblem",
    npc_name: "Stuart",
    order: 4,
    active: true,
    flavor_intro: "<p>For Hybrids and Channelers who have cleared their first Master Mission. Unlock slots, learn moves, or swap an adaptation.</p>",
  },
};

// --------------------------------------------------------------------------
// Recipes (Ambrosial Alchemy)
// --------------------------------------------------------------------------
const pokeOut = item("ball", "poke");
const masterOut = item("ball", "master");
const greatOut = item("ball", "great");
const recipes = {
  "craft-poke-ball": {
    output_item_id: pokeOut.itemId,
    output_name: pokeOut.name,
    output_filePath: pokeOut.filePath,
    output_category: pokeOut.category,
    output_qty: 1,
    max_batch: 20,
    ingredients: [item("valuable", "apricorn") && { itemId: item("valuable", "apricorn").itemId, qty: 1 }].filter(Boolean),
    cost: { pokecoin: 2 },
    success_rate: 100,
    category: "Pokeballs",
    active: true,
  },
  "craft-great-ball": {
    output_item_id: greatOut.itemId,
    output_name: greatOut.name,
    output_filePath: greatOut.filePath,
    output_category: greatOut.category,
    output_qty: 1,
    max_batch: 10,
    ingredients: [],
    cost: { pokecoin: 6 },
    success_rate: 85,
    category: "Pokeballs",
    active: true,
  },
  "craft-master-ball": {
    output_item_id: masterOut.itemId,
    output_name: masterOut.name,
    output_filePath: masterOut.filePath,
    output_category: masterOut.category,
    output_qty: 1,
    max_batch: 1,
    ingredients: [],
    cost: { pokecoin: 25, snagemblem: 5 },
    success_rate: 60,
    category: "Pokeballs",
    active: true,
  },
};

// --------------------------------------------------------------------------
// Missions (Mission Vault)
// --------------------------------------------------------------------------
const missions = {
  "you-better-work": {
    title: "You Better Work", location: "Lumiose City, Kalos", tier: "Story", emblem_eligible: false,
    story: "<p>Team Snagem needs money to run, and you are how we stay running. Find some part-time work in Lumiose City: a hotel, a cafe, a taxi, grooming Pokemon. Earn some cash. Though it would be even better if you gave yourself a bonus, if you catch my drift. Consider it snagging, we are Snagems after all.</p>",
    objective: "Get a job and make some money, and take some too if you are feeling brave.",
    opposition: "If you get caught stealing you may be attacked. Otherwise you may have to use your Pokemon on the job.",
    pokemon_note: "None. You may receive an egg for a good job.",
    pokemon_reward: { kind: "egg", count: 1 }, coins: 3,
    active: true, order: 1,
  },
  "special-delivery": {
    title: "Special Delivery", location: "Lumiose City, Kalos", tier: "Standard", emblem_eligible: true,
    story: "<p>A package needs moving across town, and the Lumiose Gang wants it too. Get it to its destination.</p>",
    objective: "Deliver the package.", opposition: "Lumiose Gang (Dark types).",
    pokemon_reward: { kind: "snag", count: 1 }, coins: 3, active: true, order: 2,
  },
  harassment: {
    title: "Harassment", location: "Lumiose City, Kalos", tier: "Standard", emblem_eligible: true,
    story: "<p>A Team Flare grunt is shaking down locals. Put a stop to it, and pocket their Pokemon.</p>",
    objective: "Stop the shakedown.", opposition: "Team Flare Grunt.",
    pokemon_reward: { kind: "snag", count: 1 }, coins: 3, active: true, order: 3,
  },
  "sparring-partner": {
    title: "Sparring Partner", location: "Saffron City, Kanto", tier: "Standard", emblem_eligible: true,
    story: "<p>A wild Tyrogue wants a real fight. Earn its respect and it may join you.</p>",
    objective: "Best the Tyrogue.", opposition: "Wild Tyrogue.",
    pokemon_reward: { kind: "recruit", count: 1 }, coins: 2, active: true, order: 4,
  },
  "energy-war": {
    title: "Energy War", location: "Virbank Complex, Unova", tier: "Standard", emblem_eligible: true,
    story: "<p>The complex is overrun with wild Elekid and Magby. Catch one, restore the peace.</p>",
    objective: "Catch an Elekid or Magby.", opposition: "Wild Elekid and Magby.",
    pokemon_reward: { kind: "catch", count: 1 }, coins: 3, active: true, order: 5,
  },
  "an-ashy-situation": {
    title: "An Ashy Situation", location: "Route 113, Hoenn", tier: "Standard", emblem_eligible: true,
    story: "<p>Team Magma is up to something in the ashfall. Find out what, and snag their muscle.</p>",
    objective: "Investigate and snag.", opposition: "Team Magma Grunt.",
    pokemon_reward: { kind: "snag", count: 1 }, coins: 4, active: true, order: 6,
  },
  "rod-thief": {
    title: "Rod Thief", location: "Dewford Town, Hoenn", tier: "Standard", emblem_eligible: true,
    story: "<p>Team Aqua swiped an old fisherman's rod. Get it back, the reward is the rod itself.</p>",
    objective: "Recover the Old Rod.", opposition: "Team Aqua Grunt.",
    pokemon_reward: { kind: "snag", count: 1 }, coins: 3, special_item: "Old Rod", active: true, order: 7,
  },
  "schoolyard-brawl": {
    title: "Schoolyard Brawl", location: "Jubilife City, Sinnoh", tier: "Standard", emblem_eligible: true,
    story: "<p>Two Galactic grunts are picking on trainees. Even the odds, two snags on the table.</p>",
    objective: "Break up the fight.", opposition: "2 Team Galactic Grunts.",
    pokemon_reward: { kind: "snag", count: 1 }, coins: 4, active: true, order: 8,
  },
};

// --------------------------------------------------------------------------
// K&L loot tables (partial; ranges cover 1..120, last entry is the fallback)
// --------------------------------------------------------------------------
const loot = (group, name, min, max) => ({ ...item(group, name), min, max });
const kl = {
  "Cool Canyon": [
    loot("valuable", "pearl", 1, 30), loot("valuable", "big-pearl", 31, 50),
    loot("berry", "oran", 51, 80), loot("berry", "leppa", 81, 110), loot("valuable", "nugget", 111, 120),
  ],
  "Beautiful Meadow": [
    loot("valuable", "star-piece", 1, 25), loot("valuable", "stardust", 26, 55),
    loot("berry", "sitrus", 56, 90), loot("berry", "chesto", 91, 120),
  ],
  "Cute Forest": [
    loot("valuable", "tiny-mushroom", 1, 40), loot("valuable", "big-mushroom", 41, 70),
    loot("berry", "pecha", 71, 100), loot("valuable", "nugget", 101, 120),
  ],
  "Clever Swamp": [
    loot("valuable", "rare-bone", 1, 30), loot("valuable", "pretty-wing", 31, 70),
    loot("berry", "rawst", 71, 110), loot("valuable", "big-nugget", 111, 120),
  ],
  "Tough Peak": [
    loot("valuable", "nugget", 1, 30), loot("valuable", "big-nugget", 31, 45),
    loot("berry", "aspear", 46, 90), loot("berry", "leppa", 91, 120),
  ],
};

// --------------------------------------------------------------------------
// Research config
// --------------------------------------------------------------------------
const fossil = (name, slug) => [item("valuable", name).itemId, slug];
const research_config = {
  fossilCost: 5,
  masterMissionsPerType: 10,
  channelerTypes: ["Fairy", "Ghost", "Psychic", "Water", "Ground", "Flying", "Poison", "Dark"],
  fossilMap: Object.fromEntries([
    fossil("old-amber", "aerodactyl"),
    fossil("helix-fossil", "omanyte"),
    fossil("dome-fossil", "kabuto"),
    fossil("sail-fossil", "amaura"),
    fossil("skull-fossil", "cranidos"),
    fossil("root-fossil", "lileep"),
  ]),
};

// --------------------------------------------------------------------------
// Colosseum: battle rankings, hall of fame, tournaments
// --------------------------------------------------------------------------
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const rankingRows = [
  ["Atlantis_Darts", 76], ["Blizzard120", 54], ["SubonicXP", 54], ["Darksol88", 30],
  ["Ant", 22], ["RCCaughtem", 15], ["Dragon", 8], ["Kaya", 7],
];
const battle_rankings = Object.fromEntries(
  rankingRows.map(([username, points]) => [slug(username), { username, points }])
);

const hall_of_fame = {
  "summer-cup-2020": { tournament_name: "Snagem Summer Cup", year: 2020, winner: "Atlantis_Darts", order: 1 },
  "monotype-cup-2020": { tournament_name: "Snagem Monotype Cup", year: 2020, winner: "Darksol88", order: 2 },
  "winter-cup-2021": { tournament_name: "Snagem Winter Cup", year: 2021, winner: "Blizzard120", order: 3 },
};

const tournaments = {
  "paldea-cup": {
    name: "Team Snagem Paldea Cup",
    game_generation: "Gen 9 (Paldea)",
    format: "Double elimination, singles, 6v6",
    status: "upcoming",
    order: 1,
    rules:
      "<ul><li>Paldea Dex only, no legendaries or Paradox Pokemon (Charizard and Cinderace excluded).</li><li>No duplicate species.</li><li>No hacked or altered Pokemon (permanent disqualification).</li><li>Auto-loss if you KO your own last Pokemon via Self-Destruct, Explosion, Destiny Bond or Perish Song.</li><li>Terastallization allowed. The move Last Respects is banned.</li><li>Register one Battle Team at sign-up, no mid-tournament changes.</li></ul>",
    prizes: {
      "1st": ["$20 gift code", "2 Snag Emblems", "Discord role", "Paradox Pokemon set"],
      "2nd": ["$10 gift code", "2 Snag Emblems", "Shiny starter set"],
      "3rd": ["2 Snag Emblems", "40 Snag Coins"],
      participation: ["1 Snag Emblem", "raffle entry"],
    },
  },
};

// --------------------------------------------------------------------------
// Challenges: gym regions + island trials
// --------------------------------------------------------------------------
const gym = (order, leaderName, type) => ({ order, leaderName, type, battleFormat: "single", challengerPokemonLimit: Math.min(6, 1 + order) });
const gymRegions = {
  kanto: {
    name: "Kanto", order: 1,
    gyms: [
      gym(1, "Brock", "Rock"), gym(2, "Misty", "Water"), gym(3, "Lt. Surge", "Electric"),
      gym(4, "Erika", "Grass"), gym(5, "Koga", "Poison"), gym(6, "Sabrina", "Psychic"),
      gym(7, "Blaine", "Fire"), gym(8, "Giovanni", "Ground"),
    ],
    eliteFour: { members: [{ name: "Lorelei", type: "Ice" }, { name: "Bruno", type: "Fighting" }, { name: "Agatha", type: "Ghost" }, { name: "Lance", type: "Dragon" }], champion: { name: "Blue" } },
    championPrize: "Beat Champion Blue for a rare Kanto starter egg and the Kanto Champion title.",
  },
  johto: {
    name: "Johto", order: 2,
    gyms: [
      gym(1, "Falkner", "Flying"), gym(2, "Bugsy", "Bug"), gym(3, "Whitney", "Normal"),
      gym(4, "Morty", "Ghost"), gym(5, "Chuck", "Fighting"), gym(6, "Jasmine", "Steel"),
      gym(7, "Pryce", "Ice"), gym(8, "Clair", "Dragon"),
    ],
    eliteFour: { members: [{ name: "Will", type: "Psychic" }, { name: "Koga", type: "Poison" }, { name: "Bruno", type: "Fighting" }, { name: "Karen", type: "Dark" }], champion: { name: "Lance" } },
    championPrize: "Beat Champion Lance for a rare Johto starter egg and the Johto Champion title.",
  },
  hoenn: {
    name: "Hoenn", order: 3,
    gyms: [
      gym(1, "Roxanne", "Rock"), gym(2, "Brawly", "Fighting"), gym(3, "Wattson", "Electric"),
      gym(4, "Flannery", "Fire"), gym(5, "Norman", "Normal"), gym(6, "Winona", "Flying"),
      gym(7, "Tate & Liza", "Psychic"), gym(8, "Wallace", "Water"),
    ],
    eliteFour: { members: [{ name: "Sidney", type: "Dark" }, { name: "Phoebe", type: "Ghost" }, { name: "Glacia", type: "Ice" }, { name: "Drake", type: "Dragon" }], champion: { name: "Steven" } },
    championPrize: "Beat Champion Steven for a rare Hoenn starter egg and the Hoenn Champion title.",
  },
};

const trial = (order, id, island, name, type, extra) => [id, { order, island, name, type, ...extra }];
const islandTrials = Object.fromEntries([
  trial(1, "verdant-cave", "Melemele", "Verdant Cave", "Normal", { captain: "Ilima", totemPokemon: "Gumshoos", snagCoins: 5 }),
  trial(2, "grand-hala", "Melemele", "Grand Trial: Hala", "Fighting", { grand: true, kahuna: "Hala", zCrystalReward: "Fightinium Z" }),
  trial(3, "brooklet-hill", "Akala", "Brooklet Hill", "Water", { captain: "Lana", totemPokemon: "Wishiwashi", snagCoins: 6 }),
  trial(4, "wela-volcano", "Akala", "Wela Volcano", "Fire", { captain: "Kiawe", totemPokemon: "Salazzle", snagCoins: 6 }),
  trial(5, "lush-jungle", "Akala", "Lush Jungle", "Grass", { captain: "Mallow", totemPokemon: "Lurantis", snagCoins: 6 }),
  trial(6, "grand-olivia", "Akala", "Grand Trial: Olivia", "Rock", { grand: true, kahuna: "Olivia", zCrystalReward: "Rockium Z" }),
  trial(7, "hokulani-obs", "Ula'ula", "Hokulani Obs.", "Electric", { captain: "Sophocles", totemPokemon: "Vikavolt", snagCoins: 8 }),
  trial(8, "abandoned-megamart", "Ula'ula", "Abandoned Megamart", "Ghost", { captain: "Acerola", totemPokemon: "Mimikyu", snagCoins: 8 }),
  trial(9, "grand-nanu", "Ula'ula", "Grand Trial: Nanu", "Dark", { grand: true, kahuna: "Nanu", zCrystalReward: "Darkinium Z" }),
  trial(10, "vast-poni-canyon", "Poni", "Vast Poni Canyon", "Dragon", { totemPokemon: "Kommo-o", snagCoins: 10 }),
  trial(11, "grand-hapu", "Poni", "Grand Trial: Hapu", "Ground", { grand: true, kahuna: "Hapu", zCrystalReward: "Groundium Z" }),
]);

// --------------------------------------------------------------------------
// Write everything
// --------------------------------------------------------------------------
async function run() {
  const batch = db.batch();
  for (const [id, data] of Object.entries(shops)) batch.set(db.doc(`shops/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(recipes)) batch.set(db.doc(`recipes/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(missions)) batch.set(db.doc(`missions/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(battle_rankings)) batch.set(db.doc(`battle_rankings/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(hall_of_fame)) batch.set(db.doc(`hall_of_fame/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(tournaments)) batch.set(db.doc(`tournaments/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(gymRegions)) batch.set(db.doc(`gymRegions/${id}`), data, { merge: true });
  for (const [id, data] of Object.entries(islandTrials)) batch.set(db.doc(`islandTrials/${id}`), data, { merge: true });
  batch.set(db.doc("admin/kl_loot_tables"), kl, { merge: true });
  batch.set(db.doc("admin/research_config"), research_config, { merge: true });
  await batch.commit();
  console.log(
    `Seeded: ${Object.keys(shops).length} shops, ${Object.keys(recipes).length} recipes, ` +
      `${Object.keys(missions).length} missions, ${Object.keys(battle_rankings).length} rankings, ` +
      `${Object.keys(hall_of_fame).length} hall-of-fame, ${Object.keys(tournaments).length} tournaments, ` +
      `${Object.keys(gymRegions).length} gym regions, ${Object.keys(islandTrials).length} island trials, ` +
      `${Object.keys(kl).length} loot tables, research_config.`
  );
  process.exit(0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
