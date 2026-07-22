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
// Obtainability rarity tiers (src/lib/itemRarity.ts), used to auto-complete the
// core shop sections without mixing epic items into common shelves.
const rarityByItem = JSON.parse(
  readFileSync(resolve(here, "../../src/data/item/rarityByItem.json"), "utf8")
);

// Build a "group/name" -> {itemId, name, filePath, category} lookup.
const byKey = new Map();
const titled = (raw, group) => {
  const t = raw.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  if (group === "ball") return `${t} Ball`;
  if (group === "berry") return `${t} Berry`;
  if (group === "apricorn") return `${t} Apricorn`;
  return t;
};
for (const k of Object.keys(itemJSON)) {
  const it = itemJSON[k];
  const entry = {
    itemId: it["Item ID"],
    name: titled(it.Name, it.Group),
    filePath: it.Filename,
    category: it.Group,
  };
  byKey.set(`${it.Group}/${it.Name}`, entry);
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

// Match a shop item by its human display name (accent/punctuation-insensitive)
// against the catalog, so shop entries can be listed by their forum names and
// still resolve to a real itemId + sprite. Falls back to a synthetic entry.
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const byDisplay = new Map();
for (const e of byKey.values()) if (!byDisplay.has(norm(e.name))) byDisplay.set(norm(e.name), e);
/** named(displayName, price, description) -> shop item with itemId/filePath resolved. */
const named = (displayName, price, description) => {
  const found = byDisplay.get(norm(displayName)) || {
    itemId: norm(displayName).replace(/ /g, "-"),
    name: displayName,
    filePath: "",
    category: "other-item",
  };
  return { ...found, name: displayName, price, description };
};

// Every catalog item of a group at a given rarity tier (obtainability batch).
const groupTier = (group, tier) =>
  [...byKey.values()].filter((e) => e.category === group && (rarityByItem[e.itemId] ?? 2) === tier);
// Keep a section's hand-listed (flavored) entries and append the remaining
// same-group, same-tier catalog items so the whole tier is obtainable.
const fillTier = (items, group, tier, price) => {
  const have = new Set(items.map((i) => i.itemId));
  const extra = groupTier(group, tier)
    .filter((e) => !have.has(e.itemId))
    .map((e) => ({ ...e, price }));
  return [...items, ...extra];
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
          named("Poke Ball", 5, "A standard ball. Can catch first-stage and non-evolving Pokemon, but not baby Pokemon."),
          named("Premier Ball", 6, "A special edition of the normal Poke Ball. Has the same limitations as one."),
          named("Great Ball", 7, "A higher-rate ball. Can catch up to second-stage Pokemon."),
          named("Ultra Ball", 9, "An ultra-grade ball. Can catch any stage of Pokemon, but won't work on baby or legendary Pokemon."),
          named("Nest Ball", 6, "A unique ball that's cozier for baby Pokemon and allows them to be caught. Works like a Poke Ball otherwise."),
          named("Heal Ball", 7, "A remedial ball that allows captured Pokemon to be used immediately in a Mission. Works like a Great Ball otherwise."),
          named("Dive Ball", 7, "A unique ball that's more effective on Water-type Pokemon. Can catch any stage of that type."),
          named("Net Ball", 7, "A unique ball that can catch Water and Bug-type Pokemon of any stage."),
          named("Dusk Ball", 8, "A unique ball meant for dark environments. Also more effective on Dark and Ghost-type Pokemon of any stage."),
          named("Quick Ball", 6, "A ball whose effects are only usable during Safari Contests. Works best if used on the first encounter."),
          named("Timer Ball", 6, "A ball whose effects are only usable during Safari Contests. Works best if it's the last ball used."),
          named("Repeat Ball", 12, "A ball whose effects are only usable during Safari Contests. Allows for a fourth capture attempt."),
          named("Dream Ball", 8, "A ball whose effects are only usable during Safari Contests. Works best if a sleep-inducing move is used beforehand. Works like a Poke Ball otherwise."),
        ],
      },
      {
        title: "Medicine",
        items: [
          named("Potion", 1, "Standard wound medicine. Slightly heals a Pokemon's wounds."),
          named("Super Potion", 2, "A higher-grade potion. Moderately heals wounds."),
          named("Hyper Potion", 3, "An even higher-grade medicine than Super Potion. Heals most wounds."),
          named("Max Potion", 4, "The highest-grade potion. Heals all wounds when applied."),
          named("Paralyze Heal", 1, "A medicine made from Cheri Berries. Heals paralysis."),
          named("Antidote", 1, "A medicine made from Pecha Berries. Neutralizes most poisons."),
          named("Burn Heal", 1, "A medicine made from Rawst Berries. Apply to affected area to heal burns."),
          named("Awakening", 1, "A medicine made from Chesto Berries. Stimulates Pokemon and wakes them from sleep."),
          named("Ice Heal", 1, "A medicine made from Aspear Berries. Rapidly thaws out frozen Pokemon."),
          named("Full Heal", 3, "A special medicine made with Lum Berry extract. Heals most status effects."),
          named("Full Restore", 5, "A potent medicine that combines the effects of a Max Potion and Full Heal. Heals all wounds and most status effects."),
          named("Revive", 3, "A potion of sorts that has smelling salts added in. Rouses a fainted Pokemon and heals some of their wounds."),
          named("Max Revive", 5, "A Max Potion with added smelling salts. Rouses a fainted Pokemon and fully heals their wounds."),
          named("Heal Powder", 1, "Heals Pokemon of all status ailments but reduces Evo Points by 1 and Happiness by 0.50 point."),
          named("Energy Powder", 1, "Restores 60 HP but reduces Evo Points by 1 and Happiness by 0.50 point."),
          named("Energy Root", 2, "Restores 120 HP but reduces Evo Points by 1 and Happiness by 0.50 point."),
          named("Revival Herb", 3, "Revives Pokemon to full HP but reduces Evo Points by 2 and Happiness by 1 point."),
          named("Joy Scent", 4, "A special scent that relaxes shadowfied Pokemon. Can be used with certain Snag Machine upgrades, or by itself to grant 1 extra Purification Point in a Mission's rewards."),
          named("Excite Scent", 5, "A special scent that relaxes shadowfied Pokemon. Can be used with certain Snag Machine upgrades, or by itself to grant 2 extra Purification Points in a Mission's rewards."),
          named("Vivid Scent", 6, "A special scent that relaxes shadowfied Pokemon. Can be used with certain Snag Machine upgrades, or by itself to grant 3 extra Purification Points in a Mission's rewards."),
          named("Shadow Vaccine", 15, "A vaccine made thanks to Devon Corp's research and a Mew's DNA. Inoculates a Pokemon when used, allowing them to be purified once infected by the Shadow Virus."),
        ],
      },
      {
        title: "Berries",
        items: [
          named("Cheri Berry", 4, "A berry to be held by a Pokemon. Heals paralysis when consumed."),
          named("Chesto Berry", 4, "A berry to be held by a Pokemon. Wakes a Pokemon from sleep when consumed."),
          named("Pecha Berry", 4, "A berry to be held by a Pokemon. Neutralizes poisons when consumed."),
          named("Rawst Berry", 4, "A berry to be held by a Pokemon. Soothes and heals burns when consumed."),
          named("Aspear Berry", 4, "A berry to be held by a Pokemon. Rapidly thaws frozen Pokemon when consumed, somehow."),
          named("Persim Berry", 4, "A berry to be held by a Pokemon. Snaps Pokemon out of confusion when consumed."),
          named("Leppa Berry", 4, "A berry to be held by a Pokemon. Immediately fills the Pokemon with a burst of energy when consumed, allowing them to continue using their moves."),
          named("Oran Berry", 1, "A berry to be held by a Pokemon. Heals very simple wounds when consumed."),
          named("Sitrus Berry", 3, "A berry to be held by a Pokemon. Heals some wounds when consumed."),
        ],
      },
      {
        title: "Battle Items",
        items: [
          named("X Attack", 2, "Sharply raises Attack when used. Can be stacked with certain Snag Machine upgrades."),
          named("X Defend", 2, "Sharply raises Defense when used. Can be stacked with certain Snag Machine upgrades."),
          named("X Special", 2, "Sharply raises Special Attack when used. Can be stacked with certain Snag Machine upgrades."),
          named("X Sp. Def", 2, "Sharply raises Special Defense when used. Can be stacked with certain Snag Machine upgrades."),
          named("X Speed", 2, "Sharply raises Speed when used. Can be stacked with certain Snag Machine upgrades."),
          named("Guard Spec.", 2, "Covers the area in mist when used, preventing stat reductions for a while."),
          named("Dire Hit", 2, "Makes hitting weak spots more likely when used."),
          named("Poke Doll", 5, "A doll designed to look like a particular Pokemon. Can be used as a decoy to escape some battles or attacks, but will be destroyed afterward."),
        ],
      },
      {
        title: "Type-Boost Held Items",
        items: [
          ["Black Belt", "Fighting"], ["Black Glasses", "Dark"], ["Charcoal", "Fire"], ["Dragon Fang", "Dragon"],
          ["Fairy Feather", "Fairy"], ["Hard Stone", "Rock"], ["Magnet", "Electric"], ["Miracle Seed", "Grass"],
          ["Mystic Water", "Water"], ["Never-Melt Ice", "Ice"], ["Poison Barb", "Poison"], ["Sharp Beak", "Flying"],
          ["Silk Scarf", "Normal"], ["Silver Powder", "Bug"], ["Soft Sand", "Ground"], ["Spell Tag", "Ghost"],
          ["Twisted Spoon", "Psychic"],
        ].map(([n, t]) => named(n, 10, `A held item that raises the power of the holder's ${t}-type moves.`)),
      },
      {
        title: "Held Items",
        items: [
          named("Elemental Gem", 2, "Gems commonly found in Unova, containing the energy of whatever type it is. Can boost attacks of their type once per gem, or alchemize certain items. All 18 types available."),
          named("Muscle Band", 10, "A strength-exuding headband to be held by a Pokemon. Slightly raises the power of Physical moves."),
          named("Wise Glasses", 10, "A thick pair of glasses to be held by a Pokemon. Slightly raises the power of Special moves."),
          named("Full Incense", 10, "An exotic-smelling incense to be held by a Pokemon. Makes the holder much slower."),
          named("Lax Incense", 10, "A beguiling incense to be held by a Pokemon. Rarely may cause attacks to miss the holder."),
          named("Odd Incense", 10, "An incense to be held by a Pokemon. Raises the power of Psychic-type moves."),
          named("Pure Incense", 10, "An incense to be held by a Pokemon. May repel weaker wild Pokemon during a Mission."),
          named("Rock Incense", 10, "A rugged-smelling incense to be held by a Pokemon. Raises the power of Rock-type moves."),
          named("Rose Incense", 10, "A floral incense to be held by a Pokemon. Raises the power of Grass-type moves."),
          named("Sea Incense", 10, "A sea-like incense to be held by a Pokemon. Raises the power of Water-type moves."),
          named("Wave Incense", 10, "An incense to be held by a Pokemon, reminiscent of the beach. Raises the power of Water-type moves."),
          named("Light Ball", 10, "A puzzling orb to be held by a Pikachu. Greatly raises Pikachu's offensive capabilities."),
          named("Lucky Punch", 10, "A pair of lucky boxing gloves to be held by Chansey. Allows Chansey to more easily hit weak spots."),
          named("Metal Powder", 10, "An extremely fine, yet hard powder to be held by Ditto. Boosts Ditto's Defense."),
          named("Quick Powder", 10, "An extremely fine, yet hard powder to be held by Ditto. Boosts Ditto's Speed."),
          named("Stick", 10, "A long, stiff stalk of leek to be held by Farfetch'd. Allows Farfetch'd to more easily hit weak spots."),
          named("Thick Club", 10, "A hard bone of some sort, to be held by Cubone and Marowak. Greatly boosts their Attack."),
          named("Absorb Bulb", 7, "A bulb to be held by a Pokemon. Boosts Special Attack once if hit by a Water-type attack, and is destroyed afterward."),
          named("Air Balloon", 8, "A balloon to be held by a Pokemon. Lifts them into the air to prevent Ground-type moves, but pops as soon as the holder is hit."),
          named("Assault Vest", 10, "An offensive vest to be held by a Pokemon. Boosts Special Defense, but prevents them from using any Status moves."),
          named("Big Root", 8, "A strange root to be held by a Pokemon. Makes health-draining attacks more efficient, restoring more health."),
          named("Binding Band", 7, "A constricting band to be held by a Pokemon. Increases the power of moves that bind the holder's opponents."),
          named("Black Sludge", 10, "A black glob of sludge to be held by a Pokemon. Gradually restores Poison-types, but damages all others."),
          named("Bright Powder", 10, "A highly reflective powder to be held by a Pokemon. Lowers opposing Pokemon's accuracy."),
          named("Cell Battery", 7, "A small battery to be held by a Pokemon. Boosts Attack once if hit by an Electric-type move, and is destroyed afterward."),
          named("Choice Band", 15, "A curious headband to be held by a Pokemon. Boosts Attack, but restricts the Pokemon to only one move."),
          named("Choice Scarf", 15, "A curious scarf to be held by a Pokemon. Boosts Speed, but restricts the Pokemon to only one move."),
          named("Choice Specs", 15, "A curious pair of glasses to be held by a Pokemon. Boosts Special Attack, but restricts the Pokemon to only one move."),
          named("Cleanse Tag", 8, "A spiritual tag to be held by a Pokemon. May repel weaker wild Pokemon during a Mission."),
          named("Covert Cloak", 8, "A hooded cloak that conceals the holder, protecting it from the additional effects of moves."),
          named("Damp Rock", 8, "An oddly damp rock to be held by a Pokemon. Allows heavy rains caused by the holder to last longer."),
          named("Destiny Knot", 9, "A ball of thread to be held by a Pokemon. If the holder becomes infatuated, so will the opponent."),
          named("Eject Button", 5, "An odd device with a single button. Switches out the holder when attacked."),
          named("Eject Pack", 5, "An item to be held by a Pokemon. When the holder's stats are lowered, it will be switched out of battle."),
          named("Electric Seed", 7, "A cluster of tart seeds. Raises Defense while Electric Terrain is in effect, but is consumed afterward."),
          named("Everstone", 6, "A peculiar stone to be held by a Pokemon. Prevents the holder from evolving."),
          named("Eviolite", 10, "An evolutionary lump. Boosts defenses if the holder can still evolve, but won't stop evolution if it occurs."),
          named("Expert Belt", 10, "A well-worn belt. Slightly boosts the power of super effective attacks."),
          named("Flame Orb", 9, "A bizarre, flaming orb to be held by a Pokemon. Immediately burns the holder."),
          named("Float Stone", 8, "A very light stone to be held by a Pokemon. Reduces their weight when held."),
          named("Focus Band", 9, "A headband. May allow the holder to survive an attack that would otherwise knock them out."),
          named("Focus Sash", 9, "A sash. Allows the holder to survive a single knockout blow, but the item is destroyed afterward."),
          named("Grassy Seed", 7, "A cluster of moss-covered seeds. Raises Defense while Grassy Terrain is in effect, but is consumed afterward."),
          named("Heat Rock", 8, "An oddly warm rock. Allows harsh sunlight caused by the holder to last longer."),
          named("Heavy-Duty Boots", 8, "These boots prevent the effects of traps set on the battlefield."),
          named("Icy Rock", 8, "An oddly cold rock. Allows hailstorms caused by the holder to last longer."),
          named("Iron Ball", 8, "A heavy ball. Makes the holder much slower, and forces them to remain grounded."),
          named("Lagging Tail", 8, "A tremendously heavy tail. Makes the holder much slower."),
          named("Leftovers", 10, "Bits of food to be held by a Pokemon. Gradually restores a Pokemon's health over time."),
          named("Life Orb", 10, "A strange orb. Makes the holder's moves more powerful, but hurts them as well."),
          named("Light Clay", 10, "A shiny clay. Allows Reflect, Light Screen and Aurora Veil to last longer."),
          named("Loaded Dice", 10, "A loaded dice that always rolls a good number, ensuring multistrike moves hit more times."),
          named("Luminous Moss", 7, "A bright clump of moss. Boosts Special Defense once when hit by a Water-type attack, and is destroyed afterward."),
          named("Macho Brace", 20, "A heavy, stiff brace. Makes the holder slower, but grants 50% extra move-evolution credit and increases Evo Point gains by 1."),
          named("Mental Herb", 5, "An herb. Lifts Infatuation, Disable, Taunt, Encore and Torment, but is consumed afterward."),
          named("Metronome", 9, "An item. Boosts the holder's move if used consecutively, but only until a different move is used."),
          named("Mirror Herb", 5, "An herb. Mirrors an opponent's stat increases to boost the holder's own stats, but only once."),
          named("Misty Seed", 7, "A cluster of misty seeds. Raises Special Defense while Misty Terrain is in effect, but is consumed afterward."),
          named("Power Herb", 5, "An herb. Allows the holder to instantly charge an attack that requires charging, but is consumed afterward."),
          named("Punching Glove", 10, "A protective glove that boosts the holder's punching moves and prevents direct contact."),
          named("Protective Pads", 10, "A set of pads that protects the holder from effects caused by making direct contact."),
          named("Psychic Seed", 7, "A cluster of seeds. Raises Special Defense while Psychic Terrain is in effect, but is consumed afterward."),
          named("Quick Claw", 8, "A light, sharp claw. Sometimes allows the holder to move suddenly and attack first."),
          named("Red Card", 10, "A card. The holder can raise it when attacked, forcing the opponent to switch out."),
          named("Ring Target", 8, "A bullseye target. Allows moves that normally have no effect to deal damage anyway."),
          named("Rocky Helmet", 8, "A rugged helmet. Causes the attacker to take damage if they hit the holder."),
          named("Safety Goggles", 8, "A pair of goggles. Protects the holder from weather and powder-based moves."),
          named("Scope Lens", 10, "A lens. Scopes out weak points, allowing the holder to hit them more easily."),
          named("Shed Shell", 8, "A discarded carapace. Allows the holder to switch out, bypassing anything that prevents recalling."),
          named("Shell Bell", 10, "A shell-shaped bell. Allows the holder to regain health based on damage dealt."),
          named("Smoke Ball", 6, "A ball. Lets the holder create a cloud of smoke, making escape and evasion slightly easier."),
          named("Smooth Rock", 8, "A smooth rock. Allows sandstorms caused by the holder to last longer."),
          named("Snowball", 7, "A snowball. Boosts Attack once if hit by an Ice-type attack, and is destroyed afterward."),
          named("Soothe Bell", 15, "A bell. Grants 50% extra credit for Happiness-based evolutions."),
          named("Sticky Barb", 8, "A sticky, prickly barb. Constantly damages the holder, but latches onto opponents that make contact."),
          named("Toxic Orb", 9, "A highly poisonous orb to be held by a Pokemon. Badly poisons the holder."),
          named("Terrain Extender", 8, "A strange bottle. Allows terrains caused by the holder to last longer."),
          named("Throat Spray", 8, "Raises Special Attack when the holder uses a sound-based move."),
          named("Utility Umbrella", 8, "A sturdy umbrella that protects the holder from the effects of weather."),
          named("Weakness Policy", 8, "A policy. When hit by a super effective attack, the holder's offense is sharply boosted."),
          named("White Herb", 5, "An herb. Reverses a lowered stat in battle, but only once. It is consumed afterward."),
          named("Wide Lens", 9, "A magnifying lens. Slightly boosts the accuracy of moves used by the holder."),
          named("Zoom Lens", 9, "A lens. If the holder attacks after their target, their move's accuracy is greatly boosted."),
        ],
      },
      {
        title: "Evolutionary Items",
        items: [
          named("Fire Stone", 25, "A stone with a fiery, orange heart. Evolves certain Pokemon like Vulpix, Growlithe, Eevee, and Pansear."),
          named("Water Stone", 25, "A stone as blue as a clear pool. Evolves Poliwhirl, Shellder, Staryu, Eevee, Lombre, and Panpour."),
          named("Thunder Stone", 25, "A stone with a thunderbolt pattern. Evolves Pikachu, Eevee, Eelektrik, Magneton, and Charjabug."),
          named("Leaf Stone", 25, "A stone with a leaf pattern. Evolves Gloom, Weepinbell, Exeggcute, Nuzleaf, Pansage, and Eevee."),
          named("Moon Stone", 25, "A stone as black as the night sky. Evolves Nidorina, Nidorino, Clefairy, Jigglypuff, Skitty, and Munna."),
          named("Sun Stone", 25, "A stone as red as the evening sun. Evolves Gloom, Sunkern, Cottonee, Petilil, and Helioptile."),
          named("Shiny Stone", 25, "A stone that shines with dazzling light. Evolves Togetic, Roselia, Minccino, and Floette."),
          named("Dusk Stone", 25, "A stone with shadows as dark as can be. Evolves Murkrow, Misdreavus, Lampent, and Doublade."),
          named("Dawn Stone", 25, "A stone that sparkles like a glittering eye. Evolves male Kirlia to Gallade, and Snorunt to Froslass."),
          named("Ice Stone", 25, "A stone with a snowflake pattern. Evolves Alolan Vulpix and Sandshrew, Eevee, Galarian Darumaka, and Crabrawler."),
          named("Oval Stone", 25, "A stone as round as an egg, to be held by Happiny. Allows Happiny to evolve into Chansey."),
          named("King's Rock", 25, "A crown-shaped rock. Attacks may cause flinch, and evolves Poliwhirl and Slowpoke when traded."),
          named("Metal Coat", 25, "A metallic film. Raises Steel-type moves, and evolves Onix and Scyther when traded."),
          named("Dragon Scale", 25, "A tough, inflexible scale. Evolves Seadra into Kingdra when traded."),
          named("Deep Sea Scale", 25, "A faint, pink scale. Raises Clamperl's Special Defense, and evolves it into Gorebyss when traded."),
          named("Deep Sea Tooth", 25, "A sharp, silver fang. Raises Clamperl's Special Attack, and evolves it into Huntail when traded."),
          named("Prism Scale", 25, "A scale that shines in rainbow colors. Evolves Feebas into Milotic when traded."),
          named("Up-Grade", 25, "A device with data on upgrading Porygon. Evolves Porygon into Porygon2 when traded."),
          named("Dubious Disc", 25, "A device with shady, dubious data. Evolves Porygon2 into Porygon-Z when traded."),
          named("Electirizer", 25, "A box packed with electrical energy. Evolves Electabuzz into Electivire when traded."),
          named("Magmarizer", 25, "A box packed with fiery energy. Evolves Magmar into Magmortar when traded."),
          named("Protector", 25, "A protective item. Evolves Rhydon into Rhyperior when traded."),
          named("Reaper Cloth", 25, "A cloth imbued with spiritual energies. Evolves Dusclops into Dusknoir when traded."),
          named("Razor Claw", 25, "A sharply hooked claw. Helps hit weak points, and evolves Sneasel into Weavile."),
          named("Razor Fang", 25, "A sharp fang. Attacks may cause flinch, and evolves Gligar into Gliscor."),
          named("Sachet", 25, "A satchel of fragrant perfumes. Evolves Spritzee into Aromatisse when traded."),
          named("Whipped Dream", 25, "A soft, sweet treat of special cream. Evolves Swirlix into Slurpuff when traded."),
          named("Sweet Apple", 25, "A peculiar, sweet apple that evolves Applin into Appletun."),
          named("Tart Apple", 25, "A peculiar, tart apple that evolves Applin into Flapple."),
          named("Cracked Pot", 25, "A cracked teapot that evolves Sinistea into Polteageist."),
          named("Chipped Pot", 25, "A chipped teapot that evolves an antique Sinistea into Polteageist."),
          named("Auspicious Armor", 25, "A peculiar set of armor that evolves Charcadet into Armarouge."),
          named("Malicious Armor", 25, "A peculiar set of armor that evolves Charcadet into Ceruledge."),
          named("Syrupy Apple", 25, "A peculiar, syrupy apple that evolves Dipplin."),
          named("Metal Alloy", 25, "A peculiar metal of many layers that evolves certain Pokemon."),
          named("Unremarkable Teacup", 25, "A cracked teacup that evolves Poltchageist into Sinistcha."),
          named("Link Cable", 25, "A cable that links two Pokemon's feelings. Evolves the former trade evolutions Kadabra, Machoke, Graveler, and Haunter."),
        ],
      },
      {
        title: "Silver Labyrinth Exclusives",
        items: [
          named("Adrenaline Orb", 5, "An orb of strange powder. Attracts other Pokemon to battle in the labyrinth for three rooms. Roll until you get a battle room."),
          named("Calcium", 7, "Raises Special Attack by +1 stage. Can go +1 over the two-stage limit."),
          named("Carbos", 7, "Raises Speed by +1 stage. Can go +1 over the two-stage limit."),
          named("Ether", 5, "Restores 2 PP."),
          named("Max Ether", 6, "Fully restores PP."),
          named("HP Up", 7, "Restores 50 HP and raises max HP by 50 once."),
          named("Iron", 7, "Raises Defense by +1 stage. Can go +1 over the two-stage limit."),
          named("Max Elixir", 10, "Fully restores PP and increases PP capacity by 1. Max PP cannot exceed 6."),
          named("PP Max", 8, "Restores +2 PP and increases PP capacity by +2. Max PP cannot exceed 6."),
          named("PP Up", 7, "Restores +1 PP and increases PP capacity by +1. Max PP cannot exceed 6."),
          named("Protein", 7, "Raises Attack by +1 stage. Can go +1 over the two-stage limit."),
          named("Zinc", 7, "Raises Special Defense by +1 stage. Can go +1 over the two-stage limit."),
        ],
      },
      {
        title: "Safari Contest Exclusives",
        items: [
          named("Piece of Bait", 2, "Only usable during a Safari Contest. Shortens the number range, making a specific Pokemon easier to find. Declare its use and cut the range in half."),
          named("Pack of Bait (3)", 5, "Three pieces of Safari Contest bait."),
          named("Pack of Bait (5)", 7, "Five pieces of Safari Contest bait."),
          named("Honey", 3, "A jar of berry honey for Safari Contests. Thrice per contest, declare numbers in an area's list as a different Pokemon (excluding shinies). Effect lasts three rolls."),
        ],
      },
    ],
    rare_section: {
      rotates_daily: true,
      pool: [
        named("Rare Candy", 30, "A candy packed with energy. Instantly grants a level's worth of Evo Points."),
        named("Ability Capsule", 20, "A capsule that lets a Pokemon switch between its regular abilities."),
        named("PP Max", 12, "Maximizes a move's PP."),
      ],
    },
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
  "ambrosial-alchemy": {
    name: "Ambrosial Alchemy",
    type: "Crafting Cauldron",
    kind: "craft",
    currency: "pokecoin",
    npc_name: "Ambrosia",
    order: 5,
    active: true,
    flavor_intro:
      "<p>Bring ingredients and coin, and Ambrosia's cauldron does the rest. Every recipe lists what it needs; failed brews still eat the ingredients, so read the success rate.</p>",
  },
};

