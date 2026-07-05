import { Avatar, Badge, Box, Group, Popover, Progress, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { OwnedPokemon } from "../types/typesUsed";
import { getItems } from "../../queries/dashboard";
import { getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../helpers";
import { evaluateEvolutions } from "../../lib/evolution";
import { levelProgress } from "../../lib/leveling";
import { evolvePokemon } from "../../queries/evolution";
import { GradientButtonSecondary } from "../common/GradientButton";

/**
 * Trainer-facing evolve control for one owned Pokemon. Shows its level (derived
 * from experience) and, when the species has evolutions, an Evolve button.
 * Opening it lists each evolution with why it is or is not available yet;
 * branched lines (Eevee etc.) let the trainer pick. Reusable from the profile,
 * the post composer, and draft mode.
 */
export function EvolveButton(props: { pokemon: OwnedPokemon; compact?: boolean }) {
  const { pokemon, compact } = props;
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const [opened, { toggle, close }] = useDisclosure(false);

  const { data: items } = useQuery({
    queryKey: ["get-items", uid],
    queryFn: () => getItems(uid as string),
    enabled: !!uid && opened,
  });

  const level = levelProgress(pokemon.experience ?? 0).level;
  const options = React.useMemo(
    () => evaluateEvolutions(pokemon, items ?? []),
    [pokemon, items]
  );

  const evolve = useMutation({
    mutationFn: (choice: (typeof options)[number]) =>
      evolvePokemon(uid as string, pokemon.id, choice.option, choice.requiredItemId),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons", uid] });
      queryClient.invalidateQueries({ queryKey: ["get-items", uid] });
      queryClient.invalidateQueries({ queryKey: ["get-teams", uid] });
    },
  });

  // Nothing to show for a fully-evolved species.
  if (!options.length) return null;

  const anyEligible = options.some((o) => o.eligible);

  return (
    <Popover opened={opened} onChange={(o) => (o ? toggle() : close())} withArrow position="bottom" shadow="md">
      <Popover.Target>
        <GradientButtonSecondary
          size={compact ? "xs" : "sm"}
          radius="xl"
          onClick={toggle}
          variant={anyEligible ? undefined : "outline"}
        >
          {anyEligible ? "Evolve" : "Evolution"}
        </GradientButtonSecondary>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20" p="md" maw="calc(100vw - 24px)" w={300}>
        <Stack gap={10}>
          <Text c="white" fw={600} fz={14}>
            Evolve {pokemon.species} (Lv {level})
          </Text>
          {options.map((o, i) => (
            <Group key={i} justify="space-between" wrap="nowrap" gap={8}>
              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                <Avatar
                  src={getPokemonImageURL(o.option.toSlug)}
                  alt={o.option.toName}
                  size={34}
                  imageProps={{ style: { imageRendering: "pixelated" } }}
                >
                  <img src={POKEMON_SPRITE_FALLBACK} alt="" width={24} height={24} />
                </Avatar>
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text c="white" fz={13} truncate>
                    {o.option.toName}
                  </Text>
                  {o.option.note && (
                    <Text c="dimmed" fz={11} truncate>
                      {o.option.note}
                    </Text>
                  )}
                </Stack>
              </Group>
              {o.eligible ? (
                <GradientButtonSecondary
                  size="xs"
                  radius="xl"
                  loading={evolve.isPending}
                  onClick={() => evolve.mutate(o)}
                >
                  Evolve
                </GradientButtonSecondary>
              ) : (
                <Badge color="gray" variant="outline" size="sm" style={{ flexShrink: 0 }}>
                  {o.reason}
                </Badge>
              )}
            </Group>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

/** A compact level bar for a pokemon, driven by its experience. */
export function LevelBar(props: { experience?: number }) {
  const p = levelProgress(props.experience ?? 0);
  return (
    <Box>
      <Group justify="space-between" gap={4}>
        <Text fz={12} c="white">
          Level {p.level}
        </Text>
        {!p.isMax && (
          <Text fz={11} c="dimmed">
            {p.xpIntoLevel}/{p.xpForThisLevel} to next
          </Text>
        )}
      </Group>
      <Progress value={p.ratio * 100} size="sm" mt={2} color="grape" />
    </Box>
  );
}
