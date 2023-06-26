import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Flex,
  Group,
  Image,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Sx,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash, IconX } from "@tabler/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import PokemonImage from "../../../assets/images/sylveon.svg";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import {
  OwnedPokemon,
  PokemonGenerations,
  PokemonTypes,
  Team,
  pokemonGenerations,
  pokemonTypes,
} from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { excludeProperties, getPokemonImageURL } from "../../../helpers";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit2, FileSearch } from "../../../icons";
import { getOwnedPokemons, getTeams } from "../../../queries/dashboard";
import formatter from "../../../utils/date";

type TeamForm = UseFormReturnType<Team | null>;

interface EditingProps {
  loadTeamForEdit: (team: Team) => void;
  resetEditing: () => void;
  form: TeamForm;
}

type EditTeamType = Omit<Team, "id" | "pokemons">;

export default function Pokemons(props: { isSingleTeam?: boolean; team?: Team }) {
  const { isSingleTeam = false, team = null } = props;
  const { isOverLg, isOverXs, isOverMd } = useMediaQuery();
  const currentForm = useForm<Team | null>({
    initialValues: team,
  });

  const loadTeamForEdit = (team: Team) => {
    currentForm.setValues(team);
  };

  const resetEditing = () => {
    currentForm.reset();
  };

  return (
    <Flex
      sx={{
        flexDirection:
          /**
           * Base "Column"
           * Base - Md "Row"
           * Md - Lg "Column"
           * Lg - * "Row"
           */
          isOverXs ? (isOverMd ? (isOverLg ? "row" : "column") : "row") : "row",
      }}
      gap={15}
      align="start"
    >
      <Conditional
        condition={!!isSingleTeam}
        component={
          <SingleTeam
            form={currentForm}
            isSingleTeam={isSingleTeam}
            loadTeamForEdit={loadTeamForEdit}
            resetEditing={resetEditing}
            team={team as Team}
          />
        }
        fallback={
          <Teams form={currentForm} loadTeamForEdit={loadTeamForEdit} resetEditing={resetEditing} />
        }
      />
      {isSingleTeam ? (
        <OwnedPokemons
          form={currentForm}
          loadTeamForEdit={loadTeamForEdit}
          resetEditing={resetEditing}
        />
      ) : (
        (isOverLg || isOverXs) && (
          <OwnedPokemons
            form={currentForm}
            loadTeamForEdit={loadTeamForEdit}
            resetEditing={resetEditing}
          />
        )
      )}
    </Flex>
  );
}

function useUpdateOrAddDocument(documentId?: string) {
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ values }: { values?: EditTeamType }) => {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "teams");
      await updateDoc(docRef, {
        [documentId || uuid()]: values || {
          pokemon_ids: [],
          team_name: "Untitled",
          times_battled: "0",
          created_at: new Date(),
        },
      });
    },
  });
  return mutation;
}

function Teams(props: EditingProps) {
  const { form, loadTeamForEdit, resetEditing } = props;
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
    <Stack align="end" w="100%" maw={isOverLg ? 455 : undefined}>
      {sortedData.map((team) => (
        <SingleTeam
          form={form}
          resetEditing={resetEditing}
          loadTeamForEdit={loadTeamForEdit}
          team={team}
          key={team.id}
        />
      ))}
      <CreateNewTeam />
    </Stack>
  );
}

