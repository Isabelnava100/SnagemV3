import {
  Container,
  Flex,
  Group,
  Pagination,
  Stack,
  Text,
  Title,
} from "@mantine/core";
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
import { addBookmark, removeBookmark } from "../mutations";
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

export default function ThreadView() {
  const { forum: forumParam, id: threadId, page } = useParams();
  const forum = forumParam ?? "Main-Forum";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const queryClient = useQueryClient();

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

      <Flex justify="space-between" align="center" mt={14} gap={10} wrap="wrap">
        <Pagination
          total={lastPageNum}
          value={Math.min(currentPage, lastPageNum)}
          onChange={changePage}
          color={FORUM_ACCENT}
          size={isOverSm ? "sm" : "md"}
          withEdges
        />
        <Group gap={8} wrap="wrap">
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
              threadClosed={thread.closed}
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
          size={isOverSm ? "sm" : "md"}
          withEdges
        />
      </Flex>

      <ScrollAids postAnchorIds={anchorIds} />
    </Container>
  );
}
