import {
  Alert,
  Avatar,
  Box,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import React from "react";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { pokemonData } from "../../../data/pokemon";
import { getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../../helpers";
import { battleStage } from "../../../lib/battleStage";
import {
  StarterCharacter,
  StarterPick,
  getStarterRequest,
  saveStarterDraft,
  submitStarterRequest,
} from "../../../queries/starter";

/**
 * Valid starters: a base form that can still evolve and is not legendary. That
 * is exactly the "stage1" battle stage, so we reuse that classifier rather than
 * re-deriving the evolution rule here.
 */
const STARTER_OPTIONS = pokemonData
  .filter((p) => battleStage(Number(p.idx)) === "stage1")
  .map((p) => ({ value: p.slug, label: p.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

const pokemonBySlug = new Map(pokemonData.map((p) => [p.slug, p]));

export default function StarterOnboarding() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();

  const { data: request, isPending } = useQuery({
    queryKey: ["starter-request", uid],
    queryFn: () => getStarterRequest(uid as string),
    enabled: !!uid,
  });

  const [name, setName] = React.useState("");
  const [pronouns, setPronouns] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [slug, setSlug] = React.useState<string | null>(null);
  const [gender, setGender] = React.useState<"M" | "F">("M");
  const [note, setNote] = React.useState("");
  const [seeded, setSeeded] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (isPending || seeded) return;
    if (request) {
      setName(request.character?.name ?? "");
      setPronouns(request.character?.pronouns ?? "");
      setDescription(request.character?.short_description ?? "");
      setSlug(request.starter?.slug ?? null);
      setGender(request.starter?.gender ?? "M");
      setNote(request.note ?? "");
    }
    setSeeded(true);
  }, [request, isPending, seeded]);

  const status = request?.status ?? "draft";
  const locked = status === "pending" || status === "granted";

  const buildCharacter = (): StarterCharacter => ({
    name: name.trim(),
    pronouns: pronouns.trim(),
    short_description: description.trim(),
  });

  const buildStarter = (): StarterPick | null => {
    if (!slug) return null;
    const p = pokemonBySlug.get(slug);
    if (!p) return null;
    return { slug: p.slug, species: p.name, pokedex: String(Number(p.idx)), gender };
  };

  const saveDraft = useMutation({
    mutationFn: () => saveStarterDraft(uid as string, buildCharacter(), buildStarter()),
    onSuccess: () => {
      setMessage("Draft saved.");
      queryClient.invalidateQueries({ queryKey: ["starter-request", uid] });
    },
  });

  const submit = useMutation({
    mutationFn: () => {
      const starter = buildStarter();
      if (!starter) throw new Error("Pick a starter Pokemon first.");
      return submitStarterRequest(uid as string, buildCharacter(), starter, note);
    },
    onSuccess: () => {
      setMessage("Submitted for review. A staff member will approve it soon.");
      queryClient.invalidateQueries({ queryKey: ["starter-request", uid] });
    },
    onError: (e) => setMessage((e as Error).message || "Could not submit."),
  });

  if (isPending || !seeded) return <SectionLoader />;

  const canSubmit = !!name.trim() && !!slug;

  return (
    <Box maw={640} mx="auto" p={{ base: 16, sm: 24 }}>
      <Stack gap={16}>
        <Stack gap={4}>
          <Title order={1} c="white" size={28} fw={600}>
            Create your trainer and choose a starter
          </Title>
          <Text fz={14} c="dimmed">
            Welcome to Team Snagem! Make your first character and pick a starter Pokemon, then send
            it for a quick staff review. Your starter is a stage 1 Pokemon that can still evolve.
          </Text>
        </Stack>

        {status === "pending" && (
          <Alert color="yellow" title="Waiting for approval">
            Your starter is in for review. Once a staff member approves it, your character and
            Pokemon are added to your account.
          </Alert>
        )}
        {status === "rejected" && request?.reviewerNote && (
          <Alert color="red" title="A change is needed">
            {request.reviewerNote}
          </Alert>
        )}
        {status === "granted" && (
          <Alert color="green" title="Starter approved" icon={<IconCheck size={18} />}>
            Your character and starter are ready. Head to your dashboard to see them.
          </Alert>
        )}

        {locked ? (
          <StarterPreview
            name={request?.character?.name ?? ""}
            pronouns={request?.character?.pronouns}
            description={request?.character?.short_description}
            starter={request?.starter ?? null}
          />
        ) : (
          <>
            <Paper p={16} radius={12} style={{ background: "#1E1D2080" }}>
              <Stack gap={12}>
                <Text c="white" fw={600}>
                  Your character
                </Text>
                <TextInput
                  required
                  label="Character name"
                  placeholder="What is your trainer called?"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  maxLength={60}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
                <TextInput
                  label="Pronouns (optional)"
                  placeholder="they/them, she/her, he/him"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.currentTarget.value)}
                  maxLength={40}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
                <Textarea
                  label="Short description (optional)"
                  placeholder="A sentence or two about your trainer"
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  maxLength={500}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
              </Stack>
            </Paper>

            <Paper p={16} radius={12} style={{ background: "#1E1D2080" }}>
              <Stack gap={12}>
                <Text c="white" fw={600}>
                  Your starter Pokemon
                </Text>
                <Group align="flex-end" gap={10} wrap="wrap">
                  <Select
                    label="Starter"
                    placeholder="Search Pokemon"
                    searchable
                    limit={50}
                    data={STARTER_OPTIONS}
                    value={slug}
                    onChange={setSlug}
                    w={220}
                    leftSection={
                      slug ? (
                        <Avatar
                          src={getPokemonImageURL(slug)}
                          alt=""
                          size={22}
                          imageProps={{ style: { imageRendering: "pixelated" } }}
                        />
                      ) : undefined
                    }
                    styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                  />
                  <Select
                    label="Gender"
                    data={[
                      { value: "M", label: "Male" },
                      { value: "F", label: "Female" },
                    ]}
                    value={gender}
                    onChange={(v) => setGender((v as "M" | "F") ?? "M")}
                    w={110}
                    styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                  />
                </Group>
                <Text fz={12} c="dimmed">
                  Only stage 1 Pokemon that can still evolve are shown. Legendaries and
                  fully-evolved Pokemon are not eligible as a starter.
                </Text>
              </Stack>
            </Paper>

            <Textarea
              label="Note for the reviewer (optional)"
              placeholder="Anything the staff should know"
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              autosize
              minRows={2}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />

            {message && (
              <Text
                fz={13}
                role="status"
                aria-live="polite"
                c={message.startsWith("Could not") || message.startsWith("Pick") ? "#E35C65" : "green.0"}
              >
                {message}
              </Text>
            )}

            <Group gap={10} wrap="wrap">
              <GradientButtonPrimary
                radius="xl"
                disabled={!canSubmit}
                loading={submit.isPending}
                onClick={() => submit.mutateAsync().catch(() => undefined)}
              >
                Submit for review
              </GradientButtonPrimary>
              <GradientButtonSecondary
                radius="xl"
                loading={saveDraft.isPending}
                onClick={() => saveDraft.mutateAsync()}
              >
                Save draft
              </GradientButtonSecondary>
            </Group>
          </>
        )}
      </Stack>
    </Box>
  );
}

function StarterPreview(props: {
  name: string;
  pronouns?: string;
  description?: string;
  starter: StarterPick | null;
}) {
  const { name, pronouns, description, starter } = props;
  return (
    <Paper p={16} radius={12} style={{ background: "#1E1D2080" }}>
      <Stack gap={10}>
        <Text c="white" fw={600}>
          Your submission
        </Text>
        <Text fz={13} c="white">
          Character: {name}
          {pronouns ? ` (${pronouns})` : ""}
        </Text>
        {description && (
          <Text fz={13} c="dimmed">
            {description}
          </Text>
        )}
        {starter && (
          <Group gap={8} wrap="nowrap">
            <Avatar
              src={getPokemonImageURL(starter.slug)}
              alt={starter.species}
              size={28}
              imageProps={{ style: { imageRendering: "pixelated" } }}
            >
              <img src={POKEMON_SPRITE_FALLBACK} alt="" width={20} height={20} />
            </Avatar>
            <Text fz={13} c="white">
              {starter.species} · {starter.gender}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
