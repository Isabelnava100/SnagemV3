import {
  Container,
  Flex,
  Group,
  Modal,
  Pagination,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { isAdmin } from "../../../lib/permissions";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { FORUM_ACCENT, POSTS_PER_PAGE } from "../config";
import { addBookmark, removeBookmark, submitXP } from "../mutations";
import { getForumBookmarks, getPostsCount, getPostsPage, getThread } from "../queries";
import { ForumThread } from "../types";
import PollBlock from "../components/PollBlock";
import PostCard from "../components/PostCard";
import ScrollAids from "../components/ScrollAids";
import "../forum.css";

function isNumeric(n: unknown): boolean {
  return !isNaN(parseFloat(String(n))) && isFinite(Number(n));
}

export function userIsHost(thread: ForumThread | null | undefined, user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!thread || !user) return false;
  if (thread.hostUid) return thread.hostUid === user.uid;
  // Legacy threads have no hostUid. Fall back to the creator's display name.
  return thread.createdBy === (user.displayName ?? user.username);
}

export function userMayPost(thread: ForumThread | null | undefined, user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!thread || !user) return false;
  if (thread.closed) return false; // archived threads are read-only
  if (isAdmin(user) || userIsHost(thread, user)) return true;
  if (!thread.restricted) return true;
  const name = user.displayName ?? user.username;
  return (thread.allowedPosters ?? []).includes(name);
}

