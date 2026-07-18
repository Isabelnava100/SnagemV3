import { Avatar, Checkbox, Group, ScrollArea, Select, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import { getPokemonImageURL } from "../../../../helpers";
import {
  getCharacters,
  getOwnedPokemons,
  getTeamsRaw,
  hydrateTeams,
} from "../../../../queries/dashboard";
import { PostCharacter } from "../../types";
import { ForumPanel, ForumTextLink, PanelHint } from "../ui";
import { EvolveButton } from "../../../../components/pokemon/EvolveButton";
import { canEverEvolve } from "../../../../lib/evolution";
import { levelProgress } from "../../../../lib/leveling";

/**
 * "Characters" composer panel: checkbox per character; checking one reveals a
 * team picker whose party renders as sprite circles (from the design frames).
 */
export default function CharactersPanel(props: {
  value: PostCharacter[];
  onChange: (next: PostCharacter[]) => void;
  /** Edit mode: published characters are read-only. */
  locked?: boolean;
  /**
   * Team lock: after the first post on a locked thread, characters can only
   * bring these team ids. With a single locked team it is auto-assigned and
   * shown read-only.
   */
  restrictToTeamIds?: string[];
  hint?: string;
}) {
  const { user } = useAuth();
  const { value, onChange, locked } = props;
  const restrictTo = props.restrictToTeamIds?.length ? props.restrictToTeamIds : null;

  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const { data: rawTeams } = useQuery({
    queryKey: ["get-teams", user?.uid],
    queryFn: () => getTeamsRaw(user!.uid),
    enabled: !!user,
  });
  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const teams = React.useMemo(
    () => ({ sortedData: hydrateTeams(rawTeams ?? [], owned?.sortedData ?? []) }),
    [rawTeams, owned]
  );

  // Teams available to a given character: its own plus any shared (no
  // characterId) team, so existing teams keep working after the split.
  const teamOptionsFor = React.useCallback(
    (characterId: string) =>
      (teams?.sortedData ?? [])
        .filter((team) => !team.characterId || team.characterId === characterId)
        .filter((team) => !restrictTo || restrictTo.includes(team.id))
        .map((team) => ({
          value: team.id,
          label: `${team.team_name || "Unnamed team"}: ${team.pokemons
            .map((p) => p.name)
            .slice(0, 4)
            .join(", ")}${team.pokemons.length > 4 ? "..." : ""}`,
        })),
    [teams, restrictTo]
  );

  const toggleCharacter = (characterId: string, checked: boolean) => {
    const character = characters?.sortedData.find((c) => c.id === characterId);
    if (!character) return;
    if (!checked) {
      onChange(value.filter((c) => c.id !== characterId));
      return;
    }
    // On a team-locked thread with a single locked team, assign it right away
    // so the member never has to (or can) pick.
    const lockedTeam =
      restrictTo && restrictTo.length === 1
        ? teams?.sortedData.find((t) => t.id === restrictTo[0])
        : undefined;
    onChange([
      ...value,
      {
        id: character.id,
        name: character.name,
        imageURL: character.imageURL ?? "",
        ...(lockedTeam
          ? { teamId: lockedTeam.id, teamName: lockedTeam.team_name }
          : {}),
        pokemon: lockedTeam
          ? (lockedTeam.pokemons ?? [])
              .slice(0, 6)
              .map((p) => ({ slug: p.image_slug, name: p.name }))
          : [],
      },
    ]);
  };

  const pickTeam = (characterId: string, teamId: string | null) => {
    const team = teams?.sortedData.find((t) => t.id === teamId);
    onChange(
      value.map((c) =>
        c.id === characterId
          ? {
              ...c,
              teamId: team?.id,
              teamName: team?.team_name,
              pokemon: (team?.pokemons ?? [])
                .slice(0, 6)
                .map((p) => ({ slug: p.image_slug, name: p.name })),
            }
          : c
      )
    );
  };

  if (locked) {
    return (
      <ForumPanel title="Characters">
        <PanelHint>These are the characters used in this post.</PanelHint>
        {value.length ? (
          value.map((character) => (
            <Stack key={character.id} gap={6} mb={8}>
              <Text c="white" fz={14}>
                {character.name}
              </Text>
              <Group gap={6}>
                {character.pokemon.map((p) => (
                  <Avatar key={p.slug} src={getPokemonImageURL(p.slug)} alt={`${p.name} sprite`} size={34} radius="xl" bg="#2b2a2b" title={p.name} />
                ))}
              </Group>
            </Stack>
          ))
        ) : (
          <Text fz={13} c="dimmed">
            No characters were attached to this post.
          </Text>
        )}
      </ForumPanel>
    );
  }

  return (
    <ForumPanel title="Characters">
      <PanelHint>
        {props.hint ??
          "Choose the characters you want to include in this post to make it clearer for everyone."}{" "}
        You can go{" "}
        <ForumTextLink component={Link} to="/Dashboard/Characters" fz={11}>
          here
        </ForumTextLink>{" "}
        to set up your characters.
      </PanelHint>
      <ScrollArea.Autosize mah={260}>
        <Stack gap={10}>
          {(characters?.sortedData ?? []).map((character) => {
            const picked = value.find((c) => c.id === character.id);
            return (
              <Stack key={character.id} gap={6}>
                <Checkbox
                  label={character.name}
                  color="green.0"
                  checked={!!picked}
                  onChange={(e) => toggleCharacter(character.id, e.currentTarget.checked)}
                  styles={{ label: { color: "white", fontSize: 14 } }}
                />
                {picked && (
                  <Stack gap={6} pl={30}>
                    {restrictTo ? (
                      <Text fz={11} c="dimmed">
                        You are locked to the team from your first post on this
                        thread. This is the team fighting with you here.
                      </Text>
                    ) : (
                      <Text fz={11} c="dimmed">
                        Select the team to use. Its Pokemon are the ones that earn
                        experience and rewards from this post.
                      </Text>
                    )}
                    <Select
                      placeholder="Select the team to use"
                      aria-label="Team for this character"
                      data={teamOptionsFor(character.id)}
                      value={picked.teamId ?? null}
                      onChange={(teamId) => pickTeam(character.id, teamId)}
                      clearable={!restrictTo}
                      disabled={
                        !!restrictTo &&
                        !!picked.teamId &&
                        teamOptionsFor(character.id).length <= 1
                      }
                      size="xs"
                      nothingFoundMessage="No teams for this character yet"
                      searchable
                      styles={{ input: { background: "#2E2D2E" } }}
                    />
                    {!!picked.pokemon.length && (
                      <Group gap={4}>
                        {picked.pokemon.map((p) => (
                          <Avatar
                            key={p.slug}
                            src={getPokemonImageURL(p.slug)}
                            alt={`${p.name} sprite`}
                            size={34}
                            radius="xl"
                            bg="#2b2a2b"
                            title={p.name}
                          />
                        ))}
                      </Group>
                    )}
                    {/* Evolve eligible party members without leaving the composer. */}
                    {(teams?.sortedData.find((t) => t.id === picked.teamId)?.pokemons ?? [])
                      .filter((m) => canEverEvolve(m))
                      .map((m) => (
                        <Group key={m.id} gap={8} wrap="nowrap" justify="space-between">
                          <Text fz={12} c="white" truncate>
                            {m.species} · Lv {levelProgress(m.experience ?? 0).level}
                          </Text>
                          <EvolveButton pokemon={m} compact />
                        </Group>
                      ))}
                  </Stack>
                )}
              </Stack>
            );
          })}
          {!characters?.sortedData.length && (
            <Text fz={13} c="dimmed">
              You have no characters yet. Create them from your dashboard.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </ForumPanel>
  );
}
