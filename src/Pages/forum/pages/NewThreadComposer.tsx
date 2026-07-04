import {
  Box,
  Container,
  Divider,
  Grid,
  Group,
  MultiSelect,
  Radio,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { useAuth } from "../../../context/AuthContext";
import { isAdmin } from "../../../lib/permissions";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getUsers } from "../../../queries/admin";
import { creatableCategories } from "../config";
import { callableMessage } from "../functionsClient";
import { publishThread, saveDraft } from "../mutations";
import { getDraft } from "../queries";
import { EncounterConfig, PostCharacter, ThreadPoll } from "../types";
import CharactersPanel from "../components/composer/CharactersPanel";
import { EncounterSetupPanel } from "../components/composer/EncounterPanels";
import { PollBuilderPanel } from "../components/composer/PostActionsPanel";
import { ForumPanel, GameResultText, PanelHint } from "../components/ui";
import "../forum.css";

export default function NewThreadComposer() {
  const { forum } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();

  const categories = creatableCategories(user);
  const [categoryLink, setCategoryLink] = React.useState<string | null>(
    categories.some((c) => c.link === forum) ? (forum as string) : null
  );
  const [title, setTitle] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [restricted, setRestricted] = React.useState(false);
  const [allowedPosters, setAllowedPosters] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [instructions, setInstructions] = React.useState("");
  const [characters, setCharacters] = React.useState<PostCharacter[]>([]);
  const [encounterConfig, setEncounterConfig] = React.useState<EncounterConfig | null>(null);
  const [poll, setPoll] = React.useState<ThreadPoll | null>(null);
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState("");
  const [draftSaved, setDraftSaved] = React.useState(false);

  const editor = useRichTextEditor({
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
  });

  // Continue a saved draft from Dashboard → Drafts (?draft=<id>).
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const [draftLoaded, setDraftLoaded] = React.useState(false);
  const { data: draft } = useQuery({
    queryKey: ["forum-draft", user?.uid, draftId],
    queryFn: () => getDraft(user!.uid, draftId!),
    enabled: !!user && !!draftId,
  });
  React.useEffect(() => {
    if (!editor || !draft || draftLoaded) return;
    if (draft.title_thread) setTitle(draft.title_thread);
    editor.commands.setContent(draft.long_text || "");
    setHtml(draft.long_text || "");
    setDraftLoaded(true);
  }, [editor, draft, draftLoaded]);

  const { data: allUsers } = useQuery({
    queryKey: ["forum-all-users"],
    queryFn: getUsers,
    enabled: restricted,
  });

  const validate = (): string => {
    if (!title.trim() || title.trim().length < 2) return "Give your thread a title.";
    if (!categoryLink) return "Pick a category for your thread.";
    if (html.replace(/<[^>]*>/g, "").trim().length < 2) return "Write your first post.";
    if (encounterConfig && !encounterConfig.listId)
      return "Pick an encounter list, or turn encounters off.";
    if (poll && (!poll.question.trim() || poll.options.some((o) => !o.text.trim())))
      return "Complete the poll question and every option, or remove them.";
    return "";
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const threadId = await publishThread({
        forum: categoryLink!,
        title: title.trim(),
        instructions,
        tags,
        pinned: isAdmin(user) && pinned,
        restricted,
        allowedPosters: restricted ? allowedPosters : [],
        poll,
        encounterConfig,
        characters,
        html,
      });
      return threadId;
    },
    onSuccess: (threadId) => navigate(`/Forum/${categoryLink}/thread/${threadId}`),
    onError: (err) =>
      setError(callableMessage(err, "Something went wrong publishing your thread. Try again.")),
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      await saveDraft({
        user: user!,
        forum: categoryLink ?? "Main-Forum",
        threadId: "new-thread",
        title: title.trim() || "Untitled thread",
        characterNames: characters.map((c) => c.name).join(", "),
        html,
      });
    },
    onSuccess: () => setDraftSaved(true),
  });

  const handlePublish = () => {
    const problem = validate();
    setError(problem);
    if (!problem) publishMutation.mutateAsync();
  };

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <Title order={1} fz={isOverSm ? 30 : 20} c="white" fw={400} mb={16}>
        Make a New Thread
      </Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Stack gap={16}>
            <CharactersPanel value={characters} onChange={setCharacters} />

            <ForumPanel title="Forum Details">
              <Stack gap={12}>
                <TextInput
                  label="Title"
                  placeholder="Title of your thread"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  required
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />

                <Box>
                  <PanelHint>Select where your thread will be located.</PanelHint>
                  {isAdmin(user) && (
                    <Radio.Group
                      value={pinned ? "pin" : "nopin"}
                      onChange={(v) => setPinned(v === "pin")}
                      mb={8}
                    >
                      <Group gap={16}>
                        <Radio value="nopin" label="Do Not Pin" color="pink.0" size="xs" />
                        <Radio
                          value="pin"
                          label="Fixed Pinned Thread to the Top"
                          color="pink.0"
                          size="xs"
                        />
                      </Group>
                    </Radio.Group>
                  )}
                  <Select
                    placeholder="Location or Category for the Thread"
                    data={categories.map((c) => ({ value: c.link, label: c.label }))}
                    value={categoryLink}
                    onChange={setCategoryLink}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Box>

                <Divider color="#4a464a" />

                <Box>
                  <Text fz={12} fw={700} c="white" tt="uppercase">
                    Restrictions
                  </Text>
                  <PanelHint>
                    Select who can post on this thread aside from the host, this may be changed
                    later. This will not limit who can view the thread.
                  </PanelHint>
                  <Radio.Group
                    value={restricted ? "limit" : "anyone"}
                    onChange={(v) => setRestricted(v === "limit")}
                  >
                    <Group gap={16}>
                      <Radio value="anyone" label="Allow Anyone" color="pink.0" size="xs" />
                      <Radio value="limit" label="Limit Who Can Post" color="pink.0" size="xs" />
                    </Group>
                  </Radio.Group>
                  {restricted && (
                    <MultiSelect
                      mt={8}
                      placeholder="Search for users who can post"
                      searchable
                      data={(allUsers ?? [])
                        .map((u) => u.username)
                        .filter(Boolean)
                        .map((username) => ({ value: username, label: username }))}
                      value={allowedPosters}
                      onChange={setAllowedPosters}
                      styles={{ input: { background: "#2E2D2E" } }}
                    />
                  )}
                </Box>

                <Divider color="#4a464a" />

                <Box>
                  <Text fz={12} fw={700} c="white" tt="uppercase">
                    Tags
                  </Text>
                  <PanelHint>
                    Add additional words to make the thread easier to find via search.
                  </PanelHint>
                  <TagsInput
                    placeholder="Type a tag and press Enter"
                    value={tags}
                    onChange={setTags}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Box>

                <Divider color="#4a464a" />

                <TextInput
                  label="Instructions"
                  placeholder="Optional instructions for participants"
                  value={instructions}
                  onChange={(e) => setInstructions(e.currentTarget.value)}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
              </Stack>
            </ForumPanel>

            <PollBuilderPanel value={poll} onChange={setPoll} />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Stack gap={16}>
            <EncounterSetupPanel value={encounterConfig} onChange={setEncounterConfig} />

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
              <GradientButtonSecondary
                radius="xl"
                loading={draftMutation.isPending}
                onClick={() => draftMutation.mutateAsync()}
              >
                Save Your Draft
              </GradientButtonSecondary>
              <GradientButtonPrimary
                radius="xl"
                loading={publishMutation.isPending}
                onClick={handlePublish}
              >
                Publish Post
              </GradientButtonPrimary>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
