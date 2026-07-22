import { Anchor, Avatar, Checkbox, Group, Select, Stack, Text } from "@mantine/core";
import React from "react";
import { Link } from "react-router-dom";
import { getPokemonImageURL } from "../../../../helpers";
import { Item, OwnedPokemon } from "../../../../components/types/typesUsed";
import { PokemonHoverCard } from "../../../../components/pokemon/PokemonHoverCard";
import { canUseZCrystal, isZCrystal, zCrystalLabel } from "../../../../lib/battleItems";
import { ForumPanel } from "../ui";

interface ZChoice {
  pokemonId: string;
  pokemonName: string;
  pokemonSlug: string;
  itemId: string;
  crystalName: string;
  label: string;
}

/**
 * Z-Move for this post only. Like Mega it is a temporary ACTIVATION: the
 * Z-Crystal must be in the bag but is never consumed, and it grants one big
 * attack spike this post. Offered only for team pokemon that can use a Z-Crystal
 * the poster owns (type crystals match the pokemon's type, species crystals its
 * species).
 */
export default function ZPanel(props: {
  teamPokemon: OwnedPokemon[];
  items: Item[];
  value: { pokemonId: string; itemId: string } | null;
  onChange: (v: { pokemonId: string; itemId: string } | null) => void;
}) {
  const { teamPokemon, items, value, onChange } = props;
  const [enabled, setEnabled] = React.useState(false);
  const [pick, setPick] = React.useState<string | null>(null);

  const ownedCrystals = React.useMemo(
    () => items.filter((i) => Number(i.quantity) > 0 && isZCrystal(i.id)),
    [items]
  );

  const choices: ZChoice[] = React.useMemo(() => {
    const out: ZChoice[] = [];
    const seen = new Set<string>();
    teamPokemon.forEach((poke) => {
      if (!poke?.id) return;
      ownedCrystals.forEach((crystal) => {
        const combo = `${poke.id}:${crystal.id}`;
        if (seen.has(combo)) return;
        if (!canUseZCrystal(crystal.id, poke.pokedex, poke.image_slug)) return;
        seen.add(combo);
        out.push({
          pokemonId: poke.id,
          pokemonName: poke.name || poke.species,
          pokemonSlug: poke.image_slug,
          itemId: crystal.id,
          crystalName: crystal.name,
          label: zCrystalLabel(crystal.id),
        });
      });
    });
    return out;
  }, [teamPokemon, ownedCrystals]);

  const chosen = choices.find((c) => `${c.pokemonId}:${c.itemId}` === pick) ?? null;

  React.useEffect(() => {
    const desired = enabled && chosen ? { pokemonId: chosen.pokemonId, itemId: chosen.itemId } : null;
    const same =
      (!desired && !value) ||
      (!!desired && !!value && desired.pokemonId === value.pokemonId && desired.itemId === value.itemId);
    if (!same) onChange(desired);
  }, [enabled, chosen, value, onChange]);

  if (!choices.length) return null;

  return (
    <ForumPanel title="Z-Move">
      <Stack gap={8}>
        <Anchor component={Link} to="/Library?tab=battle" fz={14} c="grape.3">
          How Z-Moves work →
        </Anchor>
        <Checkbox
          label="Unleash a Z-Move this post? (Needs the Z-Crystal; it is NOT used up.)"
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
              label="Which pokemon uses its Z-Move?"
              placeholder="Pick a Z-Move"
              data={choices.map((c) => ({
                value: `${c.pokemonId}:${c.itemId}`,
                label: `${c.pokemonName}: ${c.label}`,
              }))}
              value={pick}
              onChange={setPick}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            {chosen && (
              <Group gap={10} align="center">
                <PokemonHoverCard species={{ slug: chosen.pokemonSlug, name: chosen.pokemonName }}>
                  <Avatar src={getPokemonImageURL(chosen.pokemonSlug)} alt={chosen.pokemonName} size={40} radius="xl" />
                </PokemonHoverCard>
                <Text c="grape.3" fz={14} fw={700}>
                  {chosen.label}
                </Text>
              </Group>
            )}
            {value && chosen && (
              <Text fz={14} c="grape.3" role="status" aria-live="polite">
                {chosen.pokemonName} unleashes its {chosen.label} for a big hit this post. The Z-Crystal
                stays in your bag.
              </Text>
            )}
          </>
        )}
      </Stack>
    </ForumPanel>
  );
}