function SubmitXPModal(props: {
  opened: boolean;
  onClose: () => void;
  forum: string;
  thread: ForumThread;
}) {
  const { user } = useAuth();
  const [note, setNote] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await submitXP(user, props.forum, props.thread.id, props.thread.title, note);
    },
    onSuccess: () => setSent(true),
  });

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={<Text fw={700}>Submit XP</Text>}
      centered
      radius={12}
    >
      {sent ? (
        <Text fz={14}>
          Your XP submission was sent for review. An admin will process it soon.
        </Text>
      ) : (
        <Stack gap={10}>
          <Text fz={13} c="dimmed">
            Submit this thread for XP review. Tell the admins which posts/characters should
            receive experience.
          </Text>
          <Textarea
            placeholder="Notes for the reviewers (optional)"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            autosize
            minRows={3}
            styles={{ input: { background: "#2E2D2E" } }}
          />
          <Group justify="flex-end">
            <GradientButtonPrimary radius="xl" loading={isPending} onClick={() => mutateAsync()}>
              Submit XP
            </GradientButtonPrimary>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export default function ThreadView() {
  const { forum: forumParam, id: threadId, page } = useParams();
  const forum = forumParam ?? "Main-Forum";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const queryClient = useQueryClient();
  const [xpOpened, xpModal] = useDisclosure(false);

  const [currentPage, setCurrentPage] = React.useState<number>(
    isNumeric(page) ? Number(page) : 1
  );

  const { data: thread, isPending: threadPending } = useQuery({
    queryKey: ["forum-thread", forum, threadId],
    queryFn: () => getThread(forum, threadId!),
    enabled: !!threadId,
  });

  const { data: totalPosts } = useQuery({
    queryKey: ["forum-posts-count", forum, threadId],
    queryFn: () => getPostsCount(forum, threadId!),
    enabled: !!threadId,
  });

  // "last" resolves to the numeric last page once the count is known.
  React.useEffect(() => {
    if (page === "last" && typeof totalPosts === "number") {
      const lastPage = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
      setCurrentPage(lastPage);
      navigate(`/Forum/${forum}/thread/${threadId}/${lastPage}`, { replace: true });
    }
  }, [page, totalPosts, forum, threadId, navigate]);

  const { data: posts } = useQuery({
    queryKey: ["forum-posts", forum, threadId, currentPage, totalPosts],
    queryFn: () => getPostsPage(forum, threadId!, currentPage, POSTS_PER_PAGE, totalPosts!),
    enabled: !!threadId && typeof totalPosts === "number" && page !== "last",
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["forum-bookmarks", user?.uid, forum],
    queryFn: () => getForumBookmarks(user!.uid, forum),
    enabled: !!user,
  });
  const bookmarked = !!threadId && !!bookmarks?.[threadId];

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user || !thread) return;
      if (bookmarked) await removeBookmark(user, forum, thread.id);
      else await addBookmark(user, forum, thread);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-bookmarks", user?.uid, forum] });
      queryClient.invalidateQueries({ queryKey: ["get-bookmarks"] });
    },
  });

  if (threadPending) {
    return (
      <Container size="lg" mt={20}>
        <SectionLoader />
      </Container>
    );
  }
  if (!thread) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">This thread does not exist.</Text>
      </Container>
    );
  }

  const host = userIsHost(thread, user);
  const mayPost = userMayPost(thread, user);
  const lastPageNum = Math.max(1, Math.ceil((totalPosts ?? 0) / POSTS_PER_PAGE));
  const anchorIds = (posts ?? []).map((post) => `post-${post.id}`);

  const changePage = (p: number) => {
    setCurrentPage(p);
    navigate(`/Forum/${forum}/thread/${threadId}/${p}`);
  };

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <Title order={1} fz={isOverSm ? 30 : 20} c="white" fw={400}>
        {thread.title}
        {thread.closed ? " (Archived)" : ""}
      </Title>
      {user && (
        <Text fz={14} c="white" fw={600} mt={4}>
          Welcome, {user.displayName ?? user.username}!
        </Text>
      )}

      <Flex justify="space-between" align="center" mt={14} gap={10} wrap="wrap">
        <Pagination
          total={lastPageNum}
          value={Math.min(currentPage, lastPageNum)}
          onChange={changePage}
          color={FORUM_ACCENT}
          size="sm"
          withEdges
        />
        <Group gap={8} wrap="wrap">
          {user && (
            <GradientButtonSecondary radius="xl" size="xs" onClick={xpModal.open}>
              Submit XP
            </GradientButtonSecondary>
          )}
          {host && (
            <GradientButtonSecondary
              radius="xl"
              size="xs"
              onClick={() => navigate(`/Forum/${forum}/thread/${threadId}/host`)}
            >
              Open Host Menu
            </GradientButtonSecondary>
          )}
          {user && (
            <GradientButtonSecondary
              radius="xl"
              size="xs"
              loading={bookmarkMutation.isPending}
              onClick={() => bookmarkMutation.mutateAsync()}
            >
              {bookmarked ? "Delete Bookmark" : "Create Bookmark"}
            </GradientButtonSecondary>
          )}
          {mayPost && (
            <GradientButtonPrimary
              radius="xl"
              size="xs"
              onClick={() => navigate(`/Forum/${forum}/thread/${threadId}/post`)}
            >
              Make a New Post
            </GradientButtonPrimary>
          )}
        </Group>
      </Flex>

      {thread.restricted && (
        <Text fz={12} c="dimmed" mt={6}>
          The host limited who can post on this thread. Everyone can still read it.
        </Text>
      )}

      <Stack gap={0} mt={14}>
        {thread.poll?.question && (
          <PollBlock poll={thread.poll} forum={forum} threadId={thread.id} />
        )}

        {posts === undefined ? (
          <SectionLoader />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              forum={forum}
              threadId={thread.id}
              anchorId={`post-${post.id}`}
            />
          ))
        )}
      </Stack>

      <Flex justify="center" mt={16}>
        <Pagination
          total={lastPageNum}
          value={Math.min(currentPage, lastPageNum)}
          onChange={changePage}
          color={FORUM_ACCENT}
          size="sm"
          withEdges
        />
      </Flex>

      <ScrollAids postAnchorIds={anchorIds} />
      <SubmitXPModal opened={xpOpened} onClose={xpModal.close} forum={forum} thread={thread} />
    </Container>
  );
}
