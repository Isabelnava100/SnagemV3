import {
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuid } from "uuid";
import React from "react";
import { Link, Navigate } from "react-router-dom";
import Seo from "../components/common/Seo";
import {
  PokemonChips,
  StarterPicker,
  TeamRosterPreview,
  useOnboardingStatus,
} from "../components/onboarding/OnboardingChecklist";
import { SectionLoader } from "../components/navigation/loading";
import { useAuth } from "../context/AuthContext";
import { assignPokemonCharacter } from "../queries/evolution";
import { getOwnedPokemons } from "../queries/dashboard";
import { toastError } from "../lib/toast";

const DISPLAY_FONT = "var(--font-display, 'Quantico', sans-serif)";

export function StepCard(props: {
  num: string;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      p={{ base: 16, sm: 22 }}
      style={{
        background: "#17151c",
        border: `1px solid ${props.done ? "#1f7a4d" : "#2a2637"}`,
      }}
    >
      <Group gap={14} align="flex-start" wrap="nowrap">
        <Text
          fz={34}
          fw={700}
          c={props.done ? "#3ecf8e" : "#FFD074"}
          style={{ fontFamily: DISPLAY_FONT, lineHeight: 1 }}
        >
          {props.num}
        </Text>
        <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={{ base: 17, sm: 20 }}
            style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.04em" }}
          >
            {props.title}
            {props.done ? "  ✓" : ""}
          </Text>
          {props.children}
        </Stack>
      </Group>
    </Box>
  );
}

/** Inline step 1: create the first character. Collects the same fields the
 * Gaia import review card does (name, age, pronouns, birthday, height, short
 * description, history); only the name is required. */
