import { Anchor, Avatar, Checkbox, Group, Select, Stack, Text } from "@mantine/core";
import React from "react";
import { Link } from "react-router-dom";
import { getPokemonImageURL } from "../../../../helpers";
import { Item, OwnedPokemon } from "../../../../components/types/typesUsed";
import { megaFormsForSlug } from "../../../../lib/mega";
import { ForumPanel } from "../ui";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

interface MegaChoice {
  pokemonId: string;
  pokemonName: string;
  pokemonSlug: string;
  stone: string;
  toName: string;
  toSlug: string;
}

/**
 * Mega Evolution for this post only. Unlike a normal evolution it is a temporary
 * ACTIVATION: the Mega Stone must be in the bag but is never consumed, and the
 * pokemon reverts to its base form after the post. Offered only for team pokemon
 * whose species has a Mega form AND whose matching stone the poster owns.
 */
export default function MegaPanel(props: {
  teamPokemon: OwnedPokemon[];
  items: Item[];
  value: { pokemonId: string; stone: string } | null;
  onChange: (v: { pokemonId: string; stone: string } | null) => void;
}) {
  const { teamPokemon, items, value, onChange } = props;
  const [enabled, setEnabled] = React.useState(false);
  const [pick, setPick] = React.useState<string | null>(null);

  const ownedStones = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (Number(i.quantity) > 0) set.add(norm(i.name));
    });
    return set;
  }, [items]);

  const choices: MegaChoice[] = React.useMemo(() => {
    const out: MegaChoice[] = [];
    const seen = new Set<string>();
    teamPokemon.forEach((poke) => {
      if (!poke?.id || seen.has(poke.id)) return;
      seen.add(poke.id);
      megaFormsForSlug(poke.image_slug).forEach((form) => {
        if (!ownedStones.has(norm(form.stone))) return;
        out.push({
          pokemonId: poke.id,
          pokemonName: poke.name || poke.species,
          pokemonSlug: poke.image_slug,
          stone: form.stone,
          toName: form.name,
          toSlug: form.slug,
        });
      });
    });
    return out;
  }, [teamPokemon, ownedStones]);

  const chosen = choices.find((c) => `${c.pokemonId}:${c.stone}` === pick) ?? null;

  React.useEffect(() => {
    const desired = enabled && chosen ? { pokemonId: chosen.pokemonId, stone: chosen.stone } : null;
    const same =
      (!desired && !value) ||
      (!!desired && !!value && desired.pokemonId === value.pokemonId && desired.stone === value.stone);
    if (!same) onChange(desired);
  }, [enabled, chosen, value, onChange]);

  if (!choices.length) return null;

  return (
    <ForumPanel title="Mega Evolution">
      <Stack gap={8}>
        <Anchor component={Link} to="/Library?tab=battle" fz={14} c="grape.3">
          How Mega Evolution works →
        </Anchor>
        <Checkbox
          label="Mega Evolve one of your team for this post? (Needs the Mega Stone; it is NOT used up.)"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.currentTarget.checked);
            if (!e.currentTarget.checked) setPick(null);
          }}
          color="grape"
          styles={{ label: { color: "white", fontSize: 14 } }}
        />
        {enabled && (
          <>
            <Select
              label="Which pokemon Mega Evolves?"
              placeholder="Pick a Mega form"
              data={choices.map((c) => ({
                value: `${c.pokemonId}:${c.stone}`,
                label: `${c.pokemonName} → ${c.toName} (${c.stone})`,
              }))}
              value={pick}
              onChange={setPick}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            {chosen && (
              <Group gap={10} align="center">
                <Avatar src={getPokemonImageURL(chosen.pokemonSlug)} alt={chosen.pokemonName} size={40} radius="xl" />
                <Text c="dimmed" fz={22}>
                  →
                </Text>
                <Avatar src={getPokemonImageURL(chosen.toSlug)} alt={chosen.toName} size={40} radius="xl" />
              </Group>
            )}
            {value && chosen && (
              <Text fz={14} c="grape.3" role="status" aria-live="polite">
                {chosen.pokemonName} will Mega Evolve into {chosen.toName} for this post, then revert.
                Your {chosen.stone} stays in your bag.
              </Text>
            )}
          </>
        )}
      </Stack>
    </ForumPanel>
  );
}