function DeleteTeam(props: { teamId: string }) {
  const { teamId } = props;
  const [opened, { close, open }] = useDisclosure(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation({
    mutationFn: async ({ teamId }: { teamId: string }) => {
      const { setDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "teams");
      const {
        rawData: { [teamId]: documentToBeDeleted, ...rest },
      } = await getTeams(user?.uid as string);

      await setDoc(docRef, {
        ...rest,
      });
    },
  });

  const handleDelete = async () => {
    try {
      await mutateAsync({ teamId });
      close();
      await queryClient.invalidateQueries({ queryKey: ["get-teams"] });
    } catch (err) {
      //
    }
  };

  return (
    <Popover withArrow opened={opened} onClose={close}>
      <Popover.Target>
        <ActionIcon onClick={open} color="red" variant="transparent">
          <IconTrash size={20} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Text>Are you sure, you want to delete this team?</Text>
          <Group>
            <Button loading={isLoading} onClick={handleDelete}>
              Yes
            </Button>
            <Button onClick={close} loading={isLoading} color="gray">
              No
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function SingleTeam(props: { team: Team } & EditingProps & { isSingleTeam?: boolean }) {
  const { team, form, loadTeamForEdit, resetEditing, isSingleTeam = false } = props;
  const { mutateAsync, isLoading } = useUpdateOrAddDocument(team.id);
  const { isOverLg } = useMediaQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isEditing = React.useMemo(() => {
    return form.values?.id === team.id;
  }, [form.values?.id]);

  const teamPokemons = React.useMemo(() => {
    return isEditing ? form.values?.pokemons || [] : team.pokemons;
  }, [isEditing, form.values?.pokemons, team.pokemons]);

  const MAX_SLOTS_IN_A_ROW = 3;
  const firstRow = teamPokemons.slice(0, 3);
  const lastRow = teamPokemons.slice(3);
  const slotsRemainingRow1 = MAX_SLOTS_IN_A_ROW - firstRow.length;
  const slotsRemainingRow2 = MAX_SLOTS_IN_A_ROW - lastRow.length;

  const handleSave = async () => {
    if (!form.values) return;
    try {
      await mutateAsync({ values: excludeProperties(form.values, ["id", "pokemons"]) });
      await queryClient.invalidateQueries({ queryKey: ["get-teams"] });
      await queryClient.invalidateQueries({ queryKey: ["get-team", team.id] });
      resetEditing();
      if (isSingleTeam) {
        navigate("/Dashboard/Pokemons");
      }
    } catch (err) {
      //
    }
  };

  return (
    <Box bg="#403C43" w="100%" p={20} sx={{ borderRadius: 20, overflow: "hidden" }}>
      <Stack align={isOverLg ? undefined : "center"}>
        <Flex justify="space-between" align="center" w="100%">
          <Conditional
            condition={isEditing}
            component={
              <TextInput
                size="sm"
                maw={isOverLg ? undefined : 100}
                {...form.getInputProps("team_name")}
              />
            }
            fallback={
              <Title
                lineClamp={1}
                sx={{ whiteSpace: "normal" }}
                order={3}
                size={isOverLg ? 22 : 18}
                color="white"
              >
                {team.team_name}
              </Title>
            }
          />
          <Conditional
            condition={isEditing}
            component={
              <Group noWrap spacing={0}>
                <Button
                  onClick={() => (isSingleTeam ? navigate("/Dashboard/Pokemons") : resetEditing())}
                  color="gray"
                  size="xs"
                  variant="subtle"
                >
                  Cancel
                </Button>
                <GradientButtonSecondary size="xs" loading={isLoading} onClick={handleSave}>
                  Save
                </GradientButtonSecondary>
              </Group>
            }
            fallback={
              <Group noWrap>
                <DeleteTeam teamId={team.id} />
                <GradientButtonPrimary
                  onClick={() =>
                    isOverLg ? loadTeamForEdit(team) : navigate(`/Dashboard/Pokemons/${team.id}`)
                  }
                  size="xs"
                  rightIcon={<Image src={Edit2} />}
                >
                  Edit
                </GradientButtonPrimary>
              </Group>
            }
          />
        </Flex>
        <Flex justify="center" w="100%" wrap="wrap" gap={7}>
          <SimpleGrid sx={{ flexShrink: 0 }} cols={3} spacing={7}>
            {firstRow.map((pokemon) => (
              <SinglePokemon form={form} isEditing={isEditing} key={pokemon.id} pokemon={pokemon} />
            ))}
            {Array(slotsRemainingRow1)
              .fill(0)
              .map((_, index) => (
                <Box
                  w={60}
                  h={60}
                  key={index}
                  sx={{
                    border: isEditing ? "1px solid #DB5866" : undefined,
                    borderRadius: "100%",
                    flexShrink: 0,
                  }}
                  bg="#3C3A3C"
                />
              ))}
          </SimpleGrid>
          <SimpleGrid cols={3} spacing={7} sx={{ flexShrink: 0 }}>
            {lastRow.slice(0, 3).map((pokemon) => (
              <SinglePokemon form={form} isEditing={isEditing} key={pokemon.id} pokemon={pokemon} />
            ))}
            {Array(slotsRemainingRow2)
              .fill(0)
              .map((_, index) => (
                <Box
                  w={60}
                  h={60}
                  key={index}
                  sx={{
                    border: isEditing ? "1px solid #DB5866" : undefined,
                    borderRadius: "100%",
                    flexShrink: 0,
                  }}
                  bg="#3C3A3C"
                />
              ))}
          </SimpleGrid>
        </Flex>
      </Stack>
    </Box>
  );
}

function CreateNewTeam() {
  const { mutateAsync, isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();

  const handleClick = async () => {
    try {
      await mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ["get-teams"] });
    } catch (err) {
      //
    }
  };

  return (
    <GradientButtonSecondary onClick={handleClick} loading={isLoading}>
      Create a New Team
    </GradientButtonSecondary>
  );
}

interface FilterState {
  type1: PokemonTypes | "";
  type2: PokemonTypes | "";
  generation: PokemonGenerations | "";
}

function OwnedPokemons(props: EditingProps) {
  const { form } = props;
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["get-owned-pokemons"],
    queryFn: () => getOwnedPokemons(user?.uid as string),
  });
  const [filteredData, setFilteredData] = React.useState<typeof sortedData>([]);
  const [filterState, setFilterState] = React.useState<FilterState>({
    generation: "",
    type1: "",
    type2: "",
  });
  const { isOverLg } = useMediaQuery();

  // If one of the filter state has a value, means filter mode
  const isFiltering = React.useMemo(() => {
    const { generation, type1, type2 } = filterState;
    return generation || type1 || type2;
  }, [filterState]);

  // Filter the date when the filter state changes
  React.useEffect(() => {
    const { generation, type1, type2 } = filterState;

    if (generation === "" && type1 === "" && type2 === "") return;

    const filteredSortedData = data?.sortedData.filter((data) => {
      if (type1 && data.type1 !== type1) return false; // Filter out if type1 doesn't match
      if (type2 && data.type2 !== type2) return false; // Filter out if type2 doesn't match
      if (generation && data.generation !== generation) return false; // Filter out if generation doesn't match
      return true; // Keep the Pokemon in the filtered array
    });

    setFilteredData(filteredSortedData || []);
  }, [filterState]);

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { sortedData } = data;

  const displayedData = isFiltering ? filteredData : sortedData;

  // formatting them for the select field
  const pokemonTypesFormatted = pokemonTypes.map((type) => ({
    label: type,
    value: type,
  }));

  const pokemonGenerationsFormatted = pokemonGenerations.map((generation) => ({
    label: generation,
    value: generation,
  }));

  // exit filter mode
  const resetFilters = () => {
    setFilterState({
      generation: "",
      type1: "",
      type2: "",
    });
    setFilteredData([]);
  };

  return (
    <Box bg="#403C43" w="100%" p={20} sx={{ borderRadius: 20, overflow: "hidden" }}>
      <Stack>
        <Flex justify="space-between" align="center">
          <Group align="end">
            <Title order={3} color="white" size={isOverLg ? 22 : 18}>
              All Your Pokemon
            </Title>
          </Group>
          <Popover position="bottom-end" withinPortal withArrow>
            <Popover.Target>
              <GradientButtonPrimary rightIcon={<Image src={FileSearch} />}>
                Adjust filters
              </GradientButtonPrimary>
            </Popover.Target>
            <Popover.Dropdown maw="100%">
              <Stack p="sm">
                <Group>
                  <Text color="white">Type:</Text>
                  <Select
                    value={filterState.type1}
                    onChange={(value) =>
                      setFilterState((pre) => ({ ...pre, type1: value as PokemonTypes }))
                    }
                    data={pokemonTypesFormatted}
                    placeholder="Type 1"
                  />
                  <Select
                    value={filterState.type2}
                    onChange={(value) =>
                      setFilterState((pre) => ({ ...pre, type2: value as PokemonTypes }))
                    }
                    data={pokemonTypesFormatted}
                    placeholder="Type 2"
                  />
                </Group>
                <Group>
                  <Text color="white">Generation</Text>
                  <Select
                    value={filterState.generation}
                    data={pokemonGenerationsFormatted}
                    placeholder="Generation"
                    onChange={(value) =>
                      setFilterState((pre) => ({ ...pre, generation: value as PokemonGenerations }))
                    }
                  />
                </Group>
                <Button onClick={resetFilters} variant="subtle" size="xs" w="fit-content">
                  Clear filters
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Flex>
        <Flex sx={{ flexWrap: "wrap" }} gap={7}>
          {displayedData.map((pokemon) => (
            <SinglePokemon
              form={form}
              key={pokemon.id}
              isOwned
              pokemon={pokemon}
              isEditing={!!form.values?.id}
            />
          ))}
        </Flex>
      </Stack>
    </Box>
  );
}

