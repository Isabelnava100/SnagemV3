import {
  Box,
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
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../lib/auditLog";
import { canGiveRewards, hasCapability, isAdmin } from "../../../lib/permissions";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getXPDefaults } from "../../../queries/game";
import { FORUM_ACCENT, POSTS_PER_PAGE } from "../config";
import { addBookmark, closeThread, removeBookmark } from "../mutations";
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

function CloseThreadModal(props: {
  opened: boolean;
  onClose: () => void;
  forum: string;
  thread: ForumThread;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = React.useState("");

  // Per-post XP default, shown as the estimate when one is configured.
  const { data: xpDefaults } = useQuery({
    queryKey: ["xp-defaults"],
    queryFn: getXPDefaults,
    enabled: props.opened,
  });
  const perPost = xpDefaults?.experiencePerPost ?? 0;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await closeThread(
        user,
        props.forum,
        props.thread.id,
        props.thread.title,
        note.trim()
      );
      await logAuditEvent({
        action: "thread.close",
        ...actorFrom(user),
        targetPath: `forum/${props.forum}/threads/${props.thread.id}`,
        details: { title: props.thread.title, forum: props.forum },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum-thread", props.forum, props.thread.id],
      });
      queryClient.invalidateQueries({ queryKey: ["forum-threads", props.forum] });
      props.onClose();
      // Reward granters go straight to the rewards review for this thread.
      if (canGiveRewards(user)) {
        navigate(`/Forum/${props.forum}/thread/${props.thread.id}/rewards`);
      }
    },
  });

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={<Text fw={700}>Close thread</Text>}
      centered
      radius={12}
    >
      <Stack gap={12}>
        <Text fz={13} c="dimmed">
          Closing this thread archives it: no new posts can be made and existing
          posts can no longer be edited. If you roleplay finding a specific item,
          money or pokemon, let us know for review.
        </Text>
        {perPost > 0 && (
          <Box p={10} style={{ background: "#2E2D2E", borderRadius: 8 }}>
            <Text fz={13} c="white" fw={600}>
              Estimated reward
            </Text>
            <Text fz={13} c="dimmed">
              About {perPost} experience per qualifying post. An admin does the
              final review before anything is assigned, so the final amount may
              change.
            </Text>
          </Box>
        )}
        <Textarea
          label="Rewards to review (optional)"
          placeholder="Tell the reviewers about any items, money or pokemon you roleplayed finding."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autosize
          minRows={3}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <Group justify="flex-end">
          <GradientButtonSecondary radius="xl" variant="subtle" onClick={props.onClose}>
            Cancel
          </GradientButtonSecondary>
          <GradientButtonPrimary radius="xl" loading={isPending} onClick={() => mutateAsync()}>
            Close Thread
          </GradientButtonPrimary>
        </Group>
      </Stack>
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
  const [closeOpened, closeModal] = useDisclosure(false);

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
  // The thread creator plus admins/directors who can hand out rewards may close.
  const canClose = !!user && !thread.closed && (host || canGiveRewards(user));
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
          {canClose && (
            <GradientButtonSecondary radius="xl" size="xs" onClick={closeModal.open}>
              Close Thread
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
      <CloseThreadModal opened={closeOpened} onClose={closeModal.close} forum={forum} thread={thread} />
    </Container>
  );
}