// Obtainability batch (2026-07): complete the Golden Sarcophagus core sections
// so the WHOLE tier is buyable, not just the flavored staples. Fills by rarity
// tier so epic balls (safari/beast) never land in the common shelves.
//   Pokeballs -> tier 1 balls, Medicine -> tier 1, Berries -> tier 2,
//   Evolutionary Items -> tier 3.
const CORE_FILL = {
  Pokeballs: ["ball", 1, 8],
  Medicine: ["medicine", 1, 12],
  Berries: ["berry", 2, 4],
  "Evolutionary Items": ["evo-item", 3, 25],
};
for (const sec of shops["golden-sarcophagus"].sections) {
  const spec = CORE_FILL[sec.title];
  if (spec) sec.items = fillTier(sec.items, spec[0], spec[1], spec[2]);
}

// --------------------------------------------------------------------------
// Recipes (Ambrosial Alchemy)
// --------------------------------------------------------------------------
const slugKey = (name) => norm(name).replace(/ /g, "-");
// Recipe ingredients must resolve to a REAL catalog itemId, otherwise no bag
// item ever matches and the craft can never succeed. Record any name that
// falls through to the synthetic fallback so SEED_CHECK can flag it.
const unresolvedIngredients = new Set();
const ing = (name, qty = 1) => {
  if (!byDisplay.has(norm(name))) unresolvedIngredients.add(name);
  return { itemId: named(name, 0, "").itemId, qty };
};
// R(outputName, cost, success, category, {max_batch, ingredients})
const R = (outName, cost, success, category, opts = {}) => {
  const o = named(outName, 0, "");
  return [
    `craft-${slugKey(outName)}`,
    {
      output_item_id: o.itemId,
      output_name: o.name,
      output_filePath: o.filePath,
      output_category: o.category,
      output_qty: opts.output_qty ?? 1,
      max_batch: opts.max_batch ?? 10,
      ingredients: opts.ingredients ?? [],
      cost,
      success_rate: success,
      category,
      active: true,
    },
  ];
};

