import {
  Box,
  Button,
  Flex,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import PokemonImage from "../../../assets/images/sylveon.svg";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { OwnedPokemon, Team } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit2, FileSearch } from "../../../icons";
import { getOwnedPokemons, getTeams } from "../../../queries/dashboard";

export default function Pokemons() {
  const { isOverLg } = useMediaQuery();
  return (
    <Flex sx={{ flexDirection: isOverLg ? "row" : "column" }} gap={15} align="start">
      <Teams />
      <OwnedPokemons />
    </Flex>
  );
}

function Teams() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-teams"],
    queryFn: () => getTeams(user?.uid as string),
  });
  const { isOverLg } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { sortedData } = data;

  return (
    <Stack w="100%" maw={isOverLg ? 455 : undefined}>
      {sortedData.map((team) => (
        <SingleTeam team={team} key={team.id} />
      ))}
    </Stack>
  );
}

function SingleTeam(props: { team: Team }) {
  const { team } = props;
  const [isEditing, setEditing] = useState(false);
  const form = useForm({
    initialValues: { ...team },
  });
  const { team_name } = form.values;
  const { isOverLg } = useMediaQuery();

  const MAX_SLOTS = 6;
  const slotsRemaining = MAX_SLOTS - team.pokemon_ids.length;

  return (
    <Box bg="#403C43" p={20} sx={{ borderRadius: 20, overflow: "hidden" }}>
      <Stack align={isOverLg ? undefined : "center"}>
        <Flex justify="space-between" align="center" w="100%">
          <Conditional
            condition={isEditing}
            component={
              <TextInput maw={isOverLg ? undefined : 100} {...form.getInputProps("team_name")} />
            }
            fallback={
              <Title order={3} size={isOverLg ? 24 : 18} color="white">
                {team_name}
              </Title>
            }
          />
          <Conditional
            condition={isEditing}
            component={
              <Group spacing={0}>
                <Button
                  onClick={() => {
                    form.reset();
                    setEditing(false);
                  }}
                  color="gray"
                  variant="subtle"
                >
                  Cancel
                </Button>
                <GradientButtonSecondary onClick={() => setEditing(false)}>
                  Save
                </GradientButtonSecondary>
              </Group>
            }
            fallback={
              <GradientButtonPrimary
                onClick={() => setEditing(true)}
                rightIcon={<Image src={Edit2} />}
              >
                Edit
              </GradientButtonPrimary>
            }
          />
        </Flex>
        <SimpleGrid cols={isOverLg ? 6 : 3} w="100%" maw={isOverLg ? undefined : 250} spacing={7}>
          {team.pokemons.map((pokemon) => (
            <SinglePokemon isEditing={isEditing} key={pokemon.id} pokemon={pokemon} />
          ))}
          {isEditing &&
            slotsRemaining > 0 &&
            Array(slotsRemaining)
              .fill(0)
              .map((_, index) => (
                <Box
                  w={60}
                  h={60}
                  sx={{ border: "1px solid #DB5866", borderRadius: "100%" }}
                  bg="#3C3A3C"
                  key={index}
                />
              ))}
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

function OwnedPokemons() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-owned-pokemons"],
    queryFn: () => getOwnedPokemons(user?.uid as string),
  });
  const { isOverLg } = useMediaQuery();

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { sortedData } = data;

  return (
    <Box bg="#403C43" w="100%" p={20} sx={{ borderRadius: 20, overflow: "hidden" }}>
      <Stack>
        <Flex justify="space-between" align="center">
          <Group align="end">
            <Title order={3} color="white" size={isOverLg ? 24 : 18}>
              All Your Pokemon
            </Title>
            {isOverLg && <Text>Drag & Drop to Move</Text>}
          </Group>
          <GradientButtonPrimary rightIcon={<Image src={FileSearch} />}>
            Adjust filters
          </GradientButtonPrimary>
        </Flex>
        <Flex sx={{ flexWrap: "wrap" }} gap={7}>
          {sortedData.map((pokemon) => (
            <SinglePokemon key={pokemon.id} pokemon={pokemon} />
          ))}
        </Flex>
      </Stack>
    </Box>
  );
}

function SinglePokemon(props: { pokemon: OwnedPokemon; isEditing?: boolean }) {
  const { pokemon, isEditing } = props;
  return (
    <Flex
      p={10}
      bg="#3C3A3C"
      justify="center"
      align="center"
      w={60}
      h={60}
      sx={{
        borderRadius: "100%",
        overflow: "hidden",
        border: isEditing ? "1px solid #DB5866" : undefined,
      }}
    >
      <Image src={PokemonImage} alt={pokemon.name} maw="100%" mah="100%" />
    </Flex>
  );
}
