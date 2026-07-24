import { Anchor, Container, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { getOwnedPokemons, getTeamsRaw, hydrateTeams } from "../../../queries/dashboard";
import Pokemons from "./Pokemons";

export default function PokemonTeam() {
  const { teamId } = useParams();
  const { user } = useAuth();
  // Shares the same cached queries as the Pokemon tab, no extra reads.
  const { isPending: isLoading, isError, data: rawTeams } = useQuery({
    queryKey: ["get-teams", user?.uid],
    queryFn: () => getTeamsRaw(user?.uid as string),
    enabled: !!teamId,
  });
  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user?.uid as string),
  });

  if (isLoading || !owned) return <SectionLoader />;

  const team = hydrateTeams(rawTeams ?? [], owned.sortedData).find((t) => t.id === teamId);
  if (isError || !team) {
    return (
      <Container size="sm" mt={60}>
        <Text c="white" fz={18} fw={700}>
          {isError ? "Could not load your teams. Refresh to try again." : "This team doesn't exist."}
        </Text>
        <Anchor component={Link} to="/Dashboard/Pokemon" c="blue.3" mt={8} display="inline-block">
          &larr; Back to your teams
        </Anchor>
      </Container>
    );
  }

  return <Pokemons isSingleTeam team={team} />;
}