const APRICORN_BALLS = [
  ["Fast Ball", "White Apricorn"], ["Friend Ball", "Green Apricorn"], ["Heavy Ball", "Black Apricorn"],
  ["Lure Ball", "Blue Apricorn"], ["Moon Ball", "Yellow Apricorn"], ["Level Ball", "Red Apricorn"],
  ["Love Ball", "Pink Apricorn"],
];
const MEGA_STONES = [
  "Abomasite", "Absolite", "Aerodactylite", "Aggronite", "Alakazite", "Altarianite", "Ampharosite", "Audinite",
  "Banettite", "Beedrillite", "Blastoisinite", "Blazikenite", "Cameruptite", "Charizardite X", "Charizardite Y",
  "Diancite", "Galladite", "Garchompite", "Gardevoirite", "Gengarite", "Glalitite", "Gyaradosite", "Heracronite",
  "Houndoominite", "Kangaskhanite", "Latiasite", "Latiosite", "Lopunnite", "Lucarionite", "Manectite", "Mawilite",
  "Medichamite", "Metagrossite", "Pidgeotite", "Pinsirite", "Sablenite", "Salamencite", "Sceptilite", "Scizorite",
  "Sharpedonite", "Slowbronite", "Steelixite", "Swampertite", "Tyranitarite", "Venusaurite",
];
const Z_TYPES = [
  "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying", "Ghost",
  "Grass", "Ground", "Ice", "Normal", "Poison", "Psychic", "Rock", "Steel", "Water",
];
const Z_NAME = {
  Bug: "Buginium Z", Dark: "Darkinium Z", Dragon: "Dragonium Z", Electric: "Electrium Z", Fairy: "Fairium Z",
  Fighting: "Fightinium Z", Fire: "Firium Z", Flying: "Flyinium Z", Ghost: "Ghostium Z", Grass: "Grassium Z",
  Ground: "Groundium Z", Ice: "Icium Z", Normal: "Normalium Z", Poison: "Poisonium Z", Psychic: "Psychium Z",
  Rock: "Rockium Z", Steel: "Steelium Z", Water: "Waterium Z",
};

