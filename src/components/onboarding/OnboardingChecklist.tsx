import {
  Avatar,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconPointFilled } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import { PokemonHoverCard } from "../pokemon/PokemonHoverCard";
import { starterOptions } from "../../lib/starters";
import { chooseStarter } from "../../queries/onboarding";
import { getCharacters, getOwnedPokemons, getTeamsRaw } from "../../queries/dashboard";

/**
 * Shared "are you set up to roleplay yet?" status: at least one character, at
 * least one owned pokemon, and at least one team with a pokemon on it. The
 * forum callables enforce the same three steps server-side, so this hook is
 * what the composers and the dashboard welcome use to guide people there
 * BEFORE they hit the wall.
 */
export function useOnboardingStatus() {
  const { user } = useAuth();
  const characters = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const teams = useQuery({
    queryKey: ["get-teams", user?.uid],
    queryFn: () => getTeamsRaw(user!.uid),
    enabled: !!user,
  });
  const owned = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });

  const loading = !!user && (characters.isPending || teams.isPending || owned.isPending);
  // Fail open on read errors: the publish callables enforce the same rule
  // server-side, so a transient Firestore error must never lock a fully
  // set-up member out of the composer.
  const errored = characters.isError || teams.isError || owned.isError;
  const hasCharacter = (characters.data?.sortedData.length ?? 0) > 0;
  const ownedCount = owned.data?.sortedData.length ?? 0;
  const hasReadyTeam = (teams.data ?? []).some((t) => (t.pokemon_ids ?? []).length > 0);
  return {
    loading,
    hasCharacter,
    hasPokemon: ownedCount > 0,
    ownedCount,
    hasReadyTeam,
    complete: errored || (hasCharacter && ownedCount > 0 && hasReadyTeam),
  };
}

function StepRow(props: { done: boolean; label: string; children?: React.ReactNode }) {
  return (
    <Group gap={10} align="flex-start" wrap="nowrap">
      <ThemeIcon
        size={22}
        radius="xl"
        color={props.done ? "green.0" : "gray"}
        variant={props.done ? "filled" : "light"}
      >
        {props.done ? <IconCheck size={14} /> : <IconPointFilled size={14} />}
      </ThemeIcon>
      <Stack gap={6} style={{ flex: 1 }}>
        <Text c={props.done ? "dimmed" : "white"} fz={15} td={props.done ? "line-through" : undefined}>
          {props.label}
        </Text>
        {!props.done && props.children}
      </Stack>
    </Group>
  );
}

/** Inline starter claim, shown while the member owns zero pokemon: a sprite
 * grid (classic starters first) with a search filter. Also used by the
 * First Adventure wizard (/Welcome). */
export function StarterPicker() {
  const queryClient = useQueryClient();
  const options = React.useMemo(starterOptions, []);
  const [slug, setSlug] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [message, setMessage] = React.useState("");

  const shown = options.filter((o) =>
    o.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const selected = options.find((o) => o.slug === slug);

  const claim = useMutation({
    mutationFn: () => chooseStarter(slug!),
    onSuccess: async (res) => {
      setMessage(`${res.name} joined your box! Now add it to a team.`);
      await queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons"] });
    },
    onError: (err) =>
      setMessage((err as Error).message || "Could not claim that starter. Try again."),
  });

  return (
    <Stack gap={8}>
      <TextInput
        label="Choose your starter pokemon"
        description="Any classic starter (shown first), or any 1 star species."
        placeholder="Search by name"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        w={{ base: "100%", xs: 300 }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <Box mah={240} style={{ overflowY: "auto" }} pr={4}>
        <Group gap={6} wrap="wrap">
          {shown.map((o) => {
            const isSelected = o.slug === slug;
            return (
              <UnstyledButton
                key={o.slug}
                onClick={() => setSlug(isSelected ? null : o.slug)}
                aria-label={`${o.name}${o.isClassic ? ", classic starter" : ""}`}
                aria-pressed={isSelected}
                title={o.name}
                p={2}
                style={{
                  borderRadius: 10,
                  border: isSelected ? "2px solid #63e6be" : "2px solid transparent",
                  background: isSelected ? "#1f3a31" : o.isClassic ? "#2c2434" : "#2E2D2E",
                }}
              >
                <PokemonHoverCard species={{ slug: o.slug }}>
                  <Avatar
                    src={getPokemonImageURL(o.slug)}
                    alt=""
                    w={44}
                    h={44}
                    radius="md"
                    bg="transparent"
                  />
                </PokemonHoverCard>
              </UnstyledButton>
            );
          })}
          {!shown.length && (
            <Text fz={14} c="dimmed">
              No starter matches that name.
            </Text>
          )}
        </Group>
      </Box>
      <Group gap={10} align="center" wrap="wrap">
        <Button
          color="green.0"
          radius="xl"
          size="xs"
          disabled={!slug}
          loading={claim.isPending}
          onClick={() => claim.mutateAsync()}
        >
          {selected ? `Claim ${selected.name}` : "Claim starter"}
        </Button>
        {selected && (
          <Text fz={14} c="white">
            {selected.name}
            {selected.isClassic ? " (classic starter)" : ""}
          </Text>
        )}
      </Group>
      {message && (
        <Text fz={14} c={claim.isError ? "red.3" : "green.0"} role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Three-step setup guide (character, first pokemon, team). Rendered on the
 * dashboard welcome while incomplete and as the composers' pre-gate, so new
 * members (including Gaia returnees who finished their import) always know the
 * next step before writing a post.
 */
export default function OnboardingChecklist(props: { intro?: string }) {
  const status = useOnboardingStatus();
  if (status.loading) return null;

  return (
    <Stack gap={14}>
      {props.intro && <Text c="white">{props.intro}</Text>}
      <Paper p={14} radius="md" bg="#242224" style={{ border: "1px solid #4a464a" }}>
        <Stack gap={12}>
          <StepRow done={status.hasCharacter} label="1. Create your first character.">
            <Box>
              <Button
                component={Link}
                to="/Dashboard/Characters"
                size="xs"
                radius="xl"
                color="pink.0"
              >
                Create a character
              </Button>
            </Box>
          </StepRow>
          <StepRow done={status.hasPokemon} label="2. Get your first pokemon.">
            <StarterPicker />
          </StepRow>
          <StepRow
            done={status.hasReadyTeam}
            label="3. Build a team and add at least one pokemon to it."
          >
            <Box>
              <Button component={Link} to="/Dashboard/Pokemon" size="xs" radius="xl" color="pink.0">
                Build a team
              </Button>
            </Box>
          </StepRow>
        </Stack>
      </Paper>
      {status.hasCharacter && status.hasPokemon && status.hasReadyTeam ? (
        <Group gap={10} wrap="wrap">
          <Text fz={14} c="#7CD992">
            All set! Next step: jump into a thread and make your first post.
          </Text>
          <Button component={Link} to="/Forum/Main-Forum" size="xs" radius="xl" color="grape">
            Browse the forums
          </Button>
        </Group>
      ) : (
        <Text fz={14} c="dimmed">
          Once all three are done you can post and make threads on the forums. Your character
          brings their team into every post, and the team earns experience as you roleplay.
        </Text>
      )}
    </Stack>
  );
}
