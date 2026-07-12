// Seed default encounter lists for every mission in the Vault.
//
// For each mission this writes:
//   1. missions/{id}: encounterListId, encounters (full pool), requiredEncounters
//      (the briefing's set foes: the minimum to beat for the grade),
//      encounterMode ("choose": members decide when to face each opponent)
//      and encounterLimit.
//   2. admin/pokemon_lists.{mission-<id>}: the pool as a pokemon list with
//      missionDefault: true, so pickUpMission can attach it while the Library's
//      Field Registers and the host picker keep showing only manual lists.
//
// Pools = the briefing's named opposition plus wilds that fit the mission's
// location, so members can take on more than just the set foes.
//
// Idempotent: fixed ids + merge writes; re-running updates in place.
//
// Validate the slug table without touching Firestore:
//   node scripts/seed-mission-encounters.mjs --check
// Seed (run from the functions/ dir, needs application-default credentials):
//   node scripts/seed-mission-encounters.mjs

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const pokemonJSON = JSON.parse(readFileSync(resolve(here, "../src/pokemon.json"), "utf8"));
const knownSlugs = new Set(Object.values(pokemonJSON).map((p) => p.slug?.eng).filter(Boolean));

// missionId -> { required: set foes named in the briefing, extras: location wilds }
const ENCOUNTERS = {
  // Lumiose Gang runs Dark-types; the whole crew is the briefing's opposition.
  "special-delivery": {
    required: ["sandile", "vullaby", "pancham", "pawniard", "scraggy", "purrloin", "poochyena", "sneasel"],
    extras: ["espurr", "litleo", "furfrou", "murkrow", "gothita"],
  },
  // Performance job; combat only if caught stealing, so nothing is required.
  "you-better-work": {
    required: [],
    extras: ["furfrou", "espurr", "litleo", "pikachu", "fletchling", "purrloin"],
  },
  harassment: {
    required: ["houndour", "electrike"],
    extras: ["litleo", "espurr", "furfrou", "fletchling", "gulpin"],
  },
  "sparring-partner": {
    required: ["tyrogue"],
    extras: ["machop", "mankey", "meowth", "pidgey", "rattata", "drowzee", "abra"],
  },
  "energy-war": {
    required: ["elekid", "magby"],
    extras: ["magnemite", "pidove", "patrat", "growlithe", "koffing"],
  },
  "an-ashy-situation": {
    required: ["poochyena", "zubat", "numel", "baltoy", "spinda"],
    extras: ["slugma", "skarmory", "sandshrew"],
  },
  "rod-thief": {
    required: ["poochyena", "carvanha", "zubat", "corphish"],
    extras: ["makuhita", "wingull", "tentacool", "magikarp"],
  },
  "schoolyard-brawl": {
    required: ["mime-jr"],
    extras: ["glameow", "stunky", "bidoof", "starly", "shinx", "abra", "croagunk"],
  },
  "breeding-center-infestation": {
    required: ["caterpie", "weedle", "ledyba", "spinarak", "pineco", "yanma"],
    extras: ["drowzee", "rattata", "pidgey", "snubbull"],
  },
  "cheap-shot": {
    required: ["rattata", "pidgey", "koffing", "ekans"],
    extras: ["spearow", "nidoran-f", "nidoran-m"],
  },
  "trouble-at-kranes-lab": {
    required: ["teddiursa", "slakoth"],
    extras: ["zigzagoon", "whismur", "machop", "makuhita"],
  },
  "floccesy-ranch-liberation": {
    required: ["trubbish", "woobat", "scraggy", "purrloin"],
    extras: ["mareep", "riolu", "azurill", "patrat", "lillipup", "psyduck"],
  },
  // The grunt's roster is unspecified, so nothing is required; the pool covers
  // typical Rocket picks plus Johto route wilds around the centers.
  "definitely-nurse-joy": {
    required: [],
    extras: ["zubat", "ekans", "koffing", "rattata", "sentret", "hoothoot", "geodude", "houndour"],
  },
  "rock-a-bye-trainer": {
    required: ["caterpie", "weedle", "pidgey", "spearow", "cleffa", "igglybuff", "smoochum"],
    extras: ["pikachu", "kakuna", "metapod"],
  },
  "tampered-potions": {
    required: ["oddish", "bellsprout"],
    extras: ["gulpin", "budew", "skiddo", "flabebe"],
  },
  "do-ya-dig-it": {
    required: [],
    extras: ["onix", "cubone", "kangaskhan", "mawile", "lunatone", "solrock", "machop", "rhyhorn", "woobat"],
  },
  "escorting-the-escort": {
    required: [],
    extras: ["tentacool", "tentacruel", "wingull", "magikarp", "staryu", "zubat", "geodude", "wooper", "quagsire", "ekans", "raticate"],
  },
  "a-psycho-runs-our-motel": {
    required: ["zoroark", "noctowl", "trevenant"],
    extras: ["gastly", "phantump", "pumpkaboo", "misdreavus", "hoothoot"],
  },
  "tower-troubles": {
    required: ["gastly", "haunter", "cubone", "gengar"],
    extras: ["zubat", "rattata"],
  },
  "the-black-pearl": {
    required: ["tentacool", "wailmer"],
    extras: ["houndour", "inkay", "binacle", "wingull", "luvdisc", "staryu"],
  },
  "no-pressure-no-diamonds": {
    required: ["croagunk", "glameow", "elgyem"],
    extras: ["geodude", "onix", "machop", "zubat", "bronzor", "nosepass"],
  },
  "way-of-the-samurai": {
    required: ["ninjask", "zangoose", "dewott", "scizor"],
    extras: ["meowth", "rattata", "drowzee", "snubbull"],
  },
  "the-rhyhorn-races": {
    required: ["rhyhorn"],
    extras: ["zorua", "ditto", "litleo", "riolu", "bunnelby", "farfetchd"],
  },
  "going-on-a-bear-hunt": {
    required: ["ursaring", "beartic", "pangoro"],
    extras: ["teddiursa", "cubchoo", "pancham", "combee", "cherubi", "budew"],
  },
  "sweet-eats": {
    required: ["shuckle", "swirlix", "combee", "tropius"],
    extras: ["spritzee", "flabebe", "skiddo", "bunnelby"],
  },
  "an-invasive-species": {
    required: ["sableye"],
    extras: ["boldore", "joltik", "klink", "ferroseed", "tynamo", "nosepass"],
  },
  "a-fishy-situation": {
    required: ["nuzleaf", "gulpin", "pelipper"],
    extras: ["wingull", "magikarp", "tentacool", "machoke", "zigzagoon"],
  },
  "thirst-for-knowledge": {
    required: [],
    extras: ["herdier", "watchog", "lillipup", "patrat", "archen", "tirtouga", "relicanth", "aerodactyl", "baltoy", "sigilyph"],
  },
  "how-you-play-the-game": {
    required: [],
    extras: ["machop", "machoke", "hitmonchan", "hitmonlee", "primeape", "raticate", "granbull", "miltank", "tauros"],
  },
  // The informant's four fully evolved Pokemon are the creator's choice.
  traitor: {
    required: [],
    extras: ["pangoro", "honchkrow", "drapion", "bisharp", "weavile", "houndoom"],
  },
  "the-dark-knight": {
    required: ["mr-mime", "feraligatr"],
    extras: ["scraggy", "scrafty", "pawniard", "sableye", "croagunk", "machop", "timburr", "sandile"],
  },
  blasphemy: {
    required: ["togekiss", "blissey", "gallade"],
    extras: ["glameow", "stunky", "murkrow", "chingling", "bronzor", "gastly"],
  },
  "why-were-here": {
    required: [],
    extras: ["magnemite", "magneton", "porygon", "klink", "klang", "elgyem", "beldum", "bronzor", "golett"],
  },
  "the-pokeball-factory": {
    required: [],
    extras: ["voltorb", "electrode", "magnemite", "klefki", "trubbish", "garbodor", "pikachu", "plusle", "minun"],
  },
  "crumbling-foundation": {
    required: ["corsola", "wailord", "azumarill"],
    extras: ["carvanha", "poochyena", "zubat", "tentacool", "wingull", "luvdisc"],
  },
  repurposing: {
    required: ["swellow", "ninetales", "flygon"],
    extras: ["numel", "poochyena", "zubat", "electrike", "plusle", "minun", "oddish"],
  },
  "tampered-balls": {
    required: [],
    extras: ["zubat", "houndour", "poochyena", "murkrow", "snubbull", "yanma", "misdreavus"],
  },
  "here-be-dragons": {
    required: ["arbok", "vileplume", "honchkrow", "lapras"],
    extras: ["dratini", "dragonair", "horsea", "seadra", "magikarp", "zubat", "ekans"],
  },
  "the-lost-woods": {
    required: ["hypno", "mismagius", "venusaur"],
    extras: ["drowzee", "gastly", "oddish", "gloom", "bellsprout", "weepinbell", "exeggcute", "pidgey"],
  },
  "a-jerk-in-the-woods": {
    required: ["growlithe", "staryu", "bellsprout"],
    extras: ["caterpie", "weedle", "pansage", "fletchling", "pikachu", "scatterbug"],
  },
  "ranch-wars": {
    required: [],
    extras: ["miltank", "tauros", "mareep", "skiddo", "gogoat", "bunnelby", "fletchling", "exeggcute"],
  },
  "natural-beauty": {
    required: ["flabebe", "skiploom"],
    extras: ["budew", "ledyba", "ralts", "combee", "skitty", "bidoof"],
  },
  "tag-youre-next": {
    required: ["delibird", "grimer", "abra", "smeargle"],
    extras: ["yungoos", "pikipek", "meowth", "rattata"],
  },
  "king-of-the-hill": {
    required: ["wishiwashi", "golisopod"],
    extras: ["dewpider", "surskit", "psyduck", "poliwag", "magikarp", "wingull", "wimpod"],
  },
  "protect-your-heart": {
    required: [],
    extras: ["rattata", "pidgey", "meowth", "growlithe", "eevee", "machop"],
  },
  "a-safari-hunt": {
    required: ["scyther"],
    extras: ["nidoran-f", "nidoran-m", "nidorina", "nidorino", "exeggcute", "rhyhorn", "chansey", "tauros", "kangaskhan", "parasect", "pinsir"],
  },
  "the-green-monster": {
    required: ["tyranitar"],
    extras: ["graveler", "lickitung", "gurdurr", "druddigon", "zweilous", "noibat", "lampent", "floatzel", "poliwhirl", "geodude"],
  },
  "lush-jungle-excursion": {
    required: ["lurantis"],
    extras: ["fomantis", "bounsweet", "steenee", "comfey", "oranguru", "passimian", "paras", "pinsir", "zubat", "ekans", "koffing"],
  },
  "the-annual-blackout": {
    required: ["electivire"],
    extras: ["elekid", "electabuzz", "magnemite", "grubbin", "charjabug", "togedemaru", "emolga"],
  },
  "pika-guards": {
    required: ["pikachu"],
    extras: ["salandit", "garbodor", "drowzee", "wingull", "pyukumuku", "corsola", "staryu", "sandygast"],
  },
  "trouble-in-the-tree": {
    required: ["braviary"],
    extras: ["golett", "sandile", "diggersby", "gible", "corphish", "skiddo", "weepinbell"],
  },
  "amity-square-vacation": {
    required: [],
    extras: ["pichu", "cleffa", "igglybuff", "happiny", "buneary", "pachirisu", "drifloon", "psyduck"],
  },
  "sniffing-out-the-culprit": {
    required: ["spritzee"],
    extras: ["stunky", "skuntank", "gloom", "vileplume", "garbodor", "trubbish", "koffing", "grimer", "gulpin"],
  },
  "a-new-sheriff-in-town": {
    required: ["honchkrow", "bisharp", "liepard"],
    extras: ["herdier", "growlithe", "watchog", "murkrow", "purrloin", "pawniard"],
  },
  "the-five-points": {
    required: ["falinks"],
    extras: ["scraggy", "pawniard", "purrloin", "liepard", "toxel", "zigzagoon", "morpeko"],
  },
  "death-race-on-the-water": {
    required: ["frogadier"],
    extras: ["skorupi", "drapion", "ariados", "crobat", "seviper", "tentacruel", "sharpedo", "croagunk", "toxicroak"],
  },
  "lethal-hour": {
    required: ["sawk"],
    extras: ["throh", "timburr", "gurdurr", "scraggy", "machop", "mienfoo"],
  },
  "unlock-potential": {
    required: [],
    extras: ["sneasel", "snover", "snorunt", "swinub", "meditite", "chingling", "bibarel", "zubat"],
  },
  "another-errand-run": {
    required: ["heliolisk"],
    extras: ["rattata", "pidgey", "zigzagoon", "bidoof", "patrat", "fletchling", "sentret", "lillipup"],
  },
  "careless-digging": {
    required: ["yamask", "durant"],
    extras: ["drilbur", "trapinch", "hippopotas", "silicobra", "skorupi"],
  },
  "turffield-harvest-festival": {
    required: ["gossifleur", "eldegoss"],
    extras: ["wooloo", "yamper", "skwovet", "rookidee", "nickit"],
  },
  "a-shadow-in-the-steam": {
    required: [],
    extras: ["snorunt", "snover", "cubchoo", "vanillite", "boldore", "klang", "stonjourner", "eiscue"],
  },
  "mushroom-picking": {
    required: [],
    extras: ["morelull", "shiinotic", "impidimp", "hatenna", "sinistea", "phantump", "swirlix", "scraggy", "thievul", "liepard"],
  },
  "five-isle-reclamation": {
    required: [],
    extras: ["zubat", "golbat", "ekans", "arbok", "rattata", "raticate", "koffing"],
  },
  "unusual-pattern": {
    required: [],
    extras: ["caterpie", "metapod", "weedle", "kakuna", "ledyba", "spinarak", "heracross", "farfetchd"],
  },
  "the-lizard-wheels": {
    required: ["cyclizar"],
    extras: ["lechonk", "pawmi", "fletchling", "houndour", "maschiff", "shroodle"],
  },
  "wish-upon-a-galarian-star": {
    required: [],
    extras: ["wooloo", "skwovet", "rookidee", "yamper", "drednaw", "corviknight", "snorlax", "boltund", "obstagoon"],
  },
  "hybrid-pride-and-prejudice": {
    required: [],
    extras: ["houndour", "houndoom", "growlithe", "litleo", "pyroar", "ninetales", "arcanine"],
  },
  "which-will-you-choose-paldea": {
    required: [],
    extras: ["pichu", "cleffa", "igglybuff", "togepi", "azurill", "happiny", "munchlax", "riolu"],
  },
};