const recipes = Object.fromEntries([
  // Pokeballs
  ...APRICORN_BALLS.map(([ball, apricorn]) => R(ball, { pokecoin: 2 }, 90, "Pokeballs", { max_batch: 20, ingredients: [ing(apricorn)] })),
  R("Master Ball", { pokecoin: 25, snagemblem: 5 }, 70, "Pokeballs", { max_batch: 1, ingredients: [ing("Poke Ball", 3), ing("Great Ball", 3), ing("Ultra Ball", 3)] }),
  R("Cherish Ball", { pokecoin: 25, snagemblem: 5 }, 90, "Pokeballs", { max_batch: 1, ingredients: [ing("Master Ball", 1)] }),
  // Held items
  R("Amulet Coin", { pokecoin: 5 }, 80, "Held Items", { ingredients: [ing("Nugget", 3)] }),
  R("Luck Incense", { snagemblem: 1 }, 80, "Held Items", { ingredients: [ing("Big Nugget", 2)] }),
  R("Lucky Egg", { pokecoin: 5, snagemblem: 1 }, 90, "Held Items", { ingredients: [ing("Oval Stone", 1), ing("Rare Candy", 1)] }),
  R("Destiny Stone", { pokecoin: 5, snagemblem: 1 }, 90, "Held Items", { ingredients: [ing("Destiny Knot", 1), ing("Rare Candy", 1)] }),
  // Pokeblocks
  R("Zesty Pokeblock", { pokecoin: 3 }, 80, "Pokeblocks", { ingredients: [ing("Razz Berry", 3)] }),
  R("Tart Pokeblock", { pokecoin: 3 }, 80, "Pokeblocks", { ingredients: [ing("Pinap Berry", 3)] }),
  R("Bland Pokeblock", { pokecoin: 3 }, 80, "Pokeblocks", { ingredients: [ing("Bluk Berry", 3)] }),
  R("Chewy Pokeblock", { pokecoin: 3 }, 80, "Pokeblocks", { ingredients: [ing("Wepear Berry", 3)] }),
  R("Fizzy Pokeblock", { pokecoin: 3 }, 80, "Pokeblocks", { ingredients: [ing("Nanab Berry", 3)] }),
  R("Rainbow Pokeblock", { pokecoin: 10, snagemblem: 1 }, 70, "Pokeblocks", { ingredients: [ing("Enigma Berry", 1)] }),
  R("Shiny Pokeblock", { pokecoin: 10, snagemblem: 1 }, 70, "Pokeblocks", { ingredients: [ing("Starf Berry", 1)] }),
  R("Prism Pokeblock", { pokecoin: 10, snagemblem: 2 }, 80, "Pokeblocks", { ingredients: [ing("Shiny Pokeblock", 1)] }),
  // Mega + Z catalysts
  R("Key Stone", { snagemblem: 3 }, 100, "Mega Stones", { max_batch: 1, ingredients: [ing("Comet Shard", 1)] }),
  R("Sparkling Stone", { snagemblem: 3 }, 100, "Z-Crystals", { max_batch: 1, ingredients: [ing("Comet Shard", 1)] }),
  // Every Mega Stone: matching Elemental Gem + 25 SC + 3 Emblems @ 80%
  ...MEGA_STONES.map((stone) => R(stone, { pokecoin: 25, snagemblem: 3 }, 80, "Mega Stones", { max_batch: 1, ingredients: [ing("Elemental Gem", 1)] })),
  // Standard Z-Crystals: 5 matching Gems + 20 SC + 1 Emblem @ 80%
  ...Z_TYPES.map((t) => R(Z_NAME[t], { pokecoin: 20, snagemblem: 1 }, 80, "Z-Crystals", { max_batch: 1, ingredients: [ing("Elemental Gem", 5)] })),
  // Snag Machine upgrades
  R("Wonder Launcher", { pokecoin: 15, snagemblem: 1 }, 90, "Snag Machine", { max_batch: 1, ingredients: [ing("Comet Shard", 1), ing("Cell Battery", 1)] }),
  R("Immunizer", { pokecoin: 5, snagemblem: 1 }, 90, "Snag Machine", { max_batch: 1, ingredients: [ing("Balm Mushroom", 1)] }),
  R("Snag Lure", { pokecoin: 10, snagemblem: 1 }, 80, "Snag Machine", { max_batch: 1, ingredients: [ing("Pearl", 1), ing("Stardust", 1), ing("Nugget", 1)] }),
  // Material conversions
  R("Ability Capsule", { pokecoin: 3 }, 80, "Materials", { ingredients: [ing("Star Piece", 1)] }),
  R("Mystery Sack", {}, 100, "Materials", { ingredients: [ing("Mystery Pebble", 3)] }),
  R("Stardust", { pokecoin: 5 }, 100, "Materials", { output_qty: 3, ingredients: [ing("Star Piece", 1)] }),
  R("Star Piece", { pokecoin: 2 }, 90, "Materials", { ingredients: [ing("Stardust", 3)] }),
  R("Comet Shard", { pokecoin: 3 }, 90, "Materials", { ingredients: [ing("Star Piece", 3)] }),
  R("Big Nugget", { pokecoin: 2 }, 90, "Materials", { ingredients: [ing("Nugget", 3)] }),
  R("Nugget", { pokecoin: 5 }, 100, "Materials", { output_qty: 3, ingredients: [ing("Big Nugget", 1)] }),
  R("Big Pearl", { pokecoin: 2 }, 90, "Materials", { ingredients: [ing("Pearl", 3)] }),
  R("Pearl", { pokecoin: 5 }, 100, "Materials", { output_qty: 3, ingredients: [ing("Big Pearl", 1)] }),
  R("Big Mushroom", { pokecoin: 2 }, 90, "Materials", { ingredients: [ing("Tiny Mushroom", 3)] }),
  R("Tiny Mushroom", { pokecoin: 5 }, 100, "Materials", { output_qty: 3, ingredients: [ing("Big Mushroom", 1)] }),
  R("Balm Mushroom", { pokecoin: 3 }, 80, "Materials", { ingredients: [ing("Big Mushroom", 2)] }),
  R("Rare Candy", { pokecoin: 10 }, 70, "Materials", { ingredients: [ing("Balm Mushroom", 1), ing("Pearl String", 1), ing("Big Nugget", 1)] }),
]);

