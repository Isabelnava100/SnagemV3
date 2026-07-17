import { Avatar, Checkbox, Group, Select, Stack, Text } from "@mantine/core";
import React from "react";
import { getPokemonImageURL } from "../../../../helpers";
import { Item, OwnedPokemon } from "../../../../components/types/typesUsed";
import { evaluateEvolutions } from "../../../../lib/evolution";
import { ForumPanel } from "../ui";

interface EvolveChoice {
  pokemonId: string;
  pokemonName: string;
  pokemonSlug: string;
  toIdx: number;
  toName: string;
  toSlug: string;
  requiredItemName?: string;
}

/**
 * Evolve-on-post: when a team pokemon is eligible to evolve, the poster can opt
 * to evolve it as part of publishing this post. The evolution only fires once
 * they confirm (and, for item evolutions, confirm the item spend). The intent
 * rides along to publishForumPost, which re-validates and applies it.
 */
export default function EvolutionPanel(props: {
  teamPokemon: OwnedPokemon[];
  items: Item[];
  value: { pokemonId: string; toIdx: number } | null;
  onChange: (v: { pokemonId: string; toIdx: number } | null) => void;
}) {
  const { teamPokemon, items, value, onChange } = props;
  const [enabled, setEnabled] = React.useState(false);
  const [pick, setPick] = React.useState<string | null>(null);
  const [confirm1, setConfirm1] = React.useState(false);
  const [confirm2, setConfirm2] = React.useState(false);

  const choices: EvolveChoice[] = React.useMemo(() => {
    const out: EvolveChoice[] = [];
    const seen = new Set<string>();
    teamPokemon.forEach((poke) => {
      if (!poke?.id || seen.has(poke.id)) return;
      seen.add(poke.id);
      evaluateEvolutions(poke, items).forEach((e) => {
        if (!e.eligible) return;
        out.push({
          pokemonId: poke.id,
          pokemonName: poke.name || poke.species,
          pokemonSlug: poke.image_slug,
          toIdx: e.option.toIdx,
          toName: e.option.toName,
          toSlug: e.option.toSlug,
          requiredItemName: e.requiredItemName,
        });
      });
    });
    return out;
  }, [teamPokemon, items]);

  const chosen = choices.find((c) => `${c.pokemonId}:${c.toIdx}` === pick) ?? null;
  const needsItem = !!chosen?.requiredItemName;

  // Emit the confirmed intent (or clear it), only when it actually changes.
  React.useEffect(() => {
    const desired =
      enabled && chosen && confirm1 && (!needsItem || confirm2)
        ? { pokemonId: chosen.pokemonId, toIdx: chosen.toIdx }
        : null;
    const same =
      (!desired && !value) ||
      (!!desired && !!value && desired.pokemonId === value.pokemonId && desired.toIdx === value.toIdx);
    if (!same) onChange(desired);
  }, [enabled, chosen, confirm1, confirm2, needsItem, value, onChange]);

  if (!choices.length) return null;

  return (
    <ForumPanel title="Evolution">
      <Stack gap={8}>
        <Checkbox
          label="Hey! You can evolve a pokemon on this team. Evolve now by making a post about it?"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.currentTarget.checked);
            if (!e.currentTarget.checked) {
              setPick(null);
              setConfirm1(false);
              setConfirm2(false);
            }
          }}
          color="green.0"
          styles={{ label: { color: "white", fontSize: 13 } }}
        />
        {enabled && (
          <>
            <Select
              label="Which pokemon evolves?"
              placeholder="Pick an evolution"
              data={choices.map((c) => ({
                value: `${c.pokemonId}:${c.toIdx}`,
                label: `${c.pokemonName} into ${c.toName}`,
              }))}
              value={pick}
              onChange={(v) => {
                setPick(v);
                setConfirm1(false);
                setConfirm2(false);
              }}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            {chosen && (
              <Group gap={10} align="center">
                <Avatar src={getPokemonImageURL(chosen.pokemonSlug)} alt={chosen.pokemonName} size={40} radius="xl" />
                <Text c="dimmed" fz={18}>
                  →
                </Text>
                <Avatar src={getPokemonImageURL(chosen.toSlug)} alt={chosen.toName} size={40} radius="xl" />
              </Group>
            )}
            {chosen && (
              <Checkbox
                label="Are you sure? There's no going back."
                checked={confirm1}
                onChange={(e) => setConfirm1(e.currentTarget.checked)}
                color="green.0"
                styles={{ label: { color: "white", fontSize: 13 } }}
              />
            )}
            {chosen && needsItem && (
              <Checkbox
                label={`Evolving this pokemon means you'll consume a ${chosen.requiredItemName} from your bag. Are you sure?`}
                checked={confirm2}
                onChange={(e) => setConfirm2(e.currentTarget.checked)}
                color="green.0"
                styles={{ label: { color: "white", fontSize: 13 } }}
              />
            )}
            {value && chosen && (
              <Text fz={12} c="green.4" role="status" aria-live="polite">
                {chosen.pokemonName} will evolve into {chosen.toName} when you publish this post.
              </Text>
            )}
          </>
        )}
      </Stack>
    </ForumPanel>
  );
}