// ---------------------------------------------------------------------------
// Validate slugs
// ---------------------------------------------------------------------------
let bad = 0;
for (const [missionId, cfg] of Object.entries(ENCOUNTERS)) {
  for (const slug of [...cfg.required, ...cfg.extras]) {
    if (!knownSlugs.has(slug)) {
      console.error(`Unknown slug "${slug}" in mission "${missionId}"`);
      bad++;
    }
  }
}
if (bad) {
  console.error(`${bad} unknown slug(s); fix the table before seeding.`);
  process.exit(1);
}
console.log(`Slug check passed: ${Object.keys(ENCOUNTERS).length} missions.`);
if (process.argv.includes("--check")) process.exit(0);

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const missionsSnap = await db.collection("missions").get();
const titles = new Map(missionsSnap.docs.map((d) => [d.id, d.data().title ?? d.id]));

const listUpdates = {};
let batch = db.batch();
let writes = 0;

for (const [missionId, cfg] of Object.entries(ENCOUNTERS)) {
  const pool = [...new Set([...cfg.required, ...cfg.extras])];
  const listId = `mission-${missionId}`;
  listUpdates[listId] = {
    name: `Mission: ${titles.get(missionId) ?? missionId}`,
    creator: "Snagem",
    pokemons: pool,
    public: false,
    rule: "only",
    missionDefault: true,
  };
  batch.set(
    db.doc(`missions/${missionId}`),
    {
      encounterListId: listId,
      encounters: pool,
      requiredEncounters: cfg.required,
      encounterMode: "choose",
      encounterLimit: 5,
    },
    { merge: true }
  );
  writes++;
  if (!titles.has(missionId)) {
    console.warn(`missions/${missionId} does not exist yet (fields will still be written).`);
  }
  if (writes % 400 === 0) {
    await batch.commit();
    batch = db.batch();
  }
}
batch.set(db.doc("admin/pokemon_lists"), listUpdates, { merge: true });
await batch.commit();

console.log(`Seeded encounter data for ${Object.keys(ENCOUNTERS).length} missions.`);
