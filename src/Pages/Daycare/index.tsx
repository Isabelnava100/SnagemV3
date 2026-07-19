import {
  Avatar,
  Box,
  Button,
  Card,
  Container,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { PageHero } from "../../components/common/PageHero";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import { SnagIcon } from "../../icons/SnagIcon";
import { typesForDex } from "../../lib/typeChart";
import { canBreed, eggGroupsForDex } from "../../lib/eggGroups";
import { getOwnedPokemons } from "../../queries/dashboard";
import {
  DEFAULT_BATTLE_MECHANICS,
  callBreedPokemon,
  callHatchEgg,
  getBattleConfig,
  getDaycare,
} from "../../queries/game";

/**
 * The Daycare (breeding station). Leave one pair; if they get along an egg is
 * ready after mechanics.hatchPosts qualifying posts OR mechanics.hatchDays
 * days, whichever comes first (both admin-editable). Parents are compatible
 * when they share a type, share a species, or one is a Ditto; the hatchling
 * is the base form of the non-Ditto parent's line.
 */
export default function Daycare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leftId, setLeftId] = React.useState<string | null>(null);
  const [rightId, setRightId] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState<"left" | "right" | null>("left");
  const [message, setMessage] = React.useState("");

  const { data: owned, isPending } = useQuery({
    queryKey: ["owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const { data: daycare } = useQuery({
    queryKey: ["daycare", user?.uid],
    queryFn: () => getDaycare(user!.uid),
    enabled: !!user,
  });
  const { data: cfg } = useQuery({ queryKey: ["battle-config"], queryFn: getBattleConfig, enabled: !!user });
  const mech = cfg?.mechanics ?? DEFAULT_BATTLE_MECHANICS;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["daycare", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user?.uid] });
  };
  const breed = useMutation({
    mutationFn: () => callBreedPokemon(leftId!, rightId!),
    onSuccess: () => {
      setMessage("The pair settled in. Come back when the egg is ready!");
      setLeftId(null);
      setRightId(null);
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "They did not get along."),
  });
  const hatch = useMutation({
    mutationFn: callHatchEgg,
    onSuccess: (name) => {
      setMessage(`The egg hatched into ${name}!`);
      refresh();
    },
    onError: (e) => setMessage((e as Error).message || "The egg is not ready yet."),
  });

  if (!user) return null;
  if (isPending) return <SectionLoader />;
  const box = owned?.sortedData ?? [];
  const pokeOf = (id: string | null | undefined) => box.find((p) => p.id === id);

  const slot = (side: "left" | "right", id: string | null, name?: string) => {
    const poke = pokeOf(id);
    return (
      <Card
        withBorder
        radius={16}
        p={24}
        style={{
          flex: 1,
          minWidth: 260,
          borderStyle: "dashed",
          borderColor: side === "left" ? "#772976" : "#3a3550",
          background: "rgba(0,0,0,0.25)",
          cursor: daycare?.active ? "default" : "pointer",
        }}
        onClick={() => !daycare?.active && setPicking(side)}
        aria-label={`Choose the ${side} parent`}
      >
        <Stack align="center" gap={8}>
          <Text ff="monospace" fz={14} c="dimmed" tt="uppercase" style={{ letterSpacing: 2 }}>
            Parent · {side}
          </Text>
          {poke || name ? (
            <>
              {poke && <Avatar src={getPokemonImageURL(poke.image_slug)} size={72} radius="xl" />}
              <Text fz={18} fw={700} c="white">
                {poke?.species ?? poke?.name ?? name}
              </Text>
            </>
          ) : (
            <>
              <SnagIcon name="pokeball" size={48} cut="#141318" title="Empty slot" />
              <Text fz={18} fw={700} c="white">
                Leave a Pokemon
              </Text>
              <Text fz={14} c="dimmed">
                Pick from your box
              </Text>
            </>
          )}
        </Stack>
      </Card>
    );
  };

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <PageHero
        eyebrow="Breeding · One pair at a time"
        eyebrowColor="pink.0"
        title="The Daycare"
        subtitle={`Drop one Pokemon in each slot: a male and a female sharing an egg group (or anything with a Ditto). Legendaries and Undiscovered-group pokemon cannot breed. The Egg appears after ${mech.hatchDays ?? 15} days or ${mech.hatchPosts} posts, whichever comes first.`}
        aside={
          <Box px={16} py={12} style={{ borderRadius: 12, background: "rgba(0,0,0,0.35)", border: "1px solid #3a3550" }}>
            <Text ff="monospace" fz={12} c="dimmed" tt="uppercase">
              Egg timer
            </Text>
            <Text fz={18} fw={800} c="white">
              {mech.hatchDays ?? 15} days or {mech.hatchPosts} posts
            </Text>
            <Text fz={12} c="dimmed">
              whichever comes first
            </Text>
          </Box>
        }
        mb={24}
      />

      {message && (
        <Text fz={14} c="gold.1" mb={12} role="status" aria-live="polite">
          {message}
        </Text>
      )}

      {daycare?.active ? (
        <Stack gap={16}>
          <Group gap={16} align="stretch" wrap="wrap">
            {slot("left", daycare.leftId ?? null, daycare.leftName)}
            <Stack align="center" justify="center" gap={4}>
              <SnagIcon name="egg" size={44} cut="#1E1D20" title="Egg" />
              <Text fz={12} c="dimmed">
                Egg incoming
              </Text>
            </Stack>
            {slot("right", daycare.rightId ?? null, daycare.rightName)}
          </Group>
          <Button
            w="fit-content"
            radius="xl"
            color="grape"
            loading={hatch.isPending}
            onClick={() => hatch.mutate()}
          >
            Check the Egg
          </Button>
        </Stack>
      ) : (
        <Stack gap={16}>
          <Group gap={16} align="stretch" wrap="wrap">
            {slot("left", leftId)}
            <Stack align="center" justify="center" gap={4}>
              <Button
                radius="xl"
                size="sm"
                variant="light"
                color="grape"
                disabled={!leftId || !rightId}
                loading={breed.isPending}
                onClick={() => breed.mutate()}
              >
                Pick a Pair
              </Button>
            </Stack>
            {slot("right", rightId)}
          </Group>

          {picking && (
            <Card withBorder radius={16} p="md" style={{ background: "#141318" }}>
              <Group justify="space-between" mb={8}>
                <Text fw={700} c="white">
                  Your box, choose the {picking} parent
                </Text>
                <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setPicking(null)}>
                  Close
                </Button>
              </Group>
              <ScrollArea type="auto">
                <Group gap={12} wrap="nowrap">
                  {box.map((p) => (
                    <Card
                      key={p.id}
                      withBorder
                      radius={12}
                      p={10}
                      miw={110}
                      style={{ background: "#211f26", cursor: "pointer" }}
                      onClick={() => {
                        if (picking === "left") setLeftId(p.id);
                        else setRightId(p.id);
                        setPicking(picking === "left" ? "right" : null);
                      }}
                      aria-label={`Pick ${p.species ?? p.name}`}
                    >
                      <Stack gap={4} align="center">
                        <Avatar src={getPokemonImageURL(p.image_slug)} size={44} radius="xl" />
                        <Text fz={14} fw={600} c="white" lineClamp={1}>
                          {p.name || p.species}{" "}
                          <Text span c={p.gender === "F" ? "pink.0" : "blue.3"}>
                            {p.gender ?? ""}
                          </Text>
                        </Text>
                        <Text ff="monospace" fz={11} c="dimmed" tt="uppercase" ta="center">
                          {typesForDex(Number(p.pokedex) || 0).join(" · ")}
                        </Text>
                        <Text
                          ff="monospace"
                          fz={11}
                          c={canBreed(p.pokedex ?? 0) ? "teal.4" : "pink.0"}
                          tt="uppercase"
                          ta="center"
                        >
                          {eggGroupsForDex(p.pokedex ?? 0).join(" / ")}
                        </Text>
                      </Stack>
                    </Card>
                  ))}
                </Group>
              </ScrollArea>
            </Card>
          )}
          {daycare?.lastHatched && (
            <Text fz={13} c="dimmed">
              Last hatched here: {daycare.lastHatched}.
            </Text>
          )}
        </Stack>
      )}
    </Container>
  );
}