// --------------------------------------------------------------------------
// Missions (Mission Vault) - full 69-mission catalog from the forum
// --------------------------------------------------------------------------
// MZ(order, id, title, location, tier, objective, opposition, reward, coins, opts)
const MZ = (order, id, title, location, tier, objective, opposition, reward, coins, opts = {}) => [
  id,
  {
    title, location, tier, objective, opposition, order, coins, active: true,
    pokemon_reward: reward,
    emblem_eligible: opts.emblem ?? true,
    ...(opts.special_item ? { special_item: opts.special_item } : {}),
    ...(opts.pokemon_note ? { pokemon_note: opts.pokemon_note } : {}),
    ...(opts.story ? { story: opts.story } : {}),
  },
];
const RW = (kind, count = 1) => ({ kind, count });
const missions = Object.fromEntries([
  MZ(1, "special-delivery", "Special Delivery", "Lumiose City, Kalos", "Standard", "Retrieve the misdelivered Pokeball shipment from one of three locations without it being stolen.", "Lumiose Gang members using Dark-types (Sandile, Vullaby, Pancham, Pawniard, Scraggy, Purrloin, Poochyena, Sneasel).", RW("snag"), 3),
  MZ(2, "you-better-work", "You Better Work", "Lumiose City, Kalos", "Story", "Get a job and make some money, and take some too if you are feeling brave.", "Variable. Combat if you are caught stealing.", RW("egg"), 3, { emblem: false, pokemon_note: "None. A great performance may earn an egg.", story: "<p>Team Snagem needs money to run, and you are how we stay running. Find part-time work in Lumiose City. Though it would be even better if you gave yourself a bonus, if you catch my drift. Consider it snagging, we are Snagems after all.</p>" }),
  MZ(3, "harassment", "Harassment", "Lumiose City, Kalos", "Standard", "Stop the rookie Team Flare Grunt from recruiting new members and ruin their reputation.", "Team Flare rookie with Houndour and Electrike. They flee.", RW("snag"), 3),
  MZ(4, "sparring-partner", "Sparring Partner Wanted", "Saffron City, Kanto", "Standard", "Get the lone Tyrogue at the Fighting Dojo to fight.", "Other Tyrogue in training battles.", RW("recruit"), 2),
  MZ(5, "energy-war", "Energy War", "Virbank Complex, Unova", "Standard", "Get the Elekid and Magby to calm down.", "Many wild Elekid and Magby. May also encounter Magnemite, Pidove, Patrat, Growlithe, Koffing.", RW("catch"), 3),
  MZ(6, "an-ashy-situation", "An Ashy Situation", "Route 113, Hoenn", "Standard", "Send the Team Magma Grunt packing.", "Solo Team Magma Grunt with Poochyena, Zubat, Numel, Baltoy, Spinda.", RW("snag"), 4),
  MZ(7, "rod-thief", "Rod Thief", "Dewford Town, Hoenn", "Standard", "Find the Team Aqua Grunt and get the Old Rods back.", "Team Aqua Grunt with Poochyena, Carvanha, Zubat, Corphish.", RW("snag"), 3, { special_item: "Old Rod" }),
  MZ(8, "schoolyard-brawl", "Schoolyard Brawl", "Jubilife City, Sinnoh", "Standard", "Free the Pokemon School from Team Galactic.", "Two Team Galactic Grunts; one has a Mime Jr. for mind control.", RW("snag"), 4),
  MZ(9, "breeding-center-infestation", "Breeding Center Infestation", "Route 34, Johto", "Standard", "Clear out the Bug Pokemon and find what was drawing them there.", "Many wild Bug Pokemon: Caterpie, Weedle, Ledyba, Spinarak, Pineco, Yanma.", RW("catch"), 3, { pokemon_note: "An egg from the Old Couple if no bug is caught." }),
  MZ(10, "cheap-shot", "Cheap Shot", "Route 1, Kanto", "Standard", "Beat the Rocket Grunt and get the Pokemon back.", "Wild Rattata and Pidgey. Rocket Grunt with Koffing and Ekans.", RW("catch"), 3),
  MZ(11, "trouble-at-kranes-lab", "Trouble at Krane's Lab", "Pokemon HQ Lab, Orre", "Standard", "Ambush the Cipher Peon, tie them up, and leave them for the police.", "Cipher Peon with Teddiursa and Slakoth.", RW("snag"), 3),
  MZ(12, "floccesy-ranch-liberation", "Floccesy Ranch Liberation", "Floccesy Ranch, Unova", "Standard", "Gather the Mareep back into the ranch and take out the Plasma Grunt.", "Team Plasma Grunt with Trubbish, Woobat, Scraggy, or Purrloin.", RW("snag"), 4, { pokemon_note: "May recruit a Mareep instead." }),
  MZ(13, "definitely-nurse-joy", "Definitely Nurse Joy", "Johto Pokemon Centers", "Standard", "Set up a sting to deal with the impostor.", "Rocket Grunt likely using three Pokemon. Wild Johto route Pokemon.", RW("snag"), 3),
  MZ(14, "rock-a-bye-trainer", "Rock-a-bye Trainer", "Viridian Forest, Kanto", "Standard", "Defeat the Beauty and kick her out of Viridian Forest.", "Wild Caterpie, Weedle, Pidgey, Spearow. The Beauty has Cleffa, Igglybuff, Smoochum.", RW("catch"), 3),
  MZ(15, "tampered-potions", "Tampered Potions", "Kalos", "Standard", "Reveal the Old Lady's poisoned Potions scheme.", "Old Lady with Oddish/Bellsprout; offended locals.", RW("snag"), 4),
  MZ(16, "do-ya-dig-it", "Do ya dig it?", "Glittering Cave, Kalos", "Standard", "Go to Glittering Cave and find a fossil.", "Wild cave Pokemon and Team Eolith grunts.", RW("catch"), 5, { special_item: "Fossil" }),
  MZ(17, "escorting-the-escort", "Escorting the Escort Pokemon", "Union Cave to Azure Bay", "Standard", "Escort the young Lapras to Azure Bay in Kalos.", "Wild water Pokemon and Team Rocket grunts.", RW("catch"), 6),
  MZ(18, "a-psycho-runs-our-motel", "A Psycho Runs Our Motel", "Winding Woods, Kalos", "Standard", "Discover the truth behind the Trapps Motel story.", "Wild Zoroark, Noctowl, Trevenant; a mysterious man using Ghost types.", RW("catch"), 6),
  MZ(19, "tower-troubles", "Tower Troubles", "Pokemon Tower, Lavender Town", "Standard", "Stop the Ghost Cleansing Ritual.", "Wild Gastly, Haunter, Cubone; Mediums; a Head Medium with a powerful Gengar.", RW("catch"), 6),
  MZ(20, "the-black-pearl", "The Black Pearl", "Muraille Coast, Kalos", "Standard", "Hunt down Team Flare and take back the black pearl.", "Wild Tentacool, Wailmer; Team Flare grunts by boat.", RW("snag"), 5),
  MZ(21, "no-pressure-no-diamonds", "No Pressure, No Diamonds", "Oreburgh Mine, Sinnoh", "Standard", "Find the diamond to calm the mine and deal with the Galactic Grunt.", "Miners' Rock/Ground Pokemon; a Galactic grunt with Croagunk, Glameow, Elgyem.", RW("catch"), 5),
  MZ(22, "way-of-the-samurai", "Way of the Samurai(?)", "Goldenrod City, Johto", "Standard", "Send a warning to Team Samurai and scare them.", "Team Samurai members; leader Tsuki with Ninjask, Zangoose, Dewott, Scizor.", RW("snag"), 6),
  MZ(23, "the-rhyhorn-races", "The Rhyhorn Races", "Route 22, Kalos", "Standard", "Enter the Rhyhorn Race and expose the cheat.", "Racing Rhyhorn; disguised Pokemon used by the cheater.", RW("none"), 6, { pokemon_note: "May bond with the provided Rhyhorn or receive an egg." }),
  MZ(24, "going-on-a-bear-hunt", "Going on a Bear Hunt", "Floaroma Meadow, Sinnoh", "Standard", "Take out the alpha males of each bear tribe to stop the fighting.", "Ursaring, Beartic, Pangoro fighters; three alpha bears.", RW("catch"), 6),
  MZ(25, "sweet-eats", "Sweet Eats", "Camphrier Town, Kalos", "Standard", "Find the baker's Pokemon and return them.", "Wild Pokemon; the baker's Shuckle, Swirlix, Combee, Tropius may resist.", RW("none"), 6, { pokemon_note: "Possible special item from the baker." }),
  MZ(26, "an-invasive-species", "An Invasive Species", "Chargestone Cave, Unova", "Standard", "Gather the Sableye and find them a better home.", "Charged Sableye (at least ten); wild Boldore, Joltik, Klink, Ferroseed.", RW("catch"), 6),
  MZ(27, "a-fishy-situation", "A Fishy Situation", "Slateport City, Hoenn", "Standard", "Track down the fish thief and stop them.", "Thief's Nuzleaf, Gulpin, Pelipper.", RW("snag"), 6, { special_item: "Fish supply" }),
  MZ(28, "thirst-for-knowledge", "Thirst for Knowledge", "Nacrene City Gym, Unova", "Standard", "Break into the gym and find the ancient book about the Regis.", "Human guards with Normal-types; Team Lore grunts with ancient Pokemon.", RW("snag"), 6, { pokemon_note: "An egg if no snag is made." }),
  MZ(29, "how-you-play-the-game", "How You Play The Game", "Pokeathlon Dome, Johto", "Standard", "Meet the Pokeathlon President or a Vitamons rep in secret.", "Vitamons thugs or Pokeathlon guards, depending on your choice.", RW("snag"), 8, { special_item: "King's Rock / Metal Coat / Protector" }),
  MZ(30, "traitor", "Traitor?", "Lumiose City, Kalos", "Standard", "Hunt down the missing informant and find out why they disappeared.", "The informant with four fully evolved Pokemon.", RW("snag"), 7),
  MZ(31, "the-dark-knight", "The Dark Knight", "Castelia City, Unova", "Standard", "Stop Mime and Killer Gatr's plot to kill everyone in Castelia State Tower.", "Clown-faced Dark/Fighting thugs; The Mime with Mr. Mime; Killer Gatr.", RW("snag"), 9, { special_item: "Hero persona costume" }),
  MZ(32, "blasphemy", "Blasphemy!", "Hearthome City, Sinnoh", "Standard", "Infiltrate the Church of Cyrus, find the stolen Pokemon, and take out the priest.", "Galactic Zealots; a Prophet with Togekiss, Blissey, Gallade.", RW("snag"), 7),
  MZ(33, "why-were-here", "You Ever Wonder Why We're Here?", "A canyon", "Standard", "Gather plant samples and information about the canyon's occupants.", "Armed men with technological Pokemon; mysterious soldiers.", RW("snag"), 8, { special_item: "Plant samples" }),
  MZ(34, "the-pokeball-factory", "The Pokeball Factory", "Unknown region", "Standard", "Take the tour and find out what is happening inside.", "Four other trainers; factory hazards.", RW("snag"), 7, { special_item: "Golden Pokeball pass" }),
  MZ(35, "crumbling-foundation", "Crumbling Foundation", "Pacifidlog Town, Hoenn", "Standard", "Stop Team Aqua from destroying Pacifidlog Town.", "Aqua grunts; agitated Corsola; Admin Matt with Wailord and Azumarill.", RW("snag"), 7, { special_item: "Scuba equipment" }),
  MZ(36, "repurposing", "Repurposing", "Route 110, Hoenn", "Standard", "Stop Team Magma from destroying the bridge.", "Magma grunts on motorcycles; Admin Courtney with Swellow, Ninetales, Flygon.", RW("snag"), 7, { special_item: "Hoverboard" }),
  MZ(37, "tampered-balls", "Tampered Balls", "Pyrite Town, Orre", "Standard", "Find the hideout, destroy the fake Luxury Balls, and free the stolen Pokemon.", "Thugs; a mysterious collaborator.", RW("snag"), 7),
  MZ(38, "here-be-dragons", "Here Be Dragons", "Dragon's Den, Johto", "Standard", "Reach the Dragon's Shrine, protect the Elder, and push Team Rocket out.", "Rocket grunts; wild Dragons; Executive Ariana with Arbok, Vileplume, Honchkrow, Lapras.", RW("catch"), 8),
  MZ(39, "the-lost-woods", "The Lost Woods", "Berry Forest, Sevii Islands", "Standard", "Find the Golden Grove and retrieve the Golden Pecha Berry.", "Hypno, Mismagius, powerful Grass types; a Venusaur family.", RW("catch"), 8, { special_item: "Golden Pecha Berry" }),
  MZ(40, "a-jerk-in-the-woods", "A Jerk in the Woods", "Santalune Forest, Kalos", "Standard", "Turn in the punk responsible and capture the evolved Pokemon.", "Punk with Growlithe, Staryu, Bellsprout; wild forest Pokemon.", RW("catch"), 5),
  MZ(41, "ranch-wars", "Ranch Wars", "Route 12, Kalos", "Standard", "Make the MooMoo Farm and Floccesy Ranch Kalos branches pull out.", "MooMoo and Floccesy workers; wild Route 12 Pokemon.", RW("catch"), 7),
  MZ(42, "natural-beauty", "Natural Beauty", "Route 4, Kalos", "Standard", "Drive away Team Flora on Parterre Way.", "Flora grunts; Admin Pansy with Flabebe and Skiploom.", RW("snag"), 5),
  MZ(43, "tag-youre-next", "Tag You're Next", "Hau'oli City, Alola", "Standard", "Help complete Xanksy's masterpiece, or stop and capture him.", "Xanksy with Delibird, Alolan Grimer, Abra, Smeargle; or the police.", RW("catch"), 8),
  MZ(44, "king-of-the-hill", "King of the Hill", "Brooklet Hill, Alola", "Standard", "Stop the aquatic war between Wishiwashi and Golisopod.", "Totem Wishiwashi and Totem Golisopod with followers.", RW("catch"), 7),
  MZ(45, "protect-your-heart", "Protect Your Heart", "Your hometown", "Standard", "Defend your hometown from destruction while revealing your backstory.", "Trainer opposition, if any.", RW("catch"), 4),
  MZ(46, "a-safari-hunt", "A Safari Hunt", "Fuchsia Safari Zone, Kanto", "Standard", "Help the client catch impressive Pokemon, or stop rival dentists.", "Four mercenaries; a Gym Trainer; wild Safari Pokemon; an aggressive Scyther.", RW("catch"), 8, { special_item: "Leaf Stone or Sun Stone (if capturing Scyther)" }),
  MZ(47, "the-green-monster", "The Green Monster", "Victory Road, Kalos", "Exceptional", "Find former Tower Master Tommy and retrieve the stolen Key Stone from his Mega Tyranitar.", "Wild Victory Road Pokemon; the Green Monster with a Mega Tyranitar.", RW("catch"), 10, { emblem: false, special_item: "1 Snag Emblem and a Mega Stone of choice. Once per member." }),
  MZ(48, "lush-jungle-excursion", "Lush Jungle Excursion", "Lush Jungle, Alola", "Standard", "Escort Lum through Lush Jungle to the Topo Berry tree.", "Wild jungle Pokemon; Totem Lurantis (do not engage); Team Rocket.", RW("catch"), 5, { special_item: "Random reward (mushrooms/berries/herbs)" }),
  MZ(49, "the-annual-blackout", "The Annual Blackout", "Geothermal Plant, Alola", "Standard", "Ward off the influx of Electric Pokemon for a full day.", "Wild Electric-types; Totem Electivire (avoid defeating).", RW("catch"), 5),
  MZ(50, "pika-guards", "Pika Guards", "Hano Grand Resort, Alola", "Standard", "Protect the celebrity Pikachu Chuuster for the week and uncover the hotel plot.", "Skull grunts; wild Hano Beach Pokemon; Chuuster if upset.", RW("catch"), 7),
  MZ(51, "trouble-in-the-tree", "Trouble in the Tree", "Coumarine Gym, Kalos", "Standard", "Work up the tree and defeat Flare Admin Chalmers.", "Flare Grunts with Grass-weak Pokemon; Admin Chalmers with a Braviary.", RW("catch"), 5),
  MZ(52, "amity-square-vacation", "Amity Square Vacation", "Hearthome City, Sinnoh", "Standard", "Let your Pokemon enjoy their vacation in Amity Square.", "Creator's choice, or none.", RW("none"), 5, { pokemon_note: "Bonus Evolution/Happiness Points; optional treasure with admin approval." }),
  MZ(53, "sniffing-out-the-culprit", "Sniffing Out The Culprit", "Lumiose City, Kalos", "Standard", "Follow the Tracker Scent trail and bring the saboteur to justice.", "Culprit with three smell-producing Pokemon; a Shadow Spritzee.", RW("snag"), 8, { special_item: "Two Vivid Scents and one Sachet" }),
  MZ(54, "a-new-sheriff-in-town", "A New Sheriff In Town", "Lacunosa Town, Unova", "Standard", "Infiltrate the town and remove the corrupt Sheriff Larae.", "Corrupt police; Larae with Honchkrow, Bisharp, Liepard.", RW("snag"), 8, { special_item: "One Black Glasses" }),
  MZ(55, "the-five-points", "The Five Points", "Spikemuth, Galar", "Standard", "Locate the six gang members and snag their Falinks.", "Five grunts with Shadow Falinks; Stanley Blackstar with a Falinks leader.", RW("snag"), 4, { special_item: "One Black Glasses" }),
  MZ(56, "death-race-on-the-water", "Death Race on the Water", "Alto Mare", "Standard", "Ensure the Tour de Alto Mare finishes and keep Marlon alive.", "Three Frogadier-hybrid assassins with Dark/Poison Pokemon.", RW("snag"), 10, { special_item: "One Enigma Berry and one Star Piece" }),
  MZ(57, "lethal-hour", "Lethal Hour: Freedom Doesn't Die", "Pokewood Studios, Unova", "Standard", "Guard the actress and rescue her after the kidnapping.", "HHH mooks; William McCord, a Fighting Channeler with Sawk.", RW("snag"), 4, { special_item: "One Evolutionary Item of choice" }),
  MZ(58, "unlock-potential", "Unlock Potential", "Lake Acuity, Sinnoh", "Standard", "Follow Elder Chaksu's regime and unlock your dormant potential.", "Wild Pokemon, trainers, hazards, and internal struggles.", RW("catch"), 8),
  MZ(59, "another-errand-run", "Another Errand Run", "Multi-region", "Standard", "Retrieve the plasmite batteries through a chain of trades across regions.", "Wild Pokemon; Gym Leader Clemont (Heliolisk only, unofficial).", RW("catch"), 10, { emblem: false, special_item: "One Snag Emblem Piece" }),
  MZ(60, "careless-digging", "Careless Digging", "Route 6, Galar", "Standard", "Rescue Skilliver from the ruins or Stamian from the Durant tunnels.", "Wild Route 6 Pokemon; Galarian Yamask or Durant.", RW("none"), 5, { special_item: "A Fossilized Bird or Fish, plus a Fossilized Dino or Drake" }),
  MZ(61, "turffield-harvest-festival", "Turffield Harvest Festival", "Turffield, Galar", "Standard", "Help with the produce prep and join the produce-run competition.", "Wild Route 4 Pokemon; rival runners; Gym Leader Milo.", RW("catch"), 4, { special_item: "3 Apricorns of choice" }),
  MZ(62, "a-shadow-in-the-steam", "A Shadow in the Steam", "Circhester, Galar", "Standard", "Capture the wild Shadow Pokemon plaguing Circhester.", "A Shadow Pokemon; wild Route 8-9 Pokemon; a paranoid populace.", RW("catch"), 7, { special_item: "1 Stardust and 2 Exp. Candy S" }),
  MZ(63, "mushroom-picking", "Mushroom Picking", "Glimwood Tangle, Galar", "Standard", "Collect enough high quality mushrooms to please Opal.", "Wild Glimwood Tangle Pokemon; Team Yell; Opal's high standards.", RW("none"), 5, { special_item: "1 Tiny Mushroom" }),
  MZ(64, "five-isle-reclamation", "Five Isle Land Reclamation", "Five Island, Kanto", "Standard", "Help demolish and restore the abandoned Rocket warehouse site.", "One or two bitter Rocket grunts.", RW("catch"), 5, { special_item: "1 Lemonade" }),
  MZ(65, "unusual-pattern", "An Unusual Pattern In the Bush", "Six Island, Sevii Islands", "Standard", "Locate the undiscovered Pokemon of the Pattern Bush for Professor Oak.", "Other trainers; wild Pattern Bush Pokemon.", RW("catch"), 5, { special_item: "1 Tiny Mushroom" }),
  MZ(66, "the-lizard-wheels", "The Lizard Wheels", "South Province, Paldea", "Standard", "Track down the Lizard Wheels gang and apprehend the leader Ernesto.", "Gang members with Cyclizar; Ernesto with an oversized Cyclizar.", RW("snag"), 5),
  MZ(67, "wish-upon-a-galarian-star", "Wish Upon a Galarian Star", "Wild Area, Galar", "Exceptional", "Collect Watt energy and defeat Dynamax Pokemon to attract a Wishing Star.", "Wild Galar Pokemon; at least two Dynamax battles required.", RW("catch"), 10, { emblem: false, special_item: "1 Snag Emblem Piece, 1 Wishing Star, 2 Exp Candy L. Once only." }),
  MZ(68, "hybrid-pride-and-prejudice", "Hybrid Pride and Prejudice", "Lumiose City, Kalos", "Standard", "Integrate into the Hybrid slums and address the Flames of Purity harassment.", "Defensive Hybrids; Flames of Purity bigots using Fire-types.", RW("snag"), 3),
  MZ(69, "which-will-you-choose-paldea", "Which Will You Choose? Paldea", "Paldea", "Standard", "Volunteer at a starter breeding facility for a week, caring for baby Pokemon.", "None. Baby Pokemon can be a handful.", RW("egg"), 3),
]);

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
// fossilItemId -> revived pokemon slug. The KEY must be the real catalog Item ID
// (group "fossil"), because that is the id a member's bag fossil actually carries
// and what reviveFossil (functions/src/index.ts) and the Research chamber filter
// look up. NOTE: this previously resolved via item("valuable", ...) with names like
// "helix-fossil", which matched no catalog row and produced synthetic keys
// ("valuable-helix-fossil") that never matched a real fossil, so revival silently
// failed for everyone. Now keyed by the correct "fossil/<sprite>" catalog ids.
const fossil = (spriteName, slug) => [item("fossil", spriteName).itemId, slug];
const research_config = {
  fossilCost: 5,
  masterMissionsPerType: 10,
  channelerTypes: ["Fairy", "Ghost", "Psychic", "Water", "Ground", "Flying", "Poison", "Dark"],
  // Full canon revivable-fossil set. bird/dino/drake/fish catalog sprites have no
  // canonical revived species, so they are intentionally left unmapped.
  fossilMap: Object.fromEntries([
    fossil("old-amber", "aerodactyl"),
    fossil("helix", "omanyte"),
    fossil("dome", "kabuto"),
    fossil("root", "lileep"),
    fossil("claw", "anorith"),
    fossil("skull", "cranidos"),
    fossil("armor", "shieldon"),
    fossil("cover", "tirtouga"),
    fossil("plume", "archen"),
    fossil("jaw", "tyrunt"),
    fossil("sail", "amaura"),
  ]),
  // Canon reference maps. PURE DATA, no consumer yet: nothing in the app reads
  // these today (Mega/Z access is gated by capstone unlock flags, not a species
  // lock). Seeded so a future "which species can use this stone/crystal"
  // reference UI has the data ready. Keyed by the stone/crystal display name.
  megaStoneSpecies: {
    Abomasite: "abomasnow", Absolite: "absol", Aerodactylite: "aerodactyl", Aggronite: "aggron",
    Alakazite: "alakazam", Altarianite: "altaria", Ampharosite: "ampharos", Audinite: "audino",
    Banettite: "banette", Beedrillite: "beedrill", Blastoisinite: "blastoise", Blazikenite: "blaziken",
    Cameruptite: "camerupt", "Charizardite X": "charizard", "Charizardite Y": "charizard",
    Diancite: "diancie", Galladite: "gallade", Garchompite: "garchomp", Gardevoirite: "gardevoir",
    Gengarite: "gengar", Glalitite: "glalie", Gyaradosite: "gyarados", Heracronite: "heracross",
    Houndoominite: "houndoom", Kangaskhanite: "kangaskhan", Latiasite: "latias", Latiosite: "latios",
    Lopunnite: "lopunny", Lucarionite: "lucario", Manectite: "manectric", Mawilite: "mawile",
    Medichamite: "medicham", Metagrossite: "metagross", Pidgeotite: "pidgeot", Pinsirite: "pinsir",
    Sablenite: "sableye", Salamencite: "salamence", Sceptilite: "sceptile", Scizorite: "scizor",
    Sharpedonite: "sharpedo", Slowbronite: "slowbro", Steelixite: "steelix", Swampertite: "swampert",
    Tyranitarite: "tyranitar", Venusaurite: "venusaur",
  },
  // Only the species-LOCKED Z-Crystals (the 18 type crystals in Z_NAME are not
  // species-specific). "Tapunium Z" is shared by all four Tapus; tapu-koko listed
  // as the representative.
  zCrystalSpecies: {
    "Aloraichium Z": "raichu-alola", "Decidium Z": "decidueye", "Eevium Z": "eevee",
    "Incinium Z": "incineroar", "Kommonium Z": "kommo-o", "Lycanium Z": "lycanroc",
    "Marshadium Z": "marshadow", "Mewnium Z": "mew", "Mimikium Z": "mimikyu",
    "Pikanium Z": "pikachu", "Pikashunium Z": "pikachu", "Primarium Z": "primarina",
    "Snorlium Z": "snorlax", "Solganium Z": "solgaleo", "Lunalium Z": "lunala",
    "Ultranecrozium Z": "necrozma", "Tapunium Z": "tapu-koko",
  },
};

