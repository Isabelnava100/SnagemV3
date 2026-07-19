import {
  Anchor,
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
import { attackDamageForStar } from "../../../lib/encounterStars";
import { addBookmark, removeBookmark } from "../mutations";
import { callResolveThreadPause } from "../functionsClient";
import { hasCapability } from "../../../lib/permissions";
import { Capability } from "../../../components/types/typesUsed";
import CloseThreadModal from "../components/CloseThreadModal";
import { getForumBookmarks, getPendingActions, getPostsCount, getPostsPage, getThread } from "../queries";
import { EncounterBlock, ForumThread } from "../types";
import { pokemonData } from "../../../data/pokemon";
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
  if (thread.paused?.active) return false; // team wipe: staff decide first
  if (isAdmin(user) || userIsHost(thread, user)) return true;
  if (!thread.restricted) return true;
  const name = user.displayName ?? user.username;
  return (thread.allowedPosters ?? []).includes(name);
}

/** Pinned banner shown at the top of a thread while a boss battle is active. */
function BossBanner(props: { boss: NonNullable<ForumThread["bossBattle"]> }) {
  const { boss } = props;
  const need = boss.requiredPosts ?? 0;
  const done = Math.round(Math.min(boss.attackPosts ?? 0, need || Infinity) * 10) / 10;
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
            <Text fz={16} c="white" fw={700}>
              Boss Battle: {boss.name}
            </Text>
            <Badge color="red" variant="filled" size="sm">
              Shared boss, everyone in the thread
            </Badge>
          </Group>
          <Text fz={14} c="dimmed">
            Wild {boss.name}, the boss for this thread.
          </Text>
          <Progress value={healthPct} color="red.6" size="lg" radius="xl" striped animated />
          <Text fz={14} c="dimmed">
            {need
              ? `${remaining} of ${need} attack posts left to defeat it.`
              : "Check people's posts to wear it down."}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
}

const speciesNameBySlug = new Map(pokemonData.map((p) => [p.slug, p.name]));

/**
 * Pinned banner while a thread is paused after a solo team wipe. Everyone sees
 * why posting is blocked; staff (admin or ReviewRewards) get the resolution
 * actions: revive the team, resume with the damage kept (item recovery), or
 * close the thread as a loss (the normal close + rewards review).
 */
