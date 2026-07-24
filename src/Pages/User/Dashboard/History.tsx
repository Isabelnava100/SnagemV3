import { Badge, Box, Flex, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link } from "react-router-dom";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { categoryByLink } from "../../forum/config";
import {
  MY_POSTS_LIMIT,
  MyPostItem,
  MyThreadItem,
  getMyPosts,
  getMyThreads,
} from "../../../queries/history";

/**
 * Dashboard History tab: the member's own forum activity, split into the
 * threads they started and their latest posts. Private by construction: the
 * queries filter to the signed-in uid and the Firestore rules only allow
 * reading your own documents through the collection-group path.
 */

const displayFont = "var(--font-display, 'Quantico', sans-serif)";
const monoFont = "ui-monospace, Menlo, monospace";

/** Short uppercase date for the cyan mono column, e.g. "JUL 18". */
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const formatShortDate = (ts?: { seconds: number }) =>
  ts?.seconds
    ? shortDateFormatter.format(new Date(ts.seconds * 1000)).replace(".", "").toUpperCase()
    : "";

const forumLabel = (link: string) => categoryByLink(link)?.label ?? link;

function RowShell(props: { to: string; children: React.ReactNode }) {
  return (
    <Box
      component={Link}
      to={props.to}
      className="dc-row-hover"
      px={4}
      py={{ base: 13, sm: 16 }}
      style={{
        display: "block",
        borderTop: "1px solid #2a2637",
        textDecoration: "none",
      }}
    >
      {props.children}
    </Box>
  );
}

/** Cyan mono date cell used by both row layouts. */
function DateCell(props: { ts?: { seconds: number }; fz: number }) {
  return (
    <Text component="span" fz={props.fz} c="#12B7B6" style={{ fontFamily: monoFont, flexShrink: 0 }}>
      {formatShortDate(props.ts)}
    </Text>
  );
}

/** Gold Quantico forum cell. */
function ForumCell(props: { forum: string; fz: number }) {
  return (
    <Text
      component="span"
      fz={props.fz}
      fw={700}
      c="#FFD074"
      tt="uppercase"
      lineClamp={1}
      style={{ fontFamily: displayFont, letterSpacing: "0.06em" }}
    >
      {forumLabel(props.forum)}
    </Text>
  );
}

function ThreadBadges({ thread }: { thread: MyThreadItem }) {
  return (
    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
      {thread.missionId && (
        <Badge size="sm" variant="light" color="blue">
          Mission
        </Badge>
      )}
      {thread.trainingLog && (
        <Badge size="sm" variant="light" color="grape">
          Training
        </Badge>
      )}
      <Badge size="sm" variant="light" color={thread.closed ? "gray" : "teal"}>
        {thread.closed ? "Closed" : "Open"}
      </Badge>
    </Group>
  );
}

function ThreadRow({ thread, wide }: { thread: MyThreadItem; wide: boolean }) {
  const meta = typeof thread.replyCount === "number" ? `${thread.replyCount} replies` : "";
  if (!wide) {
    // Phone: stacked rows (date + replies, forum, title, badges).
    return (
      <RowShell to={`/Forum/${thread.forum}/thread/${thread.id}`}>
        <Stack gap={4}>
          <Group gap={10} justify="space-between" wrap="nowrap">
            <DateCell ts={thread.createdAt} fz={12} />
            {meta && (
              <Text fz={12} c="#b6b1bc">
                {meta}
              </Text>
            )}
          </Group>
          <ForumCell forum={thread.forum} fz={11} />
          <Text fz={14} fw={700} c="white">
            {thread.title}
          </Text>
          <ThreadBadges thread={thread} />
        </Stack>
      </RowShell>
    );
  }
  return (
    <RowShell to={`/Forum/${thread.forum}/thread/${thread.id}`}>
      <Flex align="center" gap={18} wrap="nowrap">
        <Box w={70} style={{ flexShrink: 0 }}>
          <DateCell ts={thread.createdAt} fz={14} />
        </Box>
        <Box w={150} style={{ flexShrink: 0, minWidth: 0 }}>
          <ForumCell forum={thread.forum} fz={14} />
        </Box>
        <Text fz={15} fw={700} c="white" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {thread.title}
        </Text>
        {meta && (
          <Text fz={14} c="#b6b1bc" style={{ flexShrink: 0 }}>
            {meta}
          </Text>
        )}
        <ThreadBadges thread={thread} />
      </Flex>
    </RowShell>
  );
}