// --------------------------------------------------------------------------
// Colosseum: battle rankings, hall of fame, tournaments
// --------------------------------------------------------------------------
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
// [username, points, wins, losses, streak, movement] — streak "W6"/"L1",
// movement is the rank change since last update (+up, -down, 0 even).
const rankingRows = [
  ["SubonicXP", 214, 41, 8, "W6", 0],
  ["DeoLux", 198, 37, 12, "W2", 1],
  ["TerashiHz", 176, 33, 15, "L1", -1],
  ["AiratheSwift", 154, 29, 14, "W3", 1],
  ["MoniqueBrie", 141, 27, 16, "W1", 1],
  ["AbsintheR", 122, 22, 19, "L2", -1],
];
const battle_rankings = Object.fromEntries(
  rankingRows.map(([username, points, wins, losses, streak, movement]) => [
    slug(username),
    { username, points, wins, losses, streak, movement },
  ])
);

const hall_of_fame = {
  "summer-cup-2020": {
    tournament_name: "Snagem Summer Cup", year: 2020, winner: "Atlantis_Darts", order: 1,
    team: ["charizard", "blastoise", "venusaur", "dragonite", "snorlax", "greninja"],
  },
  "monotype-cup-2020": {
    tournament_name: "Snagem Monotype Cup", year: 2020, winner: "Darksol88", order: 2,
    team: ["umbreon", "houndoom", "absol", "weavile", "tyranitar", "gengar"],
  },
  "winter-cup-2021": {
    tournament_name: "Snagem Winter Cup", year: 2021, winner: "Blizzard120", order: 3,
    team: ["glaceon", "froslass", "froslass", "glalie", "weavile", "mamoswine"],
  },
  "spring-cup-2022": {
    tournament_name: "Snagem Spring Cup", year: 2022, winner: "SubonicXP", order: 4,
    team: ["garchomp", "lucario", "bronzong", "gyarados", "roserade", "empoleon"],
  },
};

