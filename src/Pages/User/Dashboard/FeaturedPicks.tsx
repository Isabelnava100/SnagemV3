import { Select, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../context/firebase";
import {
  getCharacters,
  getOwnedPokemons,
  getProfile,
  getTeamsRaw,
} from "../../../queries/dashboard";

/**
 * Featured picks: a character, a team and a caught pokemon the user pins to
 * the top of their public profile. Stored on bag/profile as
 * featuredCharacterId / featuredTeamId / featuredPokemonId. This is the data
 * plumbing + a basic picker. The public rendering gets its real design later.
 */
export default function FeaturedPicks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["get-profile", user?.uid],
    queryFn: () => getProfile(user!.uid),
    enabled: !!user,
  });
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const { data: teams } = useQuery({
    queryKey: ["get-teams", user?.uid],
    queryFn: () => getTeamsRaw(user!.uid),
    enabled: !!user,
  });
  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });

  const [character, setCharacter] = React.useState<string | null>(null);
  const [team, setTeam] = React.useState<string | null>(null);
  const [pokemon, setPokemon] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (profile && !loaded) {
      setCharacter(profile.featuredCharacterId ?? null);
      setTeam(profile.featuredTeamId ?? null);
      setPokemon(profile.featuredPokemonId ?? null);
      setLoaded(true);
    }
  }, [profile, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(
        doc(db, "users", user!.uid, "bag", "profile"),
        {
          featuredCharacterId: character ?? "",
          featuredTeamId: team ?? "",
          featuredPokemonId: pokemon ?? "",
        },
        { merge: true }
      );
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["get-profile", user?.uid] });
    },
  });

  if (!profile || !characters || !teams || !owned) return <SectionLoader />;

  return (
    <Stack gap={12} p={16} sx={{ background: "#403C43", borderRadius: 22 }}>
      <Title order={2} c="white" size={22} fw={400}>
        Featured on Your Profile
      </Title>
      <Text fz={13} c="dimmed">
        Pick a character, a team and a caught pokemon to showcase at the top of your public
        profile. (The public layout is coming; this just sets what shows.)
      </Text>

      <Select
        label="Featured Character"
        placeholder="Pick a character"
        clearable
        data={characters.sortedData.map((c) => ({ value: c.id, label: c.name }))}
        value={character}
        onChange={(v) => {
          setSaved(false);
          setCharacter(v);
        }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />

      <Select
        label="Featured Team"
        placeholder="Pick a team"
        clearable
        data={teams.map((t) => ({ value: t.id, label: t.team_name || "Unnamed team" }))}
        value={team}
        onChange={(v) => {
          setSaved(false);
          setTeam(v);
        }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />

      <Select
        label="Featured Pokemon"
        placeholder="Pick a pokemon"
        clearable
        searchable
        limit={30}
        data={owned.sortedData.map((p) => ({ value: p.id, label: `${p.name} (${p.gender})` }))}
        value={pokemon}
        onChange={(v) => {
          setSaved(false);
          setPokemon(v);
        }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />

      {saved && (
        <Text fz={13} c="green.0">
          Featured picks saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save Featured Picks
      </GradientButtonPrimary>
    </Stack>
  );
}