function PostRow({ post, wide }: { post: MyPostItem; wide: boolean }) {
  if (!wide) {
    // Phone: stacked rows (date + forum, title, snippet).
    return (
      <RowShell to={`/Forum/${post.forum}/thread/${post.threadId}/last`}>
        <Stack gap={4}>
          <Group gap={10} wrap="nowrap">
            <DateCell ts={post.timePosted} fz={12} />
            <ForumCell forum={post.forum} fz={11} />
          </Group>
          <Text fz={14} fw={700} c="white">
            {post.threadTitle}
          </Text>
          {post.snippet && (
            <Text fz={12} c="#b6b1bc" lineClamp={1}>
              {post.snippet}
            </Text>
          )}
        </Stack>
      </RowShell>
    );
  }
  return (
    <RowShell to={`/Forum/${post.forum}/thread/${post.threadId}/last`}>
      <Flex align="center" gap={18} wrap="nowrap">
        <Box w={70} style={{ flexShrink: 0 }}>
          <DateCell ts={post.timePosted} fz={14} />
        </Box>
        <Box w={150} style={{ flexShrink: 0, minWidth: 0 }}>
          <ForumCell forum={post.forum} fz={14} />
        </Box>
        <Text fz={15} fw={700} c="white" lineClamp={1} w={290} style={{ flexShrink: 0, minWidth: 0 }}>
          {post.threadTitle}
        </Text>
        <Text fz={14} c="#b6b1bc" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {post.snippet}
        </Text>
      </Flex>
    </RowShell>
  );
}

/** Underline sub-tab (RECENT POSTS / THREADS YOU STARTED) per the mockup. */
function SubTab(props: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { isOverSm } = useMediaQuery();
  return (
    <UnstyledButton
      role="tab"
      id={props.id}
      aria-selected={props.active}
      aria-controls={props.controls}
      onClick={props.onClick}
      px={4}
      py={8}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${props.active ? "#E54156" : "transparent"}`,
        color: props.active ? "#fff" : "#b6b1bc",
        fontFamily: displayFont,
        fontSize: isOverSm ? 14 : 12,
        fontWeight: 700,
        letterSpacing: isOverSm ? "0.12em" : "0.1em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      {props.children}
    </UnstyledButton>
  );
}

export default function History() {
  const { user } = useAuth();
  const uid = user?.uid;
  // The one-line mockup rows need ~900px to breathe; below lg the stacked
  // phone layout is used instead.
  const { isOverLg } = useMediaQuery();
  const [tab, setTab] = React.useState<"posts" | "threads">("posts");

  const threadsQuery = useQuery({
    queryKey: ["my-threads", uid],
    queryFn: () => getMyThreads(uid as string),
    enabled: !!uid,
  });
  const postsQuery = useQuery({
    queryKey: ["my-posts", uid],
    queryFn: () => getMyPosts(uid as string),
    enabled: !!uid,
  });

  const threads = threadsQuery.data ?? [];
  const posts = postsQuery.data ?? [];
  const activeQueryFailed = tab === "posts" ? postsQuery.isError : threadsQuery.isError;

  if (activeQueryFailed) {
    return (
      <Box className="dc-card" p={{ base: 16, sm: 30 }}>
        <Text c="white" fz={15}>
          Could not load your history. Refresh to try again.
        </Text>
      </Box>
    );
  }

  return (
    <Box className="dc-card" p={{ base: 16, sm: 30 }}>
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" mb={{ base: 14, sm: 18 }}>
        <Group gap={8} role="tablist" aria-label="History sections" wrap="nowrap">
          <SubTab
            id="history-tab-posts"
            controls="history-panel-posts"
            active={tab === "posts"}
            onClick={() => setTab("posts")}
          >
            Recent Posts
          </SubTab>
          <SubTab
            id="history-tab-threads"
            controls="history-panel-threads"
            active={tab === "threads"}
            onClick={() => setTab("threads")}
          >
            Threads You Started
          </SubTab>
        </Group>
        <Text fz={14} c="#b6b1bc" visibleFrom="sm">
          Only you can see this.
        </Text>
      </Flex>

      {tab === "posts" ? (
        <Box role="tabpanel" id="history-panel-posts" aria-labelledby="history-tab-posts">
          {postsQuery.isPending ? (
            <SectionLoader />
          ) : posts.length === 0 ? (
            <EmptyMessage
              title="No posts yet"
              description={
                <>
                  Your forum posts will show up here as you play.{" "}
                  <Link to="/Forum/Main-Forum">Jump into the forums.</Link>
                </>
              }
            />
          ) : (
            <Stack gap={8}>
              {posts.map((post) => (
                <PostRow key={`${post.threadId}-${post.id}`} post={post} wide={isOverLg} />
              ))}
              {posts.length >= MY_POSTS_LIMIT && (
                <Text fz={14} c="dimmed" ta="center">
                  Showing your latest {MY_POSTS_LIMIT} posts.
                </Text>
              )}
            </Stack>
          )}
        </Box>
      ) : (
        <Box role="tabpanel" id="history-panel-threads" aria-labelledby="history-tab-threads">
          {threadsQuery.isPending ? (
            <SectionLoader />
          ) : threads.length === 0 ? (
            <EmptyMessage
              title="No threads yet"
              description={
                <>
                  Threads you start (roleplays, missions, challenges) will show up here.{" "}
                  <Link to="/Forum/Main-Forum">Start one in the forums.</Link>
                </>
              }
            />
          ) : (
            <Stack gap={8}>
              {threads.map((thread) => (
                <ThreadRow key={`${thread.forum}-${thread.id}`} thread={thread} wide={isOverLg} />
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
