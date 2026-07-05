import {
  ActionIcon,
  Anchor,
  Avatar,
  Box,
  Button,
  Flex,
  Group,
  HoverCard,
  Image,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import type { EmotionSx as Sx } from "@mantine/emotion";
import { UseFormReturnType, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import PokemonImage from "../../../assets/images/sylveon.svg";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { EmptyMessage } from "../../../components/common/Message";
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
import { containsBlockedWord, excludeProperties, getPokemonImageURL } from "../../../helpers";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { Edit2, FileSearch } from "../../../icons";
import { getCharacters, getOwnedPokemons, getTeamsRaw, hydrateTeams } from "../../../queries/dashboard";
import { EvolveButton, LevelBar } from "../../../components/pokemon/EvolveButton";
import formatter from "../../../utils/date";

type TeamForm = UseFormReturnType<Team | null>;

interface EditingProps {
  loadTeamForEdit: (team: Team) => void;
  resetEditing: () => void;
  form: TeamForm;
}

type EditTeamType = Omit<Team, "id" | "pokemons">;

// A blank team so useForm never gets undefined initialValues (which crashes
// the whole page under Mantine 9). An empty id keeps it out of "editing" mode.
const EMPTY_TEAM: Team = {
  id: "",
  pokemon_ids: [],
  pokemons: [],
  team_name: "",
  times_battled: "0",
  created_at: { nt: 0, seconds: 0 },
};

export default function Pokemons(props: { isSingleTeam?: boolean; team?: Team }) {
  const { isSingleTeam = false, team = null } = props;
  const { isOverLg, isOverXs } = useMediaQuery();
  const currentForm = useForm<Team>({
    initialValues: team ?? EMPTY_TEAM,
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
        // Side-by-side only on large screens; below that the panels stack
        // vertically so neither the team editor nor "All Your Pokemon" gets
        // squeezed on phones/tablets.
        flexDirection: isOverLg ? "row" : "column",
      }}
      gap={15}
      align="start"
    >
      <Conditional
        condition={isSingleTeam}
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
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "teams");
      await setDoc(
        docRef,
        {
          [documentId || uuid()]: values || {
            pokemon_ids: [],
            team_name: "Untitled",
            times_battled: "0",
            created_at: new Date(),
          },
        },
        { merge: true }
      );
    },
  });
  return mutation;
}

function Teams(props: EditingProps) {
  const { form, loadTeamForEdit, resetEditing } = props;
  const { user } = useAuth();
  // Two cached queries instead of the old teams->owned cascade (one read each).
  const { data: rawTeams, isPending: isLoading, isError } = useQuery({
    queryKey: ["get-teams", user?.uid],
    queryFn: () => getTeamsRaw(user?.uid as string),
  });
  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user?.uid as string),
  });
  const { isOverLg } = useMediaQuery();

  if (isLoading || !owned) return <SectionLoader />;
  if (isError) return <></>;

  const sortedData = hydrateTeams(rawTeams ?? [], owned.sortedData);

  return (
    <Stack align="end" w="100%" maw={isOverLg ? 455 : undefined}>
      {sortedData.length ? (
        sortedData.map((team) => (
          <SingleTeam
            form={form}
            resetEditing={resetEditing}
            loadTeamForEdit={loadTeamForEdit}
            team={team}
            key={team.id}
          />
        ))
      ) : (
        <EmptyMessage title="No teams" description="You currently have no teams created" />
      )}
      <CreateNewTeam />
    </Stack>
  );
}