// Paldea Cup opens sign-ups and starts 6 days out from the seed run.
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
const paldeaStart = admin.firestore.Timestamp.fromMillis(Date.now() + SIX_DAYS_MS);

const tournaments = {
  "paldea-cup": {
    name: "Team Snagem Paldea Cup",
    game_generation: "Gen 9 (Paldea)",
    format: "Double elimination, singles, 6v6, Terastallization allowed",
    status: "open_signup",
    start_date: paldeaStart,
    capacity: 32,
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
// Lore Library book shells (docs/LORE_DATA.md, page 1 of the Gaia index).
// Titles/types/order are known; entry bodies are migrated in-app by ManageLore
// directors. The 9 missing type books (Fire, Grass, Electric, Ground, Rock,
// Flying, Fighting, Ice, Steel) still need pulling logged in before seeding.
// --------------------------------------------------------------------------
const loreBook = (order, id, title, type, description) => [
  id,
  { order, title, type, description },
];
const TYPE_BOOKS = ["Dark", "Normal", "Fairy", "Water", "Psychic", "Ghost", "Dragon", "Bug", "Poison"];
const loreBooks = Object.fromEntries([
  loreBook(1, "story-so-far", "The Story So Far", "history", "The guild's continuous history, told in chronological arcs."),
  loreBook(2, "compendium-of-entities", "Compendium of Entities of Interest", "compendium", "Bestiary and character roster of notable figures across the world."),
  loreBook(3, "unique-objects-and-items", "Unique Objects and Items", "objects", "Lore for the world's one-of-a-kind artifacts and items."),
  loreBook(4, "alternate-universe-snagems", "Alternate Universe Snagems", "other", "Snagems from parallel worlds."),
  loreBook(5, "short-stories", "Short Stories", "short_stories", "Standalone tales, to be filed into books over time."),
  ...TYPE_BOOKS.map((t, i) =>
    loreBook(10 + i, `book-of-${t.toLowerCase()}`, `Book of ${t}`, "type_book", `Mythology, places, and cultures of ${t}-type lore.`)
  ),
]);

// --------------------------------------------------------------------------
// Write everything
// --------------------------------------------------------------------------
async function run() {
  const batch = db.batch();
  for (const [id, data] of Object.entries(loreBooks)) batch.set(db.doc(`loreBooks/${id}`), data, { merge: true });
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
  batch.set(db.doc("admin/casino_config"), { exchangeRate: 2 }, { merge: true });
  batch.set(db.doc("casino/lotto"), { jackpot: 100, weekId: "current", ticketCount: 0, tickets: [] }, { merge: true });
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
// SEED_CHECK: validate recipe ingredient ids against the catalog without
// touching Firebase (no credentials needed). Run: SEED_CHECK=1 node scripts/seed.mjs
if (process.env.SEED_CHECK) {
  // Ingredients that are themselves recipe outputs are obtainable by crafting.
  // Their synthetic id is consistent on both sides, so the chain works even
  // when the item has no catalog row (e.g. Shiny Pokeblock -> Prism Pokeblock).
  const craftableOutputs = new Set(
    Object.values(recipes).map((r) => norm(r.output_name))
  );
  const broken = [...unresolvedIngredients]
    .filter((n) => !craftableOutputs.has(norm(n)))
    .sort();
  if (broken.length) {
    console.error(`Recipe ingredients with no obtainable source (${broken.length}):`);
    broken.forEach((n) => console.error(`  - ${n}`));
    process.exit(1);
  }
  console.log("All recipe ingredients are obtainable (in catalog or craftable).");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
