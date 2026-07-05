import { Avatar, Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { EvolutionOption } from "../../data/pokemon/evolutions";
import { getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../helpers";
import { evolutionOptionsWithItem } from "../../lib/evolution";
import { levelProgress } from "../../lib/leveling";
import { OwnedPokemon } from "../types/typesUsed";
import { getOwnedPokemons } from "../../queries/dashboard";
import { evolvePokemon } from "../../queries/evolution";
import { GradientButtonSecondary } from "../common/GradientButton";

/**
 * Use an evolution item (Fire Stone, etc.) from the inventory. Opening it lists
 * the trainer's Pokemon that can evolve with this item, lets them inspect a
 * Pokemon's details, and confirm the evolution (which spends the item). If none
 * qualify, it says so.
 */
export function EvolveItemModal(props: {
  item: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const { item } = props;
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string>("");

  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", uid],
    queryFn: () => getOwnedPokemons(uid as string),
    enabled: !!uid && !!item,
  });

  // Flatten to (pokemon, option) choices this item can trigger right now.
  const choices = React.useMemo(() => {
    if (!item) return [];
    const list: { poke: OwnedPokemon; option: EvolutionOption }[] = [];
    (owned?.sortedData ?? []).forEach((poke) => {
      evolutionOptionsWithItem(poke, item.name).forEach((option) =>
        list.push({ poke, option })
      );
    });
    return list;
  }, [owned, item]);

  const evolve = useMutation({
    mutationFn: (choice: { poke: OwnedPokemon; option: EvolutionOption }) =>
      evolvePokemon(uid as string, choice.poke.id, choice.option, item!.id),
    onSuccess: (_r, choice) => {
      setDone(`${choice.poke.species} evolved into ${choice.option.toName}!`);
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons", uid] });
      queryClient.invalidateQueries({ queryKey: ["get-items", uid] });
      queryClient.invalidateQueries({ queryKey: ["get-teams", uid] });
    },
  });

  const close = () => {
    setExpanded(null);
    setDone("");
    props.onClose();
  };

  return (
    <Modal
      opened={!!item}
      onClose={close}
      title={<Text fw={700}>Use {item?.name}</Text>}
      centered
      radius={12}
    >
      {done ? (
        <Text fz={15} c="green.0" role="status" aria-live="polite">
          {done}
        </Text>
      ) : choices.length === 0 ? (
        <Text fz={14} c="dimmed">
          You have no Pokemon to evolve with a {item?.name} right now.
        </Text>
      ) : (
        <Stack gap={10}>
          <Text fz={13} c="dimmed">
            Pick a Pokemon to evolve. Using the {item?.name} spends one from your bag.
          </Text>
          {choices.map((choice, i) => {
            const { poke, option } = choice;
            const key = `${poke.id}:${option.toIdx}`;
            const level = levelProgress(poke.experience ?? 0).level;
            const open = expanded === key;
            return (
              <Box key={i} p={10} style={{ background: "#1E1D2080", borderRadius: 10 }}>
                <Group justify="space-between" wrap="nowrap" gap={8}>
                  <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Avatar
                      src={getPokemonImageURL(poke.image_slug)}
                      alt={poke.species}
                      size={40}
                      imageProps={{ style: { imageRendering: "pixelated" } }}
                    >
                      <img src={POKEMON_SPRITE_FALLBACK} alt="" width={28} height={28} />
                    </Avatar>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text c="white" fz={14} truncate>
                        {poke.species} (Lv {level})
                      </Text>
                      <Text c="dimmed" fz={12} truncate>
                        Evolves into {option.toName}
                      </Text>
                    </Stack>
                  </Group>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setExpanded(open ? null : key)}
                  >
                    {open ? "Hide" : "Details"}
                  </Button>
                </Group>

                {open && (
                  <Stack gap={8} mt={8}>
                    <Group gap={16} align="center">
                      <Avatar
                        src={getPokemonImageURL(poke.image_slug)}
                        alt={poke.species}
                        size={48}
                        imageProps={{ style: { imageRendering: "pixelated" } }}
                      />
                      <Text c="dimmed" fz={20}>
                        →
                      </Text>
                      <Avatar
                        src={getPokemonImageURL(option.toSlug)}
                        alt={option.toName}
                        size={48}
                        imageProps={{ style: { imageRendering: "pixelated" } }}
                      >
                        <img src={POKEMON_SPRITE_FALLBACK} alt="" width={32} height={32} />
                      </Avatar>
                    </Group>
                    <Stack gap={2}>
                      <Text fz={12} c="white">
                        Level {level} · {poke.gender}
                      </Text>
                      <Text fz={12} c="white">
                        Experience: {poke.experience ?? 0}
                      </Text>
                      <Text fz={12} c="white">
                        Friendship: {poke.friendship ?? 0}
                      </Text>
                      {poke.shadow ? (
                        <Text fz={12} c="white">
                          Shadow: {poke.shadow}
                        </Text>
                      ) : null}
                      {poke.purification ? (
                        <Text fz={12} c="white">
                          Purification: {poke.purification}
                        </Text>
                      ) : null}
                    </Stack>
                    <GradientButtonSecondary
                      radius="xl"
                      loading={evolve.isPending}
                      onClick={() => evolve.mutate(choice)}
                    >
                      Confirm: evolve into {option.toName}
                    </GradientButtonSecondary>
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Modal>
  );
}
