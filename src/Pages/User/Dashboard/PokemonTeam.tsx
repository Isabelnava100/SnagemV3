import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
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
  if (isError) return <></>;

  const team = hydrateTeams(rawTeams ?? [], owned.sortedData).find((t) => t.id === teamId);
  if (!team) return <></>;

  return <Pokemons isSingleTeam team={team} />;
}
