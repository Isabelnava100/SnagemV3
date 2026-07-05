import { Badge, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import React from "react";

/**
 * Move reference. For now this holds the guild's Shadow Moves (ported from the
 * Shadow Pokemon FAQ). Regular move references can be added as more groups
 * later. Searchable by name, class or type restriction.
 */

interface Move {
  name: string;
  category: string;
  /** Shadow Meter cost as displayed text (some vary). */
  cost: string;
  /** Type restriction, or "None". */
  type: string;
  effect: string;
}

interface MoveGroup {
  title: string;
  note: string;
  moves: Move[];
}

const SHADOW_MOVES: MoveGroup[] = [
  {
    title: "Class A",
    note: "Usable by any Shadow Pokemon. Each adds 3 to the Shadow Meter.",
    moves: [
      { name: "Shadow Blitz", category: "Physical", cost: "3", type: "None", effect: "A simple tackle imbued with vile, infected chi." },
      { name: "Shadow Rush", category: "Physical", cost: "3", type: "None", effect: "A stronger Shadow Blitz that uses more chi. More likely to infect nearby Pokemon, but slightly harms the user." },
      { name: "Shadow Hold", category: "Status", cost: "3", type: "None", effect: "Covers the area in viral chi; foes are stricken with fear and cannot escape or recall until it dissipates." },
      { name: "Shadow Wave", category: "Special", cost: "3", type: "None", effect: "Waves of chi hit all foes around the user, infecting anything they touch." },
      { name: "Shadow Shed", category: "Status", cost: "3", type: "None", effect: "A defensive Shadow Wave. Nullifies Reflect, Light Screen, Safeguard, Mist and Lucky Chant." },
      { name: "Shadow Mist", category: "Status", cost: "3", type: "None", effect: "A shadowy mist hinders foes' evasion. Affects the user too if Mist already lingers." },
    ],
  },
  {
    title: "Class B",
    note: "Usable by Pokemon that have evolved at least once. Each costs 4.",
    moves: [
      { name: "Shadow Panic", category: "Status", cost: "4", type: "None", effect: "Confuses foes and makes them more liable to become infected." },
      { name: "Shadow Sky", category: "Status", cost: "4", type: "None", effect: "Dark rain hurts non-Shadow Pokemon; the uninfected become infected if they linger too long." },
      { name: "Shadow Rave", category: "Special", cost: "4", type: "None", effect: "Shadowy spikes emerge under foes and temporarily impale them." },
      { name: "Shadow Down", category: "Status", cost: "4", type: "None", effect: "Clinging chi lowers a foe's Defense. Affects the user if Mist already lingers." },
      { name: "Shadow Break", category: "Physical", cost: "4", type: "None", effect: "A powerful ram. Less powerful than Shadow Rush but has no recoil." },
      { name: "Shadow Half", category: "Status", cost: "4", type: "None", effect: "Exhausts everyone around and halves their health, the user's side included." },
    ],
  },
  {
    title: "Class C",
    note: "Usable only by fully evolved Pokemon. Costs vary; other restrictions may apply.",
    moves: [
      { name: "Shadow Blast", category: "Special", cost: "10", type: "None", effect: "A single wave of pure shadow energy. Drastically damages, and anything hit is guaranteed to be infected." },
      { name: "Shadow End", category: "Physical", cost: "10", type: "None", effect: "A devastating charge that heavily damages the user but infects anything it touches." },
      { name: "Shadow Storm", category: "Special", cost: "6", type: "Flying", effect: "A shadow-infused gale assaults and infects those caught in it." },
      { name: "Shadow Chill", category: "Special", cost: "8", type: "Ice", effect: "A blast of ice that can freeze even Ice-types. The ice will not melt for a long time, sidelining the Pokemon." },
      { name: "Shadow Bolt", category: "Special", cost: "8", type: "Electric", effect: "Paralysis that affects even Electric-types. Cures can mitigate the effect briefly." },
      { name: "Shadow Fire", category: "Special", cost: "8", type: "Fire", effect: "Severe burns that affect even Fire-types. Cures can mitigate the effect briefly." },
      { name: "Shadow Dust", category: "Status", cost: "7", type: "Bug", effect: "Drives Shadows into Hyper Mode and infects normals then Hyper Modes them, plus a random status ailment." },
      { name: "Shadow Thorn", category: "Physical", cost: "6", type: "Grass", effect: "Thorn-covered vines snare and impale a foe, infecting those punctured." },
      { name: "Shadow Torrent", category: "Special", cost: "6", type: "Water", effect: "A torrent damages friend and foe; lingering in the contaminated water infects." },
      { name: "Shadow Kiss", category: "Status", cost: "5", type: "Fairy", effect: "An immense attraction, any gender, that turns the target to the user's side until recalled or knocked out." },
      { name: "Shadow Pit", category: "Status", cost: "6", type: "Ground", effect: "The ground around foes softens to quicksand, keeping them from moving." },
      { name: "Shadow Fang", category: "Physical", cost: "7", type: "Poison", effect: "Badly poisons the target, even other Poison or Steel-types." },
      { name: "Shadow Spike", category: "Physical", cost: "6", type: "Rock", effect: "A corrupted Stone Edge that lowers the foe's guard, exposing them to more damage." },
      { name: "Shadow Aura", category: "Physical or Special", cost: "3 user, 1 foe (doubles each hit)", type: "Fighting", effect: "Can affect any Pokemon. Successive hits infect or push the foe closer to Hyper Mode." },
      { name: "Shadow Curse", category: "Status", cost: "5", type: "Ghost", effect: "Subjects a foe to the user's rage. If the user enters Hyper Mode, the foe rages too (and a Shadow foe is flung into Hyper Mode)." },
      { name: "Shadow Burden", category: "Status", cost: "Requires 5+ meter", type: "Dark", effect: "Unleashes all energy at once: infects normals, Hyper Modes Shadows, then depletes the user's meter and forces a brief rest." },
      { name: "Shadow Rage", category: "Physical", cost: "Varies", type: "Dragon", effect: "A corrupted Outrage that attacks endlessly, then leaves a hair-trigger temper that triggers Hyper Mode on the next meter gain." },
      { name: "Shadow Shield", category: "Status", cost: "9", type: "Steel", effect: "For one attack, the user is fully protected and reflects it and its effects back to the attacker." },
      { name: "Shadow Sight", category: "Status", cost: "5, 3, 2", type: "Psychic", effect: "Detect and avoid attacks up to three times in a row, then the user must briefly rest." },
    ],
  },
];

function MoveCard(props: { move: Move }) {
  const { move } = props;
  return (
    <Card bg="#2b2a2b" radius="md" p={12} withBorder>
      <Group justify="space-between" wrap="nowrap" mb={4} gap={8}>
        <Text fz={14} c="white" fw={600}>
          {move.name}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Badge size="sm" variant="light" color="grape">
            {move.category}
          </Badge>
          {move.type !== "None" && (
            <Badge size="sm" variant="light" color="cyan">
              {move.type}
            </Badge>
          )}
        </Group>
      </Group>
      <Text fz={12} c="dimmed">
        Cost: {move.cost}
      </Text>
      <Text fz={13} c="rgba(255,255,255,0.8)" mt={4} style={{ lineHeight: 1.6 }}>
        {move.effect}
      </Text>
    </Card>
  );
}

export default function MovesTab() {
  const [search, setSearch] = React.useState("");
  const q = search.trim().toLowerCase();

  const groups = SHADOW_MOVES.map((group) => ({
    ...group,
    moves: q
      ? group.moves.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.type.toLowerCase().includes(q) ||
            m.category.toLowerCase().includes(q) ||
            group.title.toLowerCase().includes(q)
        )
      : group.moves,
  })).filter((group) => group.moves.length);

  return (
    <Stack gap={16}>
      <Text fz={13} c="dimmed">
        Shadow Moves used by Shadow Pokemon. Which class a Pokemon can use depends
        on its evolution stage (see the Shadow Pokemon entry in the FAQ).
      </Text>
      <TextInput
        placeholder="Search moves by name, class or type"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={320}
        w="100%"
        radius="xl"
        styles={{ input: { background: "#2E2D2E" } }}
      />
      {groups.map((group) => (
        <Stack key={group.title} gap={8}>
          <Title order={3} c="white" size={18} fw={600}>
            {group.title}
          </Title>
          <Text fz={12} c="dimmed">
            {group.note}
          </Text>
          <Stack gap={8}>
            {group.moves.map((move) => (
              <MoveCard key={move.name} move={move} />
            ))}
          </Stack>
        </Stack>
      ))}
      {!groups.length && (
        <Text fz={13} c="dimmed" ta="center" py={20}>
          No moves match that search.
        </Text>
      )}
    </Stack>
  );
}