function PausedBanner(props: {
  forum: string;
  thread: ForumThread;
  isStaff: boolean;
  onCloseAsLoss: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState("");
  const resolveMutation = useMutation({
    mutationFn: (action: "revive" | "resume") =>
      callResolveThreadPause({ forum: props.forum, threadId: props.thread.id, action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-thread", props.forum, props.thread.id] });
    },
    onError: (e) => setError((e as Error).message || "Could not resolve the pause. Try again."),
  });

  return (
    <Box
      mt={12}
      p={12}
      style={{ background: "#2a1a1e", border: "1px solid #E54156", borderRadius: 10 }}
    >
      <Group gap={8} wrap="wrap" align="center">
        <Text fz={16} c="white" fw={700}>
          Thread paused: {props.thread.paused?.name ?? "a member"}&apos;s whole team fainted.
        </Text>
        <Badge color="pink" variant="filled" size="sm">
          Staff decision needed
        </Badge>
      </Group>
      <Text fz={14} c="dimmed" mt={4}>
        No new posts until a staff member decides: revive the team and resume, resume
        as-is so the member recovers with potions and revives, or close the thread as
        a loss (rewards are reviewed at close).
      </Text>
      {props.isStaff && (
        <Group gap={8} mt={10} wrap="wrap">
          <GradientButtonPrimary
            radius="xl"
            size="xs"
            loading={resolveMutation.isPending && resolveMutation.variables === "revive"}
            onClick={() => {
              setError("");
              resolveMutation.mutate("revive");
            }}
          >
            Revive Team & Resume
          </GradientButtonPrimary>
          <GradientButtonSecondary
            radius="xl"
            size="xs"
            variant="light"
            loading={resolveMutation.isPending && resolveMutation.variables === "resume"}
            onClick={() => {
              setError("");
              resolveMutation.mutate("resume");
            }}
          >
            Resume, Keep Damage
          </GradientButtonSecondary>
          <GradientButtonSecondary radius="xl" size="xs" variant="subtle" onClick={props.onCloseAsLoss}>
            Close as a Loss
          </GradientButtonSecondary>
        </Group>
      )}
      {error && (
        <Text fz={14} c="red.4" mt={6} role="status" aria-live="polite">
          {error}
        </Text>
      )}
    </Box>
  );
}

/**
 * Pinned checklist on mission threads that have set foes: shows every required
 * target with its beaten state so the party always knows what is left before
 * the thread can be closed for grading.
 */
function MissionTargetsBanner(props: { thread: ForumThread }) {
  const required = props.thread.requiredEncounters ?? [];
  if (!required.length) return null;
  const defeated = new Set(props.thread.defeatedEncounters ?? []);
  const remaining = required.filter((slug) => !defeated.has(slug));

  return (
    <Box
      mt={12}
      p={12}
      style={{ background: "#241f2e", border: "1px solid #4b3f63", borderRadius: 10 }}
    >
      <Group gap={8} mb={8} wrap="wrap">
        <Text fz={16} c="white" fw={700}>
          Mission targets
        </Text>
        <Badge color={remaining.length ? "gold.1" : "green"} variant="filled" size="sm">
          {remaining.length
            ? `${required.length - remaining.length}/${required.length} beaten`
            : "All beaten, ready to close"}
        </Badge>
      </Group>
      <Group gap={8} wrap="wrap">
        {required.map((slug) => {
          const done = defeated.has(slug);
          return (
            <Group
              key={slug}
              gap={6}
              wrap="nowrap"
              px={8}
              py={4}
              style={{
                borderRadius: 999,
                background: done ? "rgba(18,183,182,0.15)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${done ? "#12B7B6" : "#4b3f63"}`,
              }}
            >
              <Avatar
                src={getPokemonImageURL(slug)}
                alt=""
                size={22}
                radius="xl"
                style={done ? undefined : { filter: "grayscale(1)" }}
              />
              <Text fz={14} c={done ? "green.0" : "dimmed"} fw={600}>
                {speciesNameBySlug.get(slug) ?? slug}
                {done ? " ✓" : ""}
              </Text>
            </Group>
          );
        })}
      </Group>
      <Text fz={14} c="dimmed" mt={8}>
        Beat every target (wear its health down or catch it) before closing the thread for grading.
      </Text>
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
  // Safari encounters carry postsToDefeat (fight turns); normal encounters
  // carry required/progress. Both now have a star, so key off the field shape.
  const isSafari = enc.postsToDefeat != null;
  const postsToDefeat = Math.max(3, enc.postsToDefeat ?? 3);
  const fightPosts = enc.fightPosts ?? 0;
  const safariHealthLeft = Math.max(0, postsToDefeat - fightPosts);
  const safariHealthPct = Math.round((safariHealthLeft / postsToDefeat) * 100);
  const required = enc.required ?? 0;
  const progress = enc.progress ?? 0;
  const beaten = required > 0 && progress >= required;
  // Progress can be fractional (type effectiveness); show one decimal.
  const healthLeft = Math.round(Math.max(0, required - progress) * 10) / 10;
  const healthPct = required ? Math.round((healthLeft / required) * 100) : 100;
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
            <Text fz={16} c="white" fw={700}>
              You encountered a wild {enc.name}!
            </Text>
            <Badge color="cyan" variant="filled" size="sm">
              Your encounter, only you
            </Badge>
            {!!enc.star && (
              <Badge color="gold.0" variant="filled" size="sm">
                {"★".repeat(Math.min(7, enc.star))} {enc.star} star
              </Badge>
            )}
            {enc.shiny && (
              <Badge color="pink" variant="filled" size="sm">
                Shiny!
              </Badge>
            )}
          </Group>
          <Text fz={14} c="dimmed">
            Species: {enc.name}
            {enc.gender ? ` · ${enc.gender === "F" ? "Female" : "Male"}` : ""}
          </Text>
          {isSafari ? (
            <>
              <Progress value={safariHealthPct} color="red.6" size="lg" radius="xl" striped animated />
              <Text fz={14} c="dimmed">
                Health {safariHealthLeft}/{postsToDefeat}. Catch bonus so far +{bonus}%. Knock it out and
                it is gone, so catch it first.
              </Text>
            </>
          ) : required ? (
            <>
              <Progress
                value={healthPct}
                color="red.6"
                size="lg"
                radius="xl"
                striped={!beaten}
                animated={!beaten}
              />
              <Text fz={14} c="dimmed">
                {beaten
                  ? enc.catchable
                    ? "Beaten! Throw a ball in your next post to catch it, or roll a new encounter to move on."
                    : "Beaten! It cannot be caught; it clears with your next post."
                  : `Health ${healthLeft}/${required} posts. It hits your fighter for ${attackDamageForStar(
                      enc.star ?? 3
                    )} damage each battle post. Keep posting to wear it down${
                      enc.catchable ? ", then a ball can catch it" : ""
                    }.`}
              </Text>
            </>
          ) : (
            <Text fz={14} c="dimmed">
              {enc.catchable ? "Continue it in your next post." : "This one cannot be caught."}
            </Text>
          )}
          <Text fz={14} c="dimmed">
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

  // Staff "close as a loss" modal, opened from the paused-thread banner.
  const [lossModalOpen, setLossModalOpen] = React.useState(false);
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

  const host =
    userIsHost(thread, user) || isAdmin(user) || hasCapability(user, Capability.ManageBattles);
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
          <Text fz={14} c="white" fw={600}>
            This is a mission thread.{" "}
            <Text
              component={Link}
              to={`/Missions/${thread.missionId}`}
              fz={14}
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
          <Text fz={14} c="white" fw={600}>
            Super Training Room log. Posts here start from the{" "}
            <Text component={Link} to="/Colosseum" fz={14} fw={700} c="grape.3" td="underline">
              Colosseum Training Room
            </Text>
            , once per day, up to 10 posts inside your training window.
          </Text>
        </Box>
      )}

      <Anchor component={Link} to={`/Forum/${forum}`} fz={14} c="blue.3">
        &larr; Back to the {forum.replace(/-/g, " ")} board
      </Anchor>
      {thread.bossBattle?.active && <BossBanner boss={thread.bossBattle} />}
      {thread.paused?.active && (
        <PausedBanner
          forum={forum}
          thread={thread}
          isStaff={isAdmin(user) || hasCapability(user, Capability.ReviewRewards)}
          onCloseAsLoss={() => setLossModalOpen(true)}
        />
      )}
      {(isAdmin(user) || hasCapability(user, Capability.ReviewRewards)) && (
        <CloseThreadModal
          opened={lossModalOpen}
          onClose={() => setLossModalOpen(false)}
          forum={forum}
          thread={thread}
        />
      )}
      {!!thread.missionId && !thread.closed && <MissionTargetsBanner thread={thread} />}

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
        <Text fz={14} c="dimmed" mt={6}>
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
