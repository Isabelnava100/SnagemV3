import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Flex,
  Group,
  Image,
  Popover,
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
import { OwnedPokemon, Team } from "../../../components/types/typesUsed";
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
  const { isOverLg } = useMediaQuery();
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
    <Flex sx={{ flexDirection: isOverLg ? "row" : "column" }} gap={15} align="start">
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
        isOverLg && (
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

  const MAX_SLOTS = 6;
  const slotsRemaining = MAX_SLOTS - teamPokemons.length;

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
              <TextInput maw={isOverLg ? undefined : 100} {...form.getInputProps("team_name")} />
            }
            fallback={
              <Title order={3} size={isOverLg ? 24 : 18} color="white">
                {team.team_name}
              </Title>
            }
          />
          <Conditional
            condition={isEditing}
            component={
              <Group spacing={0}>
                <Button
                  onClick={() => (isSingleTeam ? navigate("/Dashboard/Pokemons") : resetEditing())}
                  color="gray"
                  variant="subtle"
                >
                  Cancel
                </Button>
                <GradientButtonSecondary loading={isLoading} onClick={handleSave}>
                  Save
                </GradientButtonSecondary>
              </Group>
            }
            fallback={
              <Group>
                <DeleteTeam teamId={team.id} />
                <GradientButtonPrimary
                  onClick={() =>
                    isOverLg ? loadTeamForEdit(team) : navigate(`/Dashboard/Pokemons/${team.id}`)
                  }
                  rightIcon={<Image src={Edit2} />}
                >
                  Edit
                </GradientButtonPrimary>
              </Group>
            }
          />
        </Flex>
        <SimpleGrid cols={isOverLg ? 6 : 3} w="100%" maw={isOverLg ? undefined : 250} spacing={7}>
          {teamPokemons.map((pokemon) => (
            <SinglePokemon form={form} isEditing={isEditing} key={pokemon.id} pokemon={pokemon} />
          ))}
          {slotsRemaining > 0 &&
            Array(slotsRemaining)
              .fill(0)
              .map((_, index) => (
                <Box
                  w={60}
                  h={60}
                  key={index}
                  sx={{ border: isEditing ? "1px solid #DB5866" : undefined, borderRadius: "100%" }}
                  bg="#3C3A3C"
                />
              ))}
        </SimpleGrid>
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

function OwnedPokemons(props: EditingProps) {
  const { form } = props;
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
    <Box bg="#403C43" w="100%" p={20} sx={{ borderRadius: 20 }}>
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
        border: isEditing ? "1px solid #DB5866" : undefined,
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
