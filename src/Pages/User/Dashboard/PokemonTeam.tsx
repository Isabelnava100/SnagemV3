import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { getTeam } from "../../../queries/dashboard";
import Pokemons from "./Pokemons";

export default function PokemonTeam() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const { isLoading, isError, data } = useQuery({
    queryKey: ["get-team", teamId],
    queryFn: () => getTeam(user?.uid as string, teamId as string),
    enabled: !!teamId,
  });

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;
  if (!data.team) return <></>;

  const { team } = data;

  return <Pokemons isSingleTeam team={team} />;
}