function DeleteTeam(props: { teamId: string }) {
  const { teamId } = props;
  const [opened, { close, open }] = useDisclosure(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: isLoading } = useMutation({
    mutationFn: async ({ teamId }: { teamId: string }) => {
      const { updateDoc, deleteField, doc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");

      const docRef = doc(db, "users", user?.uid as string, "bag", "teams");
      await updateDoc(docRef, { [teamId]: deleteField() });
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
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument(team.id);
  const { isOverLg } = useMediaQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Characters, so a team can be assigned to one (its Pokemon are that
  // character's box). Teams with no character stay shared for compatibility.
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const characterOptions = (characters?.sortedData ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const teamCharacterName = characters?.sortedData.find((c) => c.id === team.characterId)?.name;

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

  const [nameError, setNameError] = React.useState("");

  const handleSave = async () => {
    if (!form.values) return;
    // Team naming rules (Q4): max 20 chars, no blocked words.
    const name = (form.values.team_name ?? "").trim();
    if (name.length > 20) {
      setNameError("Team names are capped at 20 characters.");
      return;
    }
    if (containsBlockedWord(name)) {
      setNameError("That team name isn't allowed. Pick something else.");
      return;
    }
    setNameError("");
    try {
      await mutateAsync({ values: excludeProperties(form.values, ["id", "pokemons"]) });
      await queryClient.invalidateQueries({ queryKey: ["get-teams"] });
      await queryClient.invalidateQueries({ queryKey: ["get-team", team.id] });
      resetEditing();
      if (isSingleTeam) {
        navigate("/Dashboard/Pokemon");
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
                maxLength={20}
                error={nameError || undefined}
                {...form.getInputProps("team_name")}
              />
            }
            fallback={
              <Title
                lineClamp={1}
                sx={{ whiteSpace: "normal" }}
                order={3}
                size={isOverLg ? 22 : 18}
                c="white"
              >
                {team.team_name}
              </Title>
            }
          />
          <Conditional
            condition={isEditing}
            component={
              <Group wrap="nowrap" gap={0}>
                <Button
                  onClick={() => (isSingleTeam ? navigate("/Dashboard/Pokemon") : resetEditing())}
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
              <Group wrap="nowrap">
                <DeleteTeam teamId={team.id} />
                <GradientButtonPrimary
                  onClick={() =>
                    isOverLg ? loadTeamForEdit(team) : navigate(`/Dashboard/Pokemon/${team.id}`)
                  }
                  size="xs"
                  rightSection={<Image src={Edit2} alt="Edit" />}
                >
                  Edit
                </GradientButtonPrimary>
              </Group>
            }
          />
        </Flex>
        {isEditing ? (
          <Select
            label="Character"
            placeholder="Any character (shared)"
            data={characterOptions}
            clearable
            size="xs"
            w="100%"
            {...form.getInputProps("characterId")}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
        ) : (
          teamCharacterName && (
            <Text fz={11} c="dimmed">
              Character: {teamCharacterName}
            </Text>
          )
        )}
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

const MAX_TEAMS = 100;
const TEAM_WARNING_AT = 90;

function CreateNewTeam() {
  const { mutateAsync, isPending: isLoading } = useUpdateOrAddDocument();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Team cap (Q4): 100 max, warning from 90 (shares the cached teams query).
  const { data: rawTeams } = useQuery({
    queryKey: ["get-teams", user?.uid],
    queryFn: () => getTeamsRaw(user?.uid as string),
  });
  const teamCount = rawTeams?.length ?? 0;

  const handleClick = async () => {
    if (teamCount >= MAX_TEAMS) return;
    try {
      await mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ["get-teams"] });
    } catch (err) {
      //
    }
  };

  return (
    <Stack gap={4} align="end">
      {teamCount >= TEAM_WARNING_AT && (
        <Text fz={12} c="#E35C65">
          {teamCount >= MAX_TEAMS
            ? `You've reached the ${MAX_TEAMS}-team limit. Delete a team to make room.`
            : `${teamCount}/${MAX_TEAMS} teams. You're getting close to the limit.`}
        </Text>
      )}
      <GradientButtonSecondary
        onClick={handleClick}
        loading={isLoading}
        disabled={teamCount >= MAX_TEAMS}
      >
        Create a New Team
      </GradientButtonSecondary>
    </Stack>
  );
}

interface FilterState {
  search: string;
  type1: PokemonTypes | "";
  type2: PokemonTypes | "";
  generation: PokemonGenerations | "";
  gender: "" | "M" | "F";
  /** "" = all, "none" = unassigned, otherwise a character id. */
  characterId: string;
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  type1: "",
  type2: "",
  generation: "",
  gender: "",
  characterId: "",
};

function OwnedPokemons(props: EditingProps) {
  const { form } = props;
  const { user } = useAuth();
  const { data, isPending: isLoading, isError } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user?.uid as string),
  });
  const [filterState, setFilterState] = React.useState<FilterState>(EMPTY_FILTERS);
  const { isOverLg } = useMediaQuery();
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });

  const activeFilterCount = React.useMemo(
    () => Object.values(filterState).filter((v) => v !== "").length,
    [filterState]
  );

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  const { sortedData } = data;

  // Derive the displayed list from the filters (no effect/mirrored state, so a
  // search-only filter works too).
  const query = filterState.search.trim().toLowerCase();
  const displayedData = sortedData.filter((pokemon) => {
    if (filterState.type1 && pokemon.type1 !== filterState.type1) return false;
    if (filterState.type2 && pokemon.type2 !== filterState.type2) return false;
    if (filterState.generation && pokemon.generation !== filterState.generation) return false;
    if (filterState.gender && pokemon.gender !== filterState.gender) return false;
    if (filterState.characterId === "none" && pokemon.characterId) return false;
    if (
      filterState.characterId &&
      filterState.characterId !== "none" &&
      pokemon.characterId !== filterState.characterId
    )
      return false;
    if (query && !`${pokemon.name ?? ""} ${pokemon.species ?? ""}`.toLowerCase().includes(query))
      return false;
    return true;
  });

  const pokemonTypesFormatted = pokemonTypes.map((type) => ({ label: type, value: type }));
  const pokemonGenerationsFormatted = pokemonGenerations.map((generation) => ({
    label: generation,
    value: generation,
  }));

  const resetFilters = () => setFilterState(EMPTY_FILTERS);

  const darkInput = { input: { background: "#2E2D2E" }, label: { color: "white" } };

  return (
    <Box bg="#403C43" w="100%" p={20} sx={{ borderRadius: 20, overflow: "hidden" }}>
      <Stack>
        <Flex justify="space-between" align="center" gap={8} wrap="wrap">
          <Group align="end">
            <Title order={3} c="white" size={isOverLg ? 22 : 18}>
              All Your Pokemon
            </Title>
          </Group>
          <Popover position="bottom-end" withinPortal withArrow shadow="md">
            <Popover.Target>
              <GradientButtonPrimary rightSection={<Image src={FileSearch} alt="Adjust filters" />}>
                {activeFilterCount ? `Filters (${activeFilterCount})` : "Adjust filters"}
              </GradientButtonPrimary>
            </Popover.Target>
            {/* Full-width stacked fields so the panel fits a phone screen. */}
            <Popover.Dropdown bg="#1E1D20" p="md" w={280} maw="calc(100vw - 24px)">
              <Stack gap={12}>
                <TextInput
                  label="Search by name or species"
                  placeholder="e.g. Charmander"
                  value={filterState.search}
                  onChange={(e) =>
                    setFilterState((pre) => ({ ...pre, search: e.currentTarget.value }))
                  }
                  styles={darkInput}
                />
                <Select
                  label="Type 1"
                  clearable
                  value={filterState.type1 || null}
                  onChange={(value) =>
                    setFilterState((pre) => ({ ...pre, type1: (value ?? "") as PokemonTypes }))
                  }
                  data={pokemonTypesFormatted}
                  placeholder="Any"
                  styles={darkInput}
                />
                <Select
                  label="Type 2"
                  clearable
                  value={filterState.type2 || null}
                  onChange={(value) =>
                    setFilterState((pre) => ({ ...pre, type2: (value ?? "") as PokemonTypes }))
                  }
                  data={pokemonTypesFormatted}
                  placeholder="Any"
                  styles={darkInput}
                />
                <Select
                  label="Generation"
                  clearable
                  value={filterState.generation || null}
                  data={pokemonGenerationsFormatted}
                  placeholder="Any"
                  onChange={(value) =>
                    setFilterState((pre) => ({
                      ...pre,
                      generation: (value ?? "") as PokemonGenerations,
                    }))
                  }
                  styles={darkInput}
                />
                <Select
                  label="Gender"
                  clearable
                  value={filterState.gender || null}
                  data={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                  ]}
                  placeholder="Any"
                  onChange={(value) =>
                    setFilterState((pre) => ({ ...pre, gender: (value ?? "") as "M" | "F" }))
                  }
                  styles={darkInput}
                />
                <Select
                  label="Character"
                  clearable
                  value={filterState.characterId || null}
                  data={[
                    { value: "none", label: "Unassigned" },
                    ...(characters?.sortedData ?? []).map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="Any character"
                  onChange={(value) =>
                    setFilterState((pre) => ({ ...pre, characterId: value ?? "" }))
                  }
                  styles={darkInput}
                />
                <Anchor
                  component="button"
                  type="button"
                  onClick={resetFilters}
                  underline="always"
                  c="#4DABF7"
                  fz={14}
                  fw={600}
                  ta="center"
                  style={{ opacity: activeFilterCount ? 1 : 0.5 }}
                >
                  Clear filters
                </Anchor>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Flex>
        <Flex sx={{ flexWrap: "wrap" }} gap={7}>
          {displayedData.length ? (
            displayedData.map((pokemon) => (
              <SinglePokemon
                form={form}
                key={pokemon.id}
                isOwned
                pokemon={pokemon}
                isEditing={!!form.values?.id}
              />
            ))
          ) : (
            <Text fz={13} c="dimmed">
              No pokemon match these filters.
            </Text>
          )}
        </Flex>
      </Stack>
    </Box>
  );
}

const PokemonAvatar = React.forwardRef<
  HTMLImageElement,
  { src?: string; alt?: string; sx?: Sx; onClick?: () => void }
>((props, ref) => {
  // Spread the remaining props (HoverCard.Target/Tooltip inject aria + handlers).
  const { src, alt, sx, onClick, ...others } = props;
  return (
    <Image
      ref={ref}
      src={src || PokemonImage}
      onClick={onClick || undefined}
      // Block the browser's long-press/right-click image menu so tapping a
      // sprite reveals the info card instead of "Save Image…".
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      alt={alt}
      w="100%"
      h="100%"
      sx={{
        objectFit: "cover",
        userSelect: "none",
        WebkitTouchCallout: "none",
        ...(sx || {}),
      }}
      {...others}
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const assign = useMutation({
    mutationFn: async (characterId: string | null) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../context/firebase");
      await setDoc(
        doc(db, "users", user!.uid, "bag", "owned_pokemons"),
        { [pokemon.id]: { characterId: characterId ?? "" } },
        { merge: true }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons", user?.uid] }),
  });
  return (
    <Stack>
      <Group>
        <Avatar
          src={getPokemonImageURL(pokemon.image_slug, pokemon.shiny)}
          alt={`${pokemon.name ?? pokemon.species ?? "Pokemon"} sprite`}
          w={60}
          h={60}
          radius="xl"
          sx={{ border: "4px solid white" }}
          bg="#909090"
        />
        <Stack gap={3}>
          <Title order={3} size={16}>
            {pokemon.species} ({pokemon.gender})
          </Title>
          {pokemon.date_caught?.seconds && (
            <Text>Caught {formatter.format(new Date(pokemon.date_caught.seconds * 1000))}</Text>
          )}
        </Stack>
      </Group>
      {/* Provenance: written by the forum catch flow (publishForumPost). */}
      {pokemon.caughtIn && (
        <Text fz={13}>
          Caught in{" "}
          <Link
            to={`/Forum/${pokemon.caughtIn.forum}/thread/${pokemon.caughtIn.threadId}/last`}
            style={{ color: "#346CFD" }}
          >
            {pokemon.caughtIn.threadTitle || "this thread"}
          </Link>
        </Text>
      )}
      {/* Level is derived from experience; the bar shows progress to the next. */}
      <LevelBar experience={pokemon.experience} />
      {/* Game stats: experience accrues from forum posting (thread xpConfig). */}
      <Stack gap={2}>
        <Text fz={12}>Experience pts: {pokemon.experience ?? 0}</Text>
        <Text fz={12}>Friendship pts: {pokemon.friendship ?? 0}</Text>
        <Text fz={12}>Purification pts: {pokemon.purification ?? 0}</Text>
        <Text fz={12}>Shadow pts: {pokemon.shadow ?? 0}</Text>
      </Stack>
      <Select
        label="Character"
        placeholder="Unassigned"
        size="xs"
        clearable
        data={(characters?.sortedData ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={pokemon.characterId || null}
        disabled={assign.isPending}
        onChange={(value) => assign.mutateAsync(value)}
        styles={{ input: { background: "#2E2D2E" } }}
      />
      <EvolveButton pokemon={pokemon} />
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
  const isAlreadyInTeam = React.useMemo(() => {
    return form.values?.pokemon_ids.includes(pokemon.id);
  }, [form.values?.pokemon_ids]);

  // Only the owned list while editing can add to the team.
  const canAddToTeam = Boolean(isOwned && isEditing);

  const handleAddPokemonToTeam = () => {
    if (!form.values || !canAddToTeam) return;
    if (!form.values.pokemon_ids.includes(pokemon.id)) {
      form.setFieldValue("pokemon_ids", [...form.values.pokemon_ids, pokemon.id]);
      form.setFieldValue("pokemons", [...form.values.pokemons, pokemon]);
    }
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
        // Selected (already in team) = white so it reads clearly; hover = purple.
        border: isEditing
          ? `${isAlreadyInTeam ? 2 : 1}px solid ${isAlreadyInTeam ? "#FFFFFF" : "#DB5866"}`
          : undefined,
        "&:hover": isEditing ? { borderColor: "#762B77" } : undefined,
        flexShrink: 0,
      }}
    >
      {/* Hover (not click) reveals the info card: species, catch date, game
          stats. Clicking a sprite otherwise triggered the browser's image menu
          on mobile. The owned list while editing gets an Add-to-Team button. */}
      <HoverCard position="top" withArrow shadow="md" openDelay={80} closeDelay={100} width={280}>
        <HoverCard.Target>
          <PokemonAvatar src={getPokemonImageURL(pokemon.image_slug, pokemon.shiny)} alt={pokemon.name} />
        </HoverCard.Target>
        <HoverCard.Dropdown bg="#1E1D20" sx={{ borderRadius: 22 }} p={16}>
          <Stack gap={12}>
            <PokemonDetails pokemon={pokemon} />
            {canAddToTeam &&
              (isAlreadyInTeam ? (
                <Text fz={12} c="dimmed">
                  Already in this team.
                </Text>
              ) : (
                <GradientButtonPrimary onClick={handleAddPokemonToTeam} radius="xl" size="xs">
                  Add to Team
                </GradientButtonPrimary>
              ))}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
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
