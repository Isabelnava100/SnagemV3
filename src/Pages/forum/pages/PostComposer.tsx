import { Avatar, Container, Flex, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { getPokemonImageURL } from "../../../helpers";
import { getItems } from "../../../queries/dashboard";
import { queryClient } from "../../../lib/react-query";
import { callableMessage } from "../functionsClient";
import { publishPost, saveDraft } from "../mutations";
import { getDraft, getPendingActions, getPost, getThread } from "../queries";
import { DiceBlock, EncounterBlock, PostCharacter, RandomBlock } from "../types";
import CharactersPanel from "../components/composer/CharactersPanel";
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
 * Post composer — used both for a new reply (Publish Reply) and for editing an
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
  const [draftSaved, setDraftSaved] = React.useState(false);
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

  const { data: inventory } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user,
  });

  // Server-rolled results already bound to this thread (e.g. after a page
  // reload mid-compose) — they must attach to the next published post.
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
    if (!editor || loadedEdit) return;
    if (mode === "edit" && editingPost) {
      editor.commands.setContent(editingPost.text);
      setHtml(editingPost.text);
      setCharacters(editingPost.characters ?? []);
      setLoadedEdit(true);
    }
    if (mode === "new" && quotedPost) {
      editor.commands.setContent(
        `<blockquote><strong>${quotedPost.owner} wrote:</strong>${quotedPost.text}</blockquote><p></p>`
      );
      setHtml(editor.getHTML());
      setLoadedEdit(true);
    }
    if (mode === "new" && draft) {
      editor.commands.setContent(draft.long_text || "");
      setHtml(draft.long_text || "");
      setLoadedEdit(true);
    }
  }, [editor, editingPost, quotedPost, draft, mode, loadedEdit]);

  const bossActive =
    !!thread?.bossBattle?.active &&
    !(thread.bossBattle.excluded ?? []).includes(user?.displayName ?? user?.username ?? "");

  const validate = (): string => {
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
        ...(mode === "edit" ? { editPostId: postId } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts-count", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-pending", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
      navigate(`/Forum/${forum}/thread/${threadId}/last`);
    },
    onError: (err) =>
      setError(callableMessage(err, "Something went wrong publishing. Try again.")),
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      await saveDraft({
        user: user!,
        forum,
        threadId: threadId ?? "",
        title: thread?.title ?? "",
        characterNames: characters.map((c) => c.name).join(", "),
        html,
      });
    },
    onSuccess: () => setDraftSaved(true),
  });

  if (threadPending || !thread) {
    return (
      <Container size="lg" mt={20}>
        {threadPending ? <SectionLoader /> : <Text c="white">This thread does not exist.</Text>}
      </Container>
    );
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
    const problem = validate();
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
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Stack gap={16}>
            {bossActive && thread.bossBattle && (
              <ForumPanel title="Boss Battle">
                <Flex align="center" gap={10}>
                  <Avatar
                    src={getPokemonImageURL(thread.bossBattle.slug)}
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
              </ForumPanel>
            )}

            <EncounterPostPanel
              forum={forum}
              thread={thread}
              value={encounter}
              onChange={setEncounter}
              lockedEncounters={mode === "edit" ? editingPost?.blocks?.encounters ?? [] : []}
            />

            <ForumPanel title="Write Your Post">
              <Editor editor={editor} />
            </ForumPanel>

            {error && <GameResultText>{error}</GameResultText>}
            {draftSaved && (
              <Text fz={13} c="green.0">
                Draft saved — find it under Dashboard → Drafts.
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
