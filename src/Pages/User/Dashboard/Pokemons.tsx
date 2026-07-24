import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
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
import { IconLock, IconTrash, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import PokemonImage from "../../../assets/images/sylveon.webp";
import DefaultCharacterImage from "../../../assets/images/character-default.jpg";
import { Conditional } from "../../../components/common/Conditional";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import {
  Character,
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
import { getCharacters, getItems, getOwnedPokemons, getTeamsRaw, hydrateTeams } from "../../../queries/dashboard";
import { callSetHeldItem, getThreadLocks } from "../../../queries/game";
import { NATURE_GROUPS, NATURE_GROUP_LABEL, natureOf } from "../../../lib/natures";
import { levelProgress } from "../../../lib/leveling";
import { eggGroupsForDex } from "../../../lib/eggGroups";
import { starForDex } from "../../../lib/encounterStars";
import { getItemImageURL } from "../../../helpers";
import { EvolveButton, LevelBar } from "../../../components/pokemon/EvolveButton";
import ShadowVaccineButton from "../../../components/pokemon/ShadowVaccineButton";
import { ItemHoverCard } from "../../../components/common/ItemHoverCard";
import { PokemonHoverCard } from "../../../components/pokemon/PokemonHoverCard";
import { SHADOW_GUIDE_LINK, STAT_MAX, isShadowed } from "../../../lib/shadow";
import { toastError, toastSuccess } from "../../../lib/toast";
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
    // Redesign: everything stacks full width (per-character team panels, then
    // "All Your Pokemon"); the old side-by-side split squeezed both panes.
    <Stack gap="clamp(14px, 2vw, 20px)" w="100%">
      <Conditional
        condition={isSingleTeam}
        component={
          <Box className="dc-card" p={{ base: 16, lg: "26px 30px" }} w="100%">
            <SingleTeam
              form={currentForm}
              isSingleTeam={isSingleTeam}
              loadTeamForEdit={loadTeamForEdit}
              resetEditing={resetEditing}
              team={team as Team}
            />
          </Box>
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
    </Stack>
  );
}

function useUpdateOrAddDocument(documentId?: string) {
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ values }: { values?: EditTeamType }) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { getDb } = await import("../../../context/firebase");
      const db = await getDb();

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
  // Characters, so teams can be grouped into the mockup's per-character panels.
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });

  if (isLoading || !owned) return <SectionLoader />;
  if (isError)
    return (
      <Text c="red.4" role="status" aria-live="polite">
        Could not load your teams. Refresh the page to try again.
      </Text>
    );

  const sortedData = hydrateTeams(rawTeams ?? [], owned.sortedData);
  const chars = characters?.sortedData ?? [];
  const groups = chars
    .map((character) => ({
      character,
      teams: sortedData.filter((t) => t.characterId === character.id),
    }))
    .filter((g) => g.teams.length > 0);
  // Teams with no (or a deleted) character stay shared for compatibility.
  const shared = sortedData.filter(
    (t) => !t.characterId || !chars.some((c) => c.id === t.characterId)
  );

  return (
    <Stack gap="clamp(14px, 2vw, 20px)" w="100%">
      <Flex justify="space-between" align="center" gap={12} wrap="wrap">
        <Text fz={14} c="#b6b1bc" maw={560}>
          Teams are grouped by character. Hover a pokemon for its full stats.
        </Text>
        <CreateNewTeam />
      </Flex>
      {groups.map((g) => (
        <CharacterTeamPanel
          key={g.character.id}
          character={g.character}
          teams={g.teams}
          form={form}
          loadTeamForEdit={loadTeamForEdit}
          resetEditing={resetEditing}
        />
      ))}
      {shared.length > 0 && (
        <CharacterTeamPanel
          character={null}
          teams={shared}
          form={form}
          loadTeamForEdit={loadTeamForEdit}
          resetEditing={resetEditing}
        />
      )}
      {!sortedData.length && (
        <EmptyMessage title="No teams" description="You currently have no teams created" />
      )}
    </Stack>
  );
}

/** One mockup panel: character header (avatar, name, pokemon count) with that
 * character's teams stacked below. `character` null = the shared group. */