export function CreateCharacterStep() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({
    name: "",
    age: "",
    pronouns: "",
    birthday: "",
    height: "",
    short_description: "",
    history: "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.currentTarget.value }));
  const create = useMutation({
    mutationFn: async (values: typeof form) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { getDb } = await import("../context/firebase");
      const db = await getDb();
      await setDoc(
        doc(db, "users", user!.uid, "bag", "characters"),
        {
          [uuid()]: {
            age: values.age.trim(),
            birthday: values.birthday.trim(),
            height: values.height.trim(),
            moveset: "",
            name: values.name.trim(),
            short_description: values.short_description.trim(),
            history: values.history.trim(),
            species: "Human",
            pronouns: values.pronouns.trim(),
            type: "None",
            imageURL: "",
            createdAt: new Date(),
          },
        },
        { merge: true }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get-characters"] }),
    onError: (e) => toastError(e, "Could not create the character."),
  });
  const fieldStyles = {
    input: { background: "#141318", border: "1px solid #2a2637", color: "#fff" },
    label: { color: "#fff" },
  } as const;
  return (
    <Stack gap={10}>
      <Text fz={14} c="#b6b1bc" lh={1.55}>
        Your character is you in our world: a name, a face, a story. Fill in what you know — the
        same details the Gaia import collects. Everything stays editable later.
      </Text>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={10}>
        <TextInput
          label="Name"
          placeholder="e.g. Rell"
          required
          value={form.name}
          onChange={set("name")}
          styles={fieldStyles}
        />
        <TextInput label="Age" placeholder="Age" value={form.age} onChange={set("age")} styles={fieldStyles} />
        <TextInput
          label="Pronouns"
          placeholder="e.g. she/her, they/them"
          value={form.pronouns}
          onChange={set("pronouns")}
          styles={fieldStyles}
        />
        <TextInput
          label="Birthday"
          placeholder="Birthday"
          value={form.birthday}
          onChange={set("birthday")}
          styles={fieldStyles}
        />
        <TextInput
          label="Height"
          placeholder="Height"
          value={form.height}
          onChange={set("height")}
          styles={fieldStyles}
        />
      </SimpleGrid>
      <Textarea
        label="Short description"
        placeholder="A sentence or two about who they are"
        value={form.short_description}
        onChange={set("short_description")}
        autosize
        minRows={2}
        styles={fieldStyles}
      />
      <Textarea
        label="History"
        placeholder="Their background and story"
        value={form.history}
        onChange={set("history")}
        autosize
        minRows={3}
        styles={fieldStyles}
      />
      <Box>
        <Button
          color="grape"
          disabled={!form.name.trim()}
          loading={create.isPending}
          onClick={() => create.mutateAsync(form)}
        >
          Create my character
        </Button>
      </Box>
    </Stack>
  );
}

/** Inline step 3: name a team. Teams are automatic — every owned pokemon
 * joins — so show exactly who will be on it before the name goes in. */
export function CreateTeamStep() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const status = useOnboardingStatus();
  const [name, setName] = React.useState("");
  const owned = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const ownedList = owned.data?.sortedData ?? [];

  const create = useMutation({
    mutationFn: async (trimmed: string) => {
      const { doc, getDoc, setDoc } = await import("firebase/firestore");
      const { getDb } = await import("../context/firebase");
      const db = await getDb();
      // Put the team under the first character, move every owned Pokemon the
      // member has onto it, and assign unassigned Pokemon to that character so
      // the ownership rule (a Pokemon battles only for its own character)
      // holds from day one.
      const charsSnap = await getDoc(doc(db, "users", user!.uid, "bag", "characters"));
      const chars = Object.entries(charsSnap.data() ?? {});
      const [characterId] = chars[0] ?? [];
      const ownedSnap = await getDoc(doc(db, "users", user!.uid, "bag", "owned_pokemons"));
      const ownedIds = Object.keys(ownedSnap.data() ?? {});
      if (!characterId || !ownedIds.length) {
        throw new Error("missing-prereq");
      }
      for (const pokemonId of ownedIds) {
        const poke = (ownedSnap.data() ?? {})[pokemonId] as { characterId?: string };
        if (!poke?.characterId) {
          await assignPokemonCharacter(pokemonId, characterId);
        }
      }
      await setDoc(
        doc(db, "users", user!.uid, "bag", "teams"),
        {
          [uuid()]: {
            team_name: trimmed,
            characterId,
            pokemon_ids: ownedIds,
            times_battled: "0",
            created_at: new Date(),
          },
        },
        { merge: true }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get-teams"] }),
    onError: (e) => toastError(e, "Could not create the team."),
  });

  return (
    <Stack gap={8}>
      <Text fz={14} c="#b6b1bc" lh={1.55}>
        A team is the group of Pokemon that travels with your character. Give it a name — every
        Pokemon you own joins automatically. A Pokemon belongs to its character, so it can only
        join that character&apos;s team.
      </Text>
      {ownedList.length > 0 && (
        <Box>
          <Text fz={13} fw={700} c="#8f8a99" tt="uppercase" mb={6} style={{ letterSpacing: "0.08em" }}>
            On this team ({ownedList.length})
          </Text>
          <PokemonChips pokemon={ownedList} />
        </Box>
      )}
      <Group gap={8} wrap="wrap" align="flex-end">
        <TextInput
          label="Team name"
          placeholder="e.g. First Snag"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          w={{ base: "100%", xs: 260 }}
          styles={{ input: { background: "#141318", border: "1px solid #2a2637" } }}
        />
        <Button
          color="grape"
          disabled={!name.trim() || !status.hasCharacter || !status.hasPokemon}
          loading={create.isPending}
          onClick={() => create.mutateAsync(name.trim())}
        >
          Create my team
        </Button>
      </Group>
    </Stack>
  );
}

/**
 * The First Adventure: the required three-step setup every member finishes
 * before the dashboard, the composers, or any page that needs a team. Steps 4
 * and 5 teach the loop; the Stuck card points at GRAY and the Library.
 */
export default function Welcome() {
  const status = useOnboardingStatus();
  const { user } = useAuth();

  if (status.loading) return <SectionLoader />;
  // Gaia returnees set up through the import page, not the new-trainer wizard.
  if (user?.otherinfo?.isGaia === "Yes" && !status.complete) {
    return <Navigate to="/Onboarding" replace />;
  }

  return (
    <Container size="md" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo noindex title="Your First Adventure | Snagem Guild" />
      <Stack gap={16}>
        <Box>
          <Text
            fz={13}
            fw={700}
            c="#FFD074"
            tt="uppercase"
            style={{ letterSpacing: "0.22em", fontFamily: DISPLAY_FONT }}
          >
            New trainer orientation
          </Text>
          <Title
            order={1}
            c="white"
            fw={700}
            fz={{ base: 30, sm: 44 }}
            style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.02em", lineHeight: 1.05 }}
          >
            Welcome to the Snagem Guild, Trainer!
          </Title>
          <Text fz={{ base: 14, sm: 16 }} c="#b6b1bc" mt={10} lh={1.6}>
            Here is everything you need to start your first adventure. Three quick steps, then
            you are writing.
          </Text>
        </Box>

        <StepCard num="01" title="Create your character" done={status.hasCharacter}>
          {status.hasCharacter ? (
            <Text fz={14} c="#3ecf8e">Character created.</Text>
          ) : (
            <CreateCharacterStep />
          )}
        </StepCard>

        <StepCard num="02" title="Pick your first Pokemon" done={status.hasPokemon}>
          {status.hasPokemon ? (
            <Text fz={14} c="#3ecf8e">Starter claimed.</Text>
          ) : (
            <>
              <Text fz={14} c="#b6b1bc" lh={1.55}>
                Every trainer starts with one partner. Choose any 1 star Pokemon, or one of the
                classic starters. Choose well, this one is yours for good.
              </Text>
              <StarterPicker />
            </>
          )}
        </StepCard>

        <StepCard num="03" title="Build your team" done={status.hasReadyTeam}>
          {status.hasReadyTeam ? (
            <>
              <Text fz={14} c="#3ecf8e">Team ready.</Text>
              <TeamRosterPreview />
            </>
          ) : (
            <CreateTeamStep />
          )}
        </StepCard>

        <StepCard num="04" title="Write your first post" done={false}>
          <Text fz={14} c="#b6b1bc" lh={1.55}>
            Head to the Forums and open a thread in Main Adventures, or start your own. Every post
            is a piece of the story: describe what your character does, says, and feels. There is
            a small minimum length, so give us a real moment, not one line.
          </Text>
        </StepCard>

        {status.complete ? (
          <Box
            p={{ base: 18, sm: 24 }}
            style={{
              background: "linear-gradient(90deg, rgba(145,38,145,0.25), rgba(18,183,182,0.15))",
              border: "1px solid #3a3550",
            }}
          >
            <Text c="white" fw={700} fz={18} style={{ fontFamily: DISPLAY_FONT }}>
              All set, Trainer!
            </Text>
            <Text fz={14} c="#b6b1bc" mt={6} mb={14}>
              Your character, partner, and team are ready. Time to write your first post.
            </Text>
            <Group gap={10} wrap="wrap">
              <Button component={Link} to="/Forum/Main-Forum" color="grape" size="md">
                Go to the Forums
              </Button>
              <Button component={Link} to="/Dashboard" variant="light" color="cyan" size="md">
                Open my dashboard
              </Button>
            </Group>
          </Box>
        ) : (
          <Text fz={14} c="dimmed">
            Steps 1 to 3 are required before you can post, make threads, or open the dashboard.
          </Text>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12}>
          <Box p={16} style={{ background: "#17151c", border: "1px solid #2a2637" }}>
            <Text c="white" fw={700} fz={15} style={{ fontFamily: DISPLAY_FONT }}>
              Stuck? Ask GRAY
            </Text>
            <Text fz={14} c="#b6b1bc" mt={6} mb={10} lh={1.55}>
              The walkie icon in your nav bar is our built-in helper. Ask it anything about
              playing, teams, posting, or currencies, and it answers instantly. It also files
              bugs and suggestions straight to the staff.
            </Text>
            <Button component={Link} to="/GRAY" variant="light" color="grape" size="xs">
              Chat with GRAY
            </Button>
          </Box>
          <Box p={16} style={{ background: "#17151c", border: "1px solid #2a2637" }}>
            <Text c="white" fw={700} fz={15} style={{ fontFamily: DISPLAY_FONT }}>
              Read the Library
            </Text>
            <Text fz={14} c="#b6b1bc" mt={6} mb={10} lh={1.55}>
              The War Room explains battles in plain numbers, The Charter covers forum rules, and
              the Shadow wing explains corruption and purification.
            </Text>
            <Button component={Link} to="/Library" variant="light" color="cyan" size="xs">
              Open the Library
            </Button>
          </Box>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