const PokemonAvatar = React.forwardRef<
  HTMLDivElement,
  { src?: string; alt?: string; sx?: Sx; onClick?: () => void }
>((props, ref) => {
  const { src, alt, sx, onClick } = props;
  return (
    <Image
      ref={ref}
      src={src || PokemonImage}
      onClick={onClick || undefined}
      alt={alt}
      w="100%"
      h="100%"
      sx={{ objectFit: "cover", ...(sx || {}) }}
    />
  );
});

function RemovePokemonFromTeam(props: {
  isEditing: boolean;
  isOwned: boolean;
  form: TeamForm;
  pokemonId: string;
}) {
  const { isEditing, isOwned, form, pokemonId } = props;

  if (!isEditing || isOwned) return <></>;

  const handleRemovePokemonFromTeam = () => {
    if (form.values && form.values.pokemon_ids.includes(pokemonId)) {
      form.setFieldValue(
        "pokemon_ids",
        form.values.pokemon_ids.filter((listedPokemonId) => listedPokemonId !== pokemonId)
      );

      form.setFieldValue(
        "pokemons",
        form.values.pokemons.filter((listedPokemon) => listedPokemon.id !== pokemonId)
      );
    }
  };

  return (
    <div className="absolute top-0 right-0">
      <Tooltip label="Remove">
        <ActionIcon
          onClick={handleRemovePokemonFromTeam}
          color="red"
          variant="filled"
          radius="xl"
          size="xs"
        >
          <IconX />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}

function PokemonDetails(props: { pokemon: OwnedPokemon }) {
  const { pokemon } = props;
  return (
    <Stack>
      <Group>
        <Avatar
          src={getPokemonImageURL(pokemon.image_slug)}
          w={60}
          h={60}
          radius="xl"
          sx={{ border: "4px solid white" }}
          bg="#909090"
        />
        <Stack spacing={3}>
          <Title order={3} size={16}>
            {pokemon.species} ({pokemon.gender})
          </Title>
          <Text>{formatter.format(new Date(pokemon.date_caught.seconds))}</Text>
        </Stack>
      </Group>
      <Stack></Stack>
    </Stack>
  );
}

// This component is being used to represent both team and owned pokemons through the isOwned prop
function SinglePokemon(props: {
  pokemon: OwnedPokemon;
  isEditing?: boolean;
  isOwned?: boolean;
  form: TeamForm;
}) {
  const { pokemon, isEditing, isOwned = false, form } = props;
  const [opened, { open, close }] = useDisclosure(false);
  const [isShowingDetails, setShowingDetails] = React.useState(false);
  const isAlreadyInTeam = React.useMemo(() => {
    return form.values?.pokemon_ids.includes(pokemon.id);
  }, [form.values?.pokemon_ids]);

  const handleAddPokemonToTeam = () => {
    if (!form.values || !isOwned || !isEditing) return;
    if (!form.values.pokemon_ids.includes(pokemon.id)) {
      form.setFieldValue("pokemon_ids", [...form.values.pokemon_ids, pokemon.id]);
      form.setFieldValue("pokemons", [...form.values.pokemons, pokemon]);
    }
  };

  const closePopover = () => {
    close();
    setShowingDetails(false);
  };

  return (
    <Flex
      p={10}
      bg="#3C3A3C"
      justify="center"
      align="center"
      pos="relative"
      w={60}
      h={60}
      sx={{
        borderRadius: "100%",
        border: isEditing
          ? `1px solid ${opened ? "#762B77" : isAlreadyInTeam ? "#4821C3" : "#DB5866"}`
          : undefined,
        flexShrink: 0,
      }}
    >
      <Conditional
        condition={Boolean(isEditing && isOwned)}
        fallback={<PokemonAvatar src={getPokemonImageURL(pokemon.image_slug)} alt={pokemon.name} />}
        /**
         * A popover to show up two options (view and select). The view option will change the contents within the popover dropdown
         * Meaning it will remove the two buttons from the dropdown and render the pokemon details instead
         */
        component={
          <Popover
            opened={opened}
            position="top"
            onClose={closePopover}
            styles={{
              dropdown: isShowingDetails
                ? undefined
                : { background: "transparent", border: "none", boxShadow: "none" },
            }}
          >
            <Popover.Target>
              <PokemonAvatar
                src={getPokemonImageURL(pokemon.image_slug)}
                onClick={open}
                alt={pokemon.name}
                sx={{ cursor: "pointer" }}
              />
            </Popover.Target>
            <Popover.Dropdown
              bg={isShowingDetails ? "#1E1D20" : undefined}
              sx={{ borderRadius: isShowingDetails ? 22 : undefined }}
              p={isShowingDetails ? 16 : undefined}
              w="100%"
              maw={250}
            >
              {/*  */}
              <Conditional
                condition={isShowingDetails}
                component={<PokemonDetails pokemon={pokemon} />}
                fallback={
                  <Group w="100%" spacing={5}>
                    <GradientButtonPrimary
                      onClick={() => {
                        handleAddPokemonToTeam();
                        closePopover();
                      }}
                      radius="xl"
                      size="xs"
                    >
                      Select
                    </GradientButtonPrimary>
                    <GradientButtonPrimary
                      onClick={() => setShowingDetails(true)}
                      radius="xl"
                      size="xs"
                    >
                      View
                    </GradientButtonPrimary>
                  </Group>
                }
              />
            </Popover.Dropdown>
          </Popover>
        }
      />
      {/* This option is not shown in owned pokemons. Only in team pokemons to remove a pokemon from team */}
      <RemovePokemonFromTeam
        form={form}
        isEditing={isEditing as boolean}
        isOwned={isOwned}
        pokemonId={pokemon.id}
      />
    </Flex>
  );
}