function CharacterTeamPanel(props: { character: Character | null; teams: Team[] } & EditingProps) {
  const { character, teams, form, loadTeamForEdit, resetEditing } = props;
  const count = teams.reduce((n, t) => n + t.pokemons.length, 0);
  return (
    <Box className="dc-card" p={{ base: 16, lg: "26px 30px" }} w="100%">
      <Flex
        align="center"
        gap={{ base: 12, lg: 14 }}
        mb={{ base: 16, lg: 22 }}
        pb={{ base: 12, lg: 16 }}
        style={{ borderBottom: "1px solid #2a2637" }}
      >
        {character ? (
          <Avatar
            src={character.imageURL || DefaultCharacterImage}
            alt=""
            size={40}
            radius="xl"
            style={{ border: "2px solid #772976", flexShrink: 0 }}
          />
        ) : (
          <Box className="dc-diamond" style={{ background: "#772976" }} aria-hidden />
        )}
        <Title
          order={2}
          className="dc-display"
          c="white"
          fz={{ base: 16, lg: 19 }}
          tt="uppercase"
          lineClamp={1}
          style={{ letterSpacing: "0.06em", minWidth: 0 }}
        >
          {character?.name ?? "Shared Teams"}
        </Title>
        <Text fz={{ base: 12, lg: 14 }} c="#b6b1bc" style={{ flexShrink: 0 }}>
          {count} pokemon
        </Text>
      </Flex>
      <Stack gap="clamp(18px, 2vw, 22px)">
        {teams.map((team) => (
          <SingleTeam
            key={team.id}
            team={team}
            form={form}
            loadTeamForEdit={loadTeamForEdit}
            resetEditing={resetEditing}
          />
        ))}
      </Stack>
    </Box>
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
      const { getDb } = await import("../../../context/firebase");
      const db = await getDb();

      const docRef = doc(db, "users", user?.uid as string, "bag", "teams");
      await updateDoc(docRef, { [teamId]: deleteField() });
    },
  });

  const handleDelete = async () => {
    try {
      await mutateAsync({ teamId });
      close();
      await queryClient.invalidateQueries({ queryKey: ["get-teams"] });
      toastSuccess("Team deleted.");
    } catch (err) {
      toastError(err, "Could not delete the team.");
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

  // A team pinned into an open battle thread is read-only: editing it mid-battle
  // would desync the locked roster. threadLocks is server-written (see rules).
  const { data: threadLocks } = useQuery({
    queryKey: ["thread-locks", user?.uid],
    queryFn: () => getThreadLocks(user!.uid),
    enabled: !!user,
  });
  const lockedThread = React.useMemo(
    () =>
      Object.values(threadLocks ?? {}).find(
        (l) => Array.isArray(l.teamIds) && l.teamIds.includes(team.id)
      ) ?? null,
    [threadLocks, team.id]
  );

  // A locked team never enters edit mode, even on the single-team route where
  // the form starts preloaded with this team (direct URL while locked).
  const isEditing = React.useMemo(() => {
    return !lockedThread && form.values?.id === team.id;
  }, [lockedThread, form.values?.id, team.id]);

  const teamPokemons = React.useMemo(() => {
    return isEditing ? form.values?.pokemons || [] : team.pokemons;
  }, [isEditing, form.values?.pokemons, team.pokemons]);

  // The grid shows up to 6 pokemon; unfilled slots get a placeholder well.
  const displayedPokemons = teamPokemons.slice(0, 6);
  const emptySlots = 6 - displayedPokemons.length;

  const [nameError, setNameError] = React.useState("");

  const handleSave = async () => {
    if (!form.values) return;
    // Locks arrive async; a fast click between render and the locks query
    // resolving must not save a team pinned to a live thread.
    if (lockedThread) return;
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
      toastSuccess("Team saved.");
      if (isSingleTeam) {
        navigate("/Dashboard/Pokemon");
      }
    } catch (err) {
      toastError(err, "Could not save the team.");
    }
  };

  return (
    <Box w="100%">
      <Flex justify="space-between" align="center" gap={8} wrap="nowrap" mb={{ base: 12, lg: 14 }}>
        <Conditional
          condition={isEditing}
          component={
            <TextInput
              size="sm"
              maw={220}
              maxLength={20}
              error={nameError || undefined}
              aria-label="Team name"
              {...form.getInputProps("team_name")}
            />
          }
          fallback={
            <Title
              order={3}
              className="dc-display"
              lineClamp={1}
              fz={{ base: 14, lg: 16 }}
              c="white"
              style={{ letterSpacing: "0.06em", minWidth: 0 }}
            >
              TEAM ·{" "}
              <Text component="span" inherit c="#FFD074">
                {team.team_name}
              </Text>
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
            lockedThread ? (
              // Locked into a live thread: the badge replaces EDIT/DELETE
              // until the thread closes and the server clears the lock.
              <Tooltip
                withArrow
                label={
                  lockedThread.title
                    ? `Locked in "${lockedThread.title}". You can edit this team once the thread closes.`
                    : `Locked in an open battle thread (${lockedThread.threadId}).`
                }
              >
                <Badge
                  variant="outline"
                  size="lg"
                  leftSection={<IconLock size={12} />}
                  styles={{
                    root: {
                      borderColor: "#E54156",
                      color: "#E54156",
                      background: "transparent",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.14em",
                      flexShrink: 0,
                    },
                  }}
                >
                  {isOverLg ? "LOCKED TO THREAD" : "LOCKED"}
                </Badge>
              </Tooltip>
            ) : (
              <Group wrap="nowrap" gap={6} style={{ flexShrink: 0 }}>
                <DeleteTeam teamId={team.id} />
                <Button
                  variant="outline"
                  size="xs"
                  rightSection={<Image src={Edit2} alt="Edit" />}
                  onClick={() => {
                    // Guard the handler too, not just the button: a locked
                    // team must not open the editor from any click path.
                    if (lockedThread) return;
                    if (isOverLg) loadTeamForEdit(team);
                    else navigate(`/Dashboard/Pokemon/${team.id}`);
                  }}
                  styles={{
                    root: {
                      borderColor: "#12B7B6",
                      color: "#12B7B6",
                      background: "transparent",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      "&:hover": { background: "#12B7B6", color: "#1A1B1E" },
                    },
                  }}
                >
                  Edit Team
                </Button>
              </Group>
            )
          }
        />
      </Flex>
      {isEditing ? (
        <Select
          label="Owned by"
          placeholder="Any character (shared)"
          data={characterOptions}
          clearable
          size="xs"
          w="100%"
          mb={12}
          {...form.getInputProps("characterId")}
          styles={{ input: { background: "#0e0d11" }, label: { color: "white" } }}
        />
      ) : (
        isSingleTeam &&
        teamCharacterName && (
          <Text fz={14} c="dimmed" mb={12}>
            Character: {teamCharacterName}
          </Text>
        )
      )}
      <SimpleGrid cols={{ base: 3, lg: 6 }} spacing={{ base: 8, lg: 12 }}>
        {displayedPokemons.map((pokemon) => (
          <SinglePokemon form={form} isEditing={isEditing} key={pokemon.id} pokemon={pokemon} />
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <EmptySlot key={`empty-${index}`} isEditing={isEditing} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

/** Placeholder well for an unfilled team slot (dashed red while editing). */
function EmptySlot(props: { isEditing: boolean }) {
  return (
    <Box
      className="dc-card-tile"
      p={{ base: "12px 8px", lg: "14px 10px" }}
      style={props.isEditing ? { border: "1px dashed #DB5866" } : undefined}
    >
      <Stack gap={7} align="center">
        <Box
          w={{ base: 46, lg: 52 }}
          h={{ base: 46, lg: 52 }}
          style={{ background: "#0e0d11", border: "1px solid #232028", borderRadius: "100%" }}
        />
        <Text fz={{ base: 11, lg: 12 }} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.1em" }}>
          Empty
        </Text>
        <Box w="100%" h={4} bg="#2a2637" />
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
      toastSuccess("Team created.");
    } catch (err) {
      toastError(err, "Could not create the team.");
    }
  };

  return (
    <Stack gap={4} align="end">
      {teamCount >= TEAM_WARNING_AT && (
        <Text fz={14} c="#E54156">
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
  if (isError)
    return (
      <Text c="red.4" role="status" aria-live="polite">
        Could not load your pokemon. Refresh the page to try again.
      </Text>
    );

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

  const darkInput = { input: { background: "#0e0d11" }, label: { color: "white" } };

  return (
    <Box className="dc-card" w="100%" p={{ base: 16, lg: "26px 30px" }} sx={{ overflow: "hidden" }}>
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
                  label="Owned by"
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
                  fz={16}
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
        {displayedData.length ? (
          <SimpleGrid cols={{ base: 3, sm: 4, lg: 6 }} spacing={{ base: 8, lg: 12 }}>
            {displayedData.map((pokemon) => (
              <SinglePokemon
                form={form}
                key={pokemon.id}
                isOwned
                pokemon={pokemon}
                isEditing={!!form.values?.id}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Text fz={14} c="dimmed">
            No pokemon match these filters.
          </Text>
        )}
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
      alt={alt ?? "Pokemon sprite"}
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

/** Equip/remove a held item (battle effects run server-side; the curated set
 * is listed in Library > The War Room). Spends one from the bag on equip. */
function HeldItemSection(props: { pokemon: OwnedPokemon }) {
  const { pokemon } = props;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [choice, setChoice] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const { data: items } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user,
  });
  const holdables = (items ?? []).filter((i) => i.category === "hold-item" && Number(i.quantity) > 0);
  const mutation = useMutation({
    mutationFn: (itemId: string) => callSetHeldItem(pokemon.id, itemId),
    onSuccess: () => {
      setMessage("Updated!");
      setChoice(null);
      queryClient.invalidateQueries({ queryKey: ["get-owned-pokemons", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
    },
    onError: (e) => setMessage((e as Error).message || "That did not work."),
  });

  return (
    <Box>
      <Text fz={14} c="dimmed" tt="uppercase" fw={700}>
        Held item
      </Text>
      {pokemon.heldItem ? (
        <Group gap={8} mt={4}>
          {pokemon.heldItem.filePath && (
            <ItemHoverCard
              item={{
                id: pokemon.heldItem.itemId,
                name: pokemon.heldItem.name,
                category: pokemon.heldItem.category,
              }}
            >
              <Avatar src={getItemImageURL(pokemon.heldItem.filePath)} size={26} radius="sm" />
            </ItemHoverCard>
          )}
          <Text fz={14} c="white">
            {pokemon.heldItem.name}
          </Text>
          <Button
            size="compact-xs"
            radius="xl"
            variant="subtle"
            color="gray"
            loading={mutation.isPending}
            onClick={() => mutation.mutate("")}
          >
            Remove
          </Button>
        </Group>
      ) : (
        <Group gap={8} mt={4} align="flex-end">
          <Select
            placeholder={holdables.length ? "Pick a held item" : "No held items in your bag"}
            searchable
            data={holdables.map((i) => ({ value: i.id, label: `${i.name} (x${i.quantity})` }))}
            value={choice}
            onChange={setChoice}
            disabled={!holdables.length}
            size="xs"
            w={220}
            aria-label="Pick a held item"
            styles={{ input: { background: "#0e0d11" } }}
          />
          <Button
            size="compact-sm"
            radius="xl"
            color="grape"
            disabled={!choice}
            loading={mutation.isPending}
            onClick={() => choice && mutation.mutate(choice)}
          >
            Equip
          </Button>
        </Group>
      )}
      {message && (
        <Text fz={13} c="gold.1" mt={4} role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Box>
  );
}

function PokemonDetails(props: { pokemon: OwnedPokemon }) {
  const { pokemon } = props;
  const { user } = useAuth();
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const ownerName = (characters?.sortedData ?? []).find((c) => c.id === pokemon.characterId)?.name;
  const shadowed = isShadowed(pokemon);
  return (
    <Stack>
      <Group>
        <PokemonHoverCard pokemon={pokemon}>
          <Avatar
            src={getPokemonImageURL(pokemon.image_slug, pokemon.shiny)}
            alt={`${pokemon.name ?? pokemon.species ?? "Pokemon"} sprite`}
            w={60}
            h={60}
            radius={shadowed ? 4 : "xl"}
            sx={{ border: shadowed ? "1px solid #5a3fb0" : "4px solid white" }}
            bg={shadowed ? "#000" : "#909090"}
          />
        </PokemonHoverCard>
        <Stack gap={3}>
          <Group gap={6}>
            <Title order={3} size={20}>
              {pokemon.species} ({pokemon.gender})
            </Title>
            {shadowed && (
              <Badge
                component={Link}
                to={SHADOW_GUIDE_LINK}
                size="sm"
                style={{ background: "#000", border: "1px solid #5a3fb0", cursor: "pointer" }}
                c="grape.2"
                title="This pokemon is shadowed. Open the growth & shadow guide."
              >
                Shadow&apos;ed
              </Badge>
            )}
          </Group>
          {pokemon.date_caught?.seconds && (
            <Text>Caught {formatter.format(new Date(pokemon.date_caught.seconds * 1000))}</Text>
          )}
        </Stack>
      </Group>
      {/* Provenance: written by the forum catch flow (publishForumPost). */}
      {pokemon.caughtIn && (
        <Text fz={14}>
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
      {/* Game stats: friendship/shadow/purification run 0..100 (see Library). */}
      <Stack gap={2}>
        <Text fz={14}>Experience pts: {pokemon.experience ?? 0}</Text>
        <Text fz={14}>Friendship pts: {pokemon.friendship ?? 0} / {STAT_MAX}</Text>
        <Text fz={14}>Purification pts: {pokemon.purification ?? 0} / {STAT_MAX}</Text>
        <Text fz={14}>Shadow pts: {pokemon.shadow ?? 0} / {STAT_MAX}</Text>
        <Text fz={14}>
          Nature: {natureOf(pokemon)} ({NATURE_GROUP_LABEL[NATURE_GROUPS[natureOf(pokemon)] ?? "neutral"]})
        </Text>
        <Text fz={14}>
          Star level: {"★".repeat(starForDex(Number(pokemon.pokedex) || 0))} (
          {starForDex(Number(pokemon.pokedex) || 0)})
        </Text>
        <Text fz={14}>Egg group: {eggGroupsForDex(pokemon.pokedex ?? 0).join(" / ")}</Text>
        <Anchor component={Link} to={SHADOW_GUIDE_LINK} fz={14} c="grape.3">
          What do these stats mean?
        </Anchor>
      </Stack>
      <HeldItemSection pokemon={pokemon} />
      <Box>
        <Text fz={14} c="dimmed" tt="uppercase" fw={700}>
          Owned by
        </Text>
        <Text fz={14} c="white">
          {ownerName ?? "Unassigned"}
        </Text>
      </Box>
      <EvolveButton pokemon={pokemon} />
      <ShadowVaccineButton pokemon={pokemon} />
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

  const shadowed = isShadowed(pokemon);
  const prog = levelProgress(pokemon.experience ?? 0);
  return (
    // Hover (not click) reveals the info card: species, catch date, game
    // stats. Clicking a sprite otherwise triggered the browser's image menu
    // on mobile. The owned list while editing gets an Add-to-Team button.
    <HoverCard position="top" withArrow shadow="md" openDelay={80} closeDelay={100} width={280}>
      <HoverCard.Target>
        <Box
          className="dc-card-tile"
          pos="relative"
          p={{ base: "12px 8px", lg: "14px 10px" }}
          style={{
            cursor: "default",
            // Selected (already in team) = white so it reads clearly while
            // editing; shadowed mons keep a purple frame otherwise.
            ...(isEditing
              ? {
                  border: `${isAlreadyInTeam ? 2 : 1}px solid ${
                    isAlreadyInTeam ? "#FFFFFF" : "#DB5866"
                  }`,
                }
              : shadowed
                ? { border: "1px solid #5a3fb0" }
                : {}),
          }}
        >
          <Stack gap={7} align="center">
            <Box w={{ base: 46, lg: 52 }} h={{ base: 46, lg: 52 }}>
              <PokemonAvatar
                src={getPokemonImageURL(pokemon.image_slug, pokemon.shiny)}
                alt={pokemon.name}
                sx={{
                  imageRendering: "pixelated",
                  // Shadow mons read desaturated, per the mockup.
                  filter: shadowed ? "saturate(.3) brightness(.8)" : undefined,
                }}
              />
            </Box>
            <Text c="white" fw={700} fz={{ base: 12, lg: 14 }} ta="center" lineClamp={1} w="100%">
              {pokemon.name || pokemon.species}
            </Text>
            <Text c="#b6b1bc" fz={{ base: 11, lg: 14 }}>
              Lv {prog.level}
            </Text>
            {/* XP to next level: cyan bar, purple for shadow mons. */}
            <Box w="100%" h={4} bg="#2a2637">
              <Box
                h={4}
                w={`${Math.round(prog.ratio * 100)}%`}
                bg={shadowed ? "#772976" : "#12B7B6"}
              />
            </Box>
          </Stack>
          {/* This option is not shown in owned pokemons. Only in team pokemons to remove a pokemon from team */}
          <RemovePokemonFromTeam
            form={form}
            isEditing={isEditing as boolean}
            isOwned={isOwned}
            pokemonId={pokemon.id}
          />
        </Box>
      </HoverCard.Target>
      <HoverCard.Dropdown bg="#1E1D20" sx={{ borderRadius: 22 }} p={16}>
        <Stack gap={12}>
          <PokemonDetails pokemon={pokemon} />
          {canAddToTeam &&
            (isAlreadyInTeam ? (
              <Text fz={14} c="dimmed">
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
  );
}
