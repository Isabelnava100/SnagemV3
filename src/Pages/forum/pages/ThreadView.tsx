import {
  Avatar,
  Box,
  Container,
  Flex,
  Group,
  Pagination,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { getPokemonImageURL } from "../../../helpers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

/** Pinned banner shown at the top of a thread while a boss battle is active. */
function BossBanner(props: { boss: NonNullable<ForumThread["bossBattle"]> }) {
  const { boss } = props;
  const need = boss.requiredPosts ?? 0;
  const done = Math.min(boss.attackPosts ?? 0, need || Infinity);
  const remaining = need ? Math.max(0, need - done) : 0;
  const healthPct = need ? Math.max(0, Math.round(((need - done) / need) * 100)) : 100;

  return (
    <Box
      mt={12}
      p={12}
      style={{ background: "#3a1f22", border: "1px solid #7a2b2b", borderRadius: 10 }}
    >
      <Group gap={12} wrap="nowrap" align="center">
        <Avatar src={getPokemonImageURL(boss.slug)} alt={`${boss.name} sprite`} size={52} radius="xl" bg="#2b2a2b" />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={14} c="white" fw={700}>
            Boss Battle: {boss.name}
          </Text>
          <Progress value={healthPct} color="red.6" size="lg" radius="xl" striped animated />
          <Text fz={12} c="dimmed">
            {need
              ? `${remaining} of ${need} attack posts left to defeat it.`
              : "Check people's posts to wear it down."}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
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

      {thread.missionId && (
        <Box
          mt={12}
          p={12}
          style={{ background: "#1f2a3a", border: "1px solid #2b4a7a", borderRadius: 10 }}
        >
          <Text fz={13} c="white" fw={600}>
            This is a mission thread.{" "}
            <Text
              component={Link}
              to={`/Missions/${thread.missionId}`}
              fz={13}
              fw={700}
              c="blue.3"
              td="underline"
            >
              View the mission briefing
            </Text>{" "}
            for the objective, opposition and rewards. Closing the thread sends it to the
            admins for grading.
          </Text>
        </Box>
      )}

      {thread.trainingLog && (
        <Box
          mt={12}
          p={12}
          style={{ background: "#2a1f3a", border: "1px solid #5a3fb0", borderRadius: 10 }}
        >
          <Text fz={13} c="white" fw={600}>
            Super Training Room log. Posts here start from the{" "}
            <Text component={Link} to="/Colosseum" fz={13} fw={700} c="grape.3" td="underline">
              Colosseum Training Room
            </Text>
            , once per day, up to 10 posts inside your training window.
          </Text>
        </Box>
      )}

      {thread.bossBattle?.active && <BossBanner boss={thread.bossBattle} />}

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
              onClick={() =>
                // Training posts must start from the Colosseum Training Room so
                // the target pokemon and daily window travel with the post.
                thread.trainingLog
                  ? navigate("/Colosseum")
                  : navigate(`/Forum/${forum}/thread/${threadId}/post`)
              }
            >
              {thread.trainingLog ? "Log a Training Post" : "Make a New Post"}
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
