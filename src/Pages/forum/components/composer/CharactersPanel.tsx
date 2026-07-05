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

/**
 * "Characters" composer panel: checkbox per character; checking one reveals a
 * team picker whose party renders as sprite circles (from the design frames).
 */
export default function CharactersPanel(props: {
  value: PostCharacter[];
  onChange: (next: PostCharacter[]) => void;
  /** Edit mode: published characters are read-only. */
  locked?: boolean;
  hint?: string;
}) {
  const { user } = useAuth();
  const { value, onChange, locked } = props;

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

  const teamOptions = React.useMemo(
    () =>
      (teams?.sortedData ?? []).map((team) => ({
        value: team.id,
        label: `${team.team_name || "Unnamed team"} — ${team.pokemons
          .map((p) => p.name)
          .slice(0, 4)
          .join(", ")}${team.pokemons.length > 4 ? "..." : ""}`,
      })),
    [teams]
  );

  const toggleCharacter = (characterId: string, checked: boolean) => {
    const character = characters?.sortedData.find((c) => c.id === characterId);
    if (!character) return;
    if (!checked) {
      onChange(value.filter((c) => c.id !== characterId));
      return;
    }
    onChange([
      ...value,
      {
        id: character.id,
        name: character.name,
        imageURL: character.imageURL ?? "",
        pokemon: [],
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
                    <Select
                      placeholder="Bring a team along (optional)"
                      data={teamOptions}
                      value={picked.teamId ?? null}
                      onChange={(teamId) => pickTeam(character.id, teamId)}
                      clearable
                      size="xs"
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
                  </Stack>
                )}
              </Stack>
            );
          })}
          {!characters?.sortedData.length && (
            <Text fz={13} c="dimmed">
              You have no characters yet — create them from your dashboard.
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </ForumPanel>
  );
}
