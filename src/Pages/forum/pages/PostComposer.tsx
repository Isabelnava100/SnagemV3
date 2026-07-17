import { Avatar, Checkbox, Container, Flex, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { getPokemonImageURL } from "../../../helpers";
import { getItems, getOwnedPokemons, getTeamsRaw } from "../../../queries/dashboard";
import { OwnedPokemon } from "../../../components/types/typesUsed";
import {
  getTrainingSession,
  logTrainingPost,
  MAX_TRAINING_POSTS,
} from "../../../queries/colosseum";
import { queryClient } from "../../../lib/react-query";
import { callableMessage } from "../functionsClient";
import {
  DRAFT_WARNING_AT,
  MAX_DRAFTS,
  deleteDraft,
  publishPost,
  saveDraft,
} from "../mutations";
import { getDraft, getPendingActions, getPost, getThread } from "../queries";
import { DiceBlock, EncounterBlock, PostCharacter, RandomBlock } from "../types";
import CharactersPanel from "../components/composer/CharactersPanel";
import EvolutionPanel from "../components/composer/EvolutionPanel";
import { EncounterPostPanel } from "../components/composer/EncounterPanels";
import UseItemsPanel, {
  ItemSelection,
  UsedItemsPanel,
} from "../components/composer/ItemsPanel";
import { PostActionsPanel } from "../components/composer/PostActionsPanel";
import { ForumPanel, GameResultText, PanelHint } from "../components/ui";
import { userMayPost } from "./ThreadView";
import "../forum.css";

/**
 * Post composer, used both for a new reply (Publish Reply) and for editing an
 * existing post (Publish Edits). Core rule from the board: once an item,
 * encounter or action has been submitted it cannot be edited or changed;
 * before submitting everything can be added, edited or removed freely.
 * Rolls/encounters come from the server and bind to this thread until
 * published; publishing itself runs through a Cloud Function transaction.
 */
export default function PostComposer(props: { mode: "new" | "edit" }) {
  const { mode } = props;
  const { forum: forumParam, id: threadId, postId } = useParams();
  const forum = forumParam ?? "Main-Forum";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [characters, setCharacters] = React.useState<PostCharacter[]>([]);
  const [encounter, setEncounter] = React.useState<EncounterBlock | null>(null);
  const [itemSelections, setItemSelections] = React.useState<ItemSelection[]>([]);
  const [dice, setDice] = React.useState<DiceBlock | null>(null);
  const [random, setRandom] = React.useState<RandomBlock | null>(null);
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState("");
  const [draftMessage, setDraftMessage] = React.useState("");
  const [attachSignature, setAttachSignature] = React.useState(true);
  const [attackBoss, setAttackBoss] = React.useState(false);
  const [safariAction, setSafariAction] = React.useState<"fight" | "berry" | "ball">("fight");
  const [evolve, setEvolve] = React.useState<{ pokemonId: string; toIdx: number } | null>(null);
  const [loadedEdit, setLoadedEdit] = React.useState(false);

  const editor = useRichTextEditor({
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
  });

  const { data: thread, isPending: threadPending } = useQuery({
    queryKey: ["forum-thread", forum, threadId],
    queryFn: () => getThread(forum, threadId!),
    enabled: !!threadId,
  });

  const { data: editingPost } = useQuery({
    queryKey: ["forum-post", forum, threadId, postId],
    queryFn: () => getPost(forum, threadId!, postId!),
    enabled: mode === "edit" && !!postId,
  });

  const quoteId = searchParams.get("quote");
  const { data: quotedPost } = useQuery({
    queryKey: ["forum-post", forum, threadId, quoteId],
    queryFn: () => getPost(forum, threadId!, quoteId!),
    enabled: mode === "new" && !!quoteId,
  });

  const draftId = searchParams.get("draft");
  const { data: draft } = useQuery({
    queryKey: ["forum-draft", user?.uid, draftId],
    queryFn: () => getDraft(user!.uid, draftId!),
    enabled: mode === "new" && !!user && !!draftId,
  });

  // Training-post mode: arriving from the Colosseum Training Room carries the
  // target pokemon id. Publishing also logs the post against the member's
  // daily training window (max 10 posts).
  const trainingTargetId = searchParams.get("training");
  const trainingPartner = searchParams.get("partner") === "1";
  const trainingActive = mode === "new" && !!thread?.trainingLog && !!trainingTargetId;

  const { data: trainingSession } = useQuery({
    queryKey: ["training-session", user?.uid],
    queryFn: () => getTrainingSession(user!.uid),
    enabled: trainingActive && !!user,
  });
  const { data: ownedForTraining } = useQuery({
    queryKey: ["owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const { data: teamsRaw } = useQuery({
    queryKey: ["teams-raw", user?.uid],
    queryFn: () => getTeamsRaw(user!.uid),
    enabled: !!user,
  });
  const trainingTarget = (ownedForTraining?.sortedData ?? []).find(
    (p) => p.id === trainingTargetId
  );

  // The owned pokemon on the teams brought into this post (for evolve-on-post).
  const evoTeamPokemon = React.useMemo<OwnedPokemon[]>(() => {
    if (!ownedForTraining || !teamsRaw) return [];
    const byId = new Map(ownedForTraining.sortedData.map((p) => [p.id, p]));
    const teamById = new Map(teamsRaw.map((t) => [t.id, t]));
    const ids = new Set<string>();
    characters.forEach((c) => {
      if (!c.teamId) return;
      (teamById.get(c.teamId)?.pokemon_ids ?? []).forEach((id) => ids.add(id));
    });
    return [...ids].map((id) => byId.get(id)).filter(Boolean) as OwnedPokemon[];
  }, [ownedForTraining, teamsRaw, characters]);
  const trainingToday = new Date().toISOString().slice(0, 10);
  const trainingPostsLogged =
    trainingSession?.date === trainingToday ? trainingSession?.postsLogged ?? 0 : 0;
  const trainingAtCap = trainingActive && trainingPostsLogged >= MAX_TRAINING_POSTS;
  const trainingOnLastPost = trainingActive && trainingPostsLogged === MAX_TRAINING_POSTS - 1;

  const { data: inventory } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user,
  });

  // Server-rolled results already bound to this thread (e.g. after a page
  // reload mid-compose), they must attach to the next published post.
  const { data: pending } = useQuery({
    queryKey: ["forum-pending", forum, threadId, user?.uid],
    queryFn: () => getPendingActions(forum, threadId!, user!.uid),
    enabled: !!user && !!threadId,
  });
  React.useEffect(() => {
    if (!pending) return;
    if (pending.dice) setDice(pending.dice);
    if (pending.random) setRandom(pending.random);
    if (pending.encounter) setEncounter(pending.encounter);
  }, [pending]);

  // Preload content when editing; prepend the quote when quoting.
  React.useEffect(() => {
    if (!editor || editor.isDestroyed || loadedEdit) return;
    // Tiptap 3 can throw parsing legacy/malformed stored HTML, so guard every
    // setContent so a bad draft/post can't crash the composer.
    const load = (content: string): boolean => {
      try {
        editor.commands.setContent(content);
        setHtml(editor.getHTML());
        return true;
      } catch {
        editor.commands.clearContent();
        setHtml("");
        return true;
      }
    };
    if (mode === "edit" && editingPost) {
      load(editingPost.text);
      setCharacters(editingPost.characters ?? []);
      setLoadedEdit(true);
    }
    if (mode === "new" && quotedPost) {
      load(
        `<blockquote><strong>${quotedPost.owner} wrote:</strong>${quotedPost.text}</blockquote><p></p>`
      );
      setLoadedEdit(true);
    }
    if (mode === "new" && draft) {
      load(draft.long_text || "");
      setLoadedEdit(true);
    }
    if (mode === "new" && !quoteId && !draftId && trainingActive && trainingTarget) {
      const label =
        trainingTarget.name && trainingTarget.name !== trainingTarget.species
          ? `${trainingTarget.name} (${trainingTarget.species})`
          : trainingTarget.species || trainingTarget.name;
      load(
        `<p><em>Super Training Room session: training ${label}, ${
          trainingPartner ? "partner" : "solo"
        } window.</em></p><p></p>`
      );
      setLoadedEdit(true);
    }
  }, [
    editor,
    editingPost,
    quotedPost,
    draft,
    mode,
    loadedEdit,
    quoteId,
    draftId,
    trainingActive,
    trainingTarget,
    trainingPartner,
  ]);

  const bossActive =
    !!thread?.bossBattle?.active &&
    !(thread.bossBattle.excluded ?? []).includes(user?.displayName ?? user?.username ?? "");

  const validate = (): string => {
    // Character + team are required on new posts (edit mode locks them, and
    // legacy posts may predate teams, so don't block edits).
    if (mode === "new") {
      if (!characters.length) return "Select at least one character.";
      if (characters.some((c) => !c.teamId)) return "Select a team for each character.";
    }
    if (html.replace(/<[^>]*>/g, "").trim().length < 2) return "Write your post first.";
    for (const selection of itemSelections) {
      const item = (inventory ?? []).find((i) => i.id === selection.itemId);
      if (item && selection.qty > item.quantity)
        return `You only have ${item.quantity}x ${item.name}.`;
    }
    return "";
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      // Log the training post first so the daily window and 10-post cap are
      // enforced before anything is published to the thread.
      if (trainingActive && trainingTargetId) {
        await logTrainingPost(trainingTargetId, trainingPartner);
      }
      await publishPost({
        forum,
        threadId: threadId!,
        characters,
        html,
        items: itemSelections
          .filter((s) => s.qty > 0)
          .map((s) => ({
            itemId: s.itemId,
            qty: s.qty,
            ...(s.note.trim() ? { note: s.note.trim() } : {}),
          })),
        attachSignature,
        ...(mode === "new" && attackBoss ? { attackBoss: true } : {}),
        ...(mode === "new" && thread?.safariContest && encounter ? { safariAction } : {}),
        ...(mode === "new" && evolve ? { evolve } : {}),
        ...(mode === "edit" ? { editPostId: postId } : {}),
      });
    },
    onSuccess: async () => {
      if (draftId && user) await deleteDraft(user.uid, draftId);
      if (trainingActive) {
        queryClient.invalidateQueries({ queryKey: ["training-session", user?.uid] });
      }
      // Evolution / XP / shadow changes owned pokemon; refresh the cache.
      queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts-count", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-pending", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["get-drafts", user?.uid] });
      navigate(`/Forum/${forum}/thread/${threadId}/last`);
    },
    onError: (err) =>
      setError(callableMessage(err, "Something went wrong publishing. Try again.")),
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      return saveDraft({
        user: user!,
        forum,
        threadId: threadId ?? "",
        title: thread?.title ?? "",
        characterNames: characters.map((c) => c.name).join(", "),
        html,
      });
    },
    onSuccess: (count) =>
      setDraftMessage(
        count >= DRAFT_WARNING_AT
          ? `Draft saved. Heads up, you have ${count}/${MAX_DRAFTS} drafts. You'll run out soon.`
          : "Draft saved. Find it under Dashboard → Drafts."
      ),
    onError: (err) => setDraftMessage((err as Error).message || "Could not save the draft."),
  });

  if (threadPending || !thread) {
    return (
      <Container size="lg" mt={20}>
        {threadPending ? <SectionLoader /> : <Text c="white">This thread does not exist.</Text>}
      </Container>
    );
  }

  // Training posts must start from the Colosseum Training Room page so the
  // target and daily window travel with them; direct replies bounce there.
  if (mode === "new" && thread.trainingLog && !trainingTargetId) {
    return <Navigate to="/Colosseum" replace />;
  }

  if (mode === "new" && !userMayPost(thread, user)) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">
          {thread.closed
            ? "This thread is archived and read-only."
            : "The host limited who can post on this thread."}
        </Text>
      </Container>
    );
  }

  if (mode === "edit" && editingPost && editingPost.ownerUid !== user?.uid) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">Only the author of a post can edit it.</Text>
      </Container>
    );
  }

  const handlePublish = () => {
    const problem = trainingAtCap
      ? `You reached the ${MAX_TRAINING_POSTS}-post limit for this training window.`
      : validate();
    setError(problem);
    if (!problem) publishMutation.mutateAsync();
  };

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <Title order={1} fz={{ base: 20, sm: 30 }} c="white" fw={400} mb={16}>
        Make a Post on {thread.title}
      </Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Stack gap={16}>
            <CharactersPanel
              value={characters}
              onChange={setCharacters}
              locked={mode === "edit"}
              hint="Choose the characters you want to include in this post to make it clearer for everyone. Doing so will issue your character and team experience."
            />
            {mode === "edit" && (
              <UsedItemsPanel items={editingPost?.blocks?.itemsUsed ?? []} />
            )}
            <UseItemsPanel
              value={itemSelections}
              onChange={setItemSelections}
              ballsBlocked={bossActive}
            />
            <PostActionsPanel
              forum={forum}
              threadId={threadId!}
              dice={dice}
              onDice={setDice}
              random={random}
              onRandom={setRandom}
              lockedDice={mode === "edit" ? editingPost?.blocks?.dice ?? [] : []}
              lockedRandoms={mode === "edit" ? editingPost?.blocks?.randoms ?? [] : []}
            />
            {mode === "new" && (
              <EvolutionPanel
                teamPokemon={evoTeamPokemon}
                items={inventory ?? []}
                value={evolve}
                onChange={setEvolve}
              />
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Stack gap={16}>
            {trainingActive && (
              <ForumPanel title="Training Post">
                <Stack gap={10}>
                  <Text fz={14} c="orange.3" fw={600} role="status" aria-live="polite">
                    You are logging a training post. The whole training session needs to be
                    written out and posted within this post.
                  </Text>
                  {trainingTarget && (
                    <Flex align="center" gap={10}>
                      <Avatar
                        src={getPokemonImageURL(trainingTarget.image_slug)}
                        alt={`${trainingTarget.name || trainingTarget.species} sprite`}
                        size={48}
                        radius="xl"
                      />
                      <Stack gap={2}>
                        <Text fz={14} c="white" fw={600}>
                          Training target: {trainingTarget.name || trainingTarget.species}
                          {trainingTarget.name && trainingTarget.name !== trainingTarget.species
                            ? ` (${trainingTarget.species})`
                            : ""}
                        </Text>
                        <PanelHint>
                          This post counts only toward this target. {trainingPartner ? "Partner" : "Solo"}{" "}
                          window: {trainingPartner ? "4 hours" : "2 hours"}, once per day.
                        </PanelHint>
                      </Stack>
                    </Flex>
                  )}
                  <PanelHint>
                    You may keep posting inside your window, up to {MAX_TRAINING_POSTS} posts.
                    This will be post {Math.min(trainingPostsLogged + 1, MAX_TRAINING_POSTS)} of{" "}
                    {MAX_TRAINING_POSTS}.
                  </PanelHint>
                  {trainingOnLastPost && (
                    <Text fz={13} c="orange.4" fw={600} role="status" aria-live="polite">
                      Heads up: this is going to be your last post of the{" "}
                      {trainingPartner ? "4-hour" : "2-hour"} limit.
                    </Text>
                  )}
                  {trainingAtCap && (
                    <Text fz={13} c="red.4" fw={600} role="status" aria-live="polite">
                      You reached the {MAX_TRAINING_POSTS}-post limit for this training window.
                      Come back tomorrow for a new session.
                    </Text>
                  )}
                </Stack>
              </ForumPanel>
            )}

            {bossActive && thread.bossBattle && (
              <ForumPanel title="Boss Battle">
                <Flex align="center" gap={10}>
                  <Avatar
                    src={getPokemonImageURL(thread.bossBattle.slug)}
                    alt={`${thread.bossBattle.name} sprite`}
                    size={48}
                    radius="xl"
                  />
                  <Stack gap={2}>
                    <GameResultText>
                      It&apos;s a Boss Battle! A boss encounter will be attached to this post...
                      it&apos;s a {thread.bossBattle.name}!
                    </GameResultText>
                    <PanelHint>Balls cannot be used while the boss battle is active.</PanelHint>
                  </Stack>
                </Flex>
                {mode === "new" && (
                  <Checkbox
                    mt={10}
                    label="Attack the boss with this post"
                    color="green.0"
                    checked={attackBoss}
                    onChange={(e) => setAttackBoss(e.currentTarget.checked)}
                    styles={{ label: { color: "white", fontSize: 14 } }}
                  />
                )}
                {mode === "new" && (
                  <PanelHint>
                    {(() => {
                      const b = thread.bossBattle;
                      const done = b.attackPosts ?? 0;
                      const need = b.requiredPosts ?? 0;
                      return need
                        ? `The boss takes ${need} attack posts to defeat. Progress: ${done}/${need}.`
                        : "Check this to add your attack toward defeating the boss.";
                    })()}
                  </PanelHint>
                )}
              </ForumPanel>
            )}

            <EncounterPostPanel
              forum={forum}
              thread={thread}
              value={encounter}
              onChange={setEncounter}
              lockedEncounters={mode === "edit" ? editingPost?.blocks?.encounters ?? [] : []}
              safariAction={safariAction}
              onSafariAction={setSafariAction}
            />

            <ForumPanel title="Write Your Post">
              <Editor editor={editor} />
            </ForumPanel>

            {mode === "new" && (
              <Checkbox
                label="Attach Signature"
                color="green.0"
                checked={attachSignature}
                onChange={(e) => setAttachSignature(e.currentTarget.checked)}
                styles={{ label: { color: "white", fontSize: 13 } }}
              />
            )}

            {error && <GameResultText>{error}</GameResultText>}
            {draftMessage && (
              <Text fz={13} c="green.0">
                {draftMessage}
              </Text>
            )}

            <Group justify="space-between">
              {mode === "new" ? (
                <GradientButtonSecondary
                  radius="xl"
                  loading={draftMutation.isPending}
                  onClick={() => draftMutation.mutateAsync()}
                >
                  Save Post Draft
                </GradientButtonSecondary>
              ) : (
                <span />
              )}
              <GradientButtonPrimary
                radius="xl"
                loading={publishMutation.isPending}
                onClick={handlePublish}
              >
                {mode === "edit" ? "Publish Edits" : "Publish Reply"}
              </GradientButtonPrimary>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
