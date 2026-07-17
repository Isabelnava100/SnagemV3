import {
  Avatar,
  Badge,
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
import { safariFightBonus } from "../../../lib/safari";
import { addBookmark, removeBookmark } from "../mutations";
import { getForumBookmarks, getPendingActions, getPostsCount, getPostsPage, getThread } from "../queries";
import { EncounterBlock, ForumThread } from "../types";
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
          <Group gap={8} wrap="wrap">
            <Text fz={14} c="white" fw={700}>
              Boss Battle: {boss.name}
            </Text>
            <Badge color="red" variant="light" size="sm">
              Shared boss, everyone in the thread
            </Badge>
          </Group>
          <Text fz={12} c="dimmed">
            Wild {boss.name}, the boss for this thread.
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

/**
 * Pinned banner for the reader's OWN active encounter on this thread (Safari or
 * a normal rolled encounter). Unlike the boss banner this is per-person: it
 * shows only to the player who rolled it, with the Pokemon, its species, and a
 * health/capture bar so they always know what they are chasing.
 */
function EncounterBanner(props: { encounter: EncounterBlock }) {
  const enc = props.encounter;
  const isSafari = !!enc.star;
  const postsToDefeat = Math.max(3, enc.postsToDefeat ?? 3);
  const fightPosts = enc.fightPosts ?? 0;
  const healthLeft = Math.max(0, postsToDefeat - fightPosts);
  const healthPct = Math.round((healthLeft / postsToDefeat) * 100);
  const required = enc.required ?? 0;
  const progress = enc.progress ?? 0;
  const capturePct = required ? Math.min(100, Math.round((progress / required) * 100)) : 0;
  const bonus = isSafari ? safariFightBonus(fightPosts, postsToDefeat) + (enc.catchBonus ?? 0) : 0;

  return (
    <Box
      mt={12}
      p={12}
      style={{ background: "#14252a", border: "1px solid #1f6f7a", borderRadius: 10 }}
    >
      <Group gap={12} wrap="nowrap" align="center">
        <Avatar src={getPokemonImageURL(enc.slug)} alt={`${enc.name} sprite`} size={52} radius="xl" bg="#12201f" />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} wrap="wrap">
            <Text fz={14} c="white" fw={700}>
              You encountered a wild {enc.name}!
            </Text>
            <Badge color="cyan" variant="light" size="sm">
              Your encounter, only you
            </Badge>
            {isSafari && enc.star && (
              <Badge color="yellow" variant="light" size="sm">
                {"★".repeat(enc.star)} {enc.star} star
              </Badge>
            )}
          </Group>
          <Text fz={12} c="dimmed">
            Species: {enc.name}
          </Text>
          {isSafari ? (
            <>
              <Progress value={healthPct} color="red.6" size="lg" radius="xl" striped animated />
              <Text fz={12} c="dimmed">
                Health {healthLeft}/{postsToDefeat}. Catch bonus so far +{bonus}%. Knock it out and
                it is gone, so catch it first.
              </Text>
            </>
          ) : enc.catchable && required ? (
            <>
              <Progress value={capturePct} color="cyan.0" size="lg" radius="xl" />
              <Text fz={12} c="dimmed">
                {progress >= required
                  ? "Worn down. Throw a ball in your next post to catch it."
                  : `Capture progress ${progress}/${required} posts. Keep posting to weaken it.`}
              </Text>
            </>
          ) : (
            <Text fz={12} c="dimmed">
              {enc.catchable ? "Continue it in your next post." : "This one cannot be caught."}
            </Text>
          )}
          <Text fz={11} c="dimmed">
            Pick it back up in your next post on this thread.
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

  const { data: posts, isError: postsError } = useQuery({
    queryKey: ["forum-posts", forum, threadId, currentPage, totalPosts],
    queryFn: () => getPostsPage(forum, threadId!, currentPage, POSTS_PER_PAGE, totalPosts!),
    enabled: !!threadId && typeof totalPosts === "number" && page !== "last",
  });

  // The reader's own pending encounter (bound to their next post), so the top
  // of the thread always reminds them what they are chasing. Shares the cache
  // key the composer invalidates on publish, so it updates after each post.
  const { data: pending } = useQuery({
    queryKey: ["forum-pending", forum, threadId, user?.uid],
    queryFn: () => getPendingActions(forum, threadId!, user!.uid),
    enabled: !!user && !!threadId,
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

      {pending?.encounter?.slug && <EncounterBanner encounter={pending.encounter} />}

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

        {postsError ? (
          <Text c="red.4" mt={16} role="status" aria-live="polite">
            Something went wrong loading these posts. Refresh the page to try again.
          </Text>
        ) : posts === undefined ? (
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
