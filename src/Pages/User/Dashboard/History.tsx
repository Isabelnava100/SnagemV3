import { Badge, Box, Group, Stack, Tabs, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyMessage } from "../../../components/common/Message";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatDate = (ts?: { seconds: number }) =>
  ts?.seconds ? dateFormatter.format(new Date(ts.seconds * 1000)) : "";

const forumLabel = (link: string) => categoryByLink(link)?.label ?? link;

function RowShell(props: { to: string; children: React.ReactNode }) {
  return (
    <Box
      component={Link}
      to={props.to}
      p={12}
      style={{
        display: "block",
        borderRadius: 12,
        background: "#2E2D2E",
        textDecoration: "none",
      }}
    >
      {props.children}
    </Box>
  );
}

function ThreadRow({ thread }: { thread: MyThreadItem }) {
  return (
    <RowShell to={`/Forum/${thread.forum}/thread/${thread.id}`}>
      <Group justify="space-between" wrap="nowrap" gap={10}>
        <Box style={{ minWidth: 0 }}>
          <Text fz={16} fw={600} c="white" lineClamp={1}>
            {thread.title}
          </Text>
          <Text fz={14} c="dimmed" lineClamp={1}>
            {forumLabel(thread.forum)}
            {formatDate(thread.createdAt) ? ` · started ${formatDate(thread.createdAt)}` : ""}
            {typeof thread.replyCount === "number" ? ` · ${thread.replyCount} replies` : ""}
          </Text>
        </Box>
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
      </Group>
    </RowShell>
  );
}

function PostRow({ post }: { post: MyPostItem }) {
  return (
    <RowShell to={`/Forum/${post.forum}/thread/${post.threadId}/last`}>
      <Text fz={16} fw={600} c="white" lineClamp={1}>
        {post.threadTitle}
      </Text>
      {post.snippet && (
        <Text fz={14} c="gray.4" lineClamp={2} mt={2}>
          {post.snippet}
        </Text>
      )}
      <Text fz={14} c="dimmed" mt={4}>
        {forumLabel(post.forum)}
        {formatDate(post.timePosted) ? ` · ${formatDate(post.timePosted)}` : ""}
      </Text>
    </RowShell>
  );
}

export default function History() {
  const { user } = useAuth();
  const uid = user?.uid;

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

  return (
    <Box className="bg-[#403C43] max-w-full flex-1 overflow-auto p-4 rounded-[22px]">
      <Stack gap={12}>
        <Box>
          <Text fz={22} fw={700} c="white">
            Your Forum History
          </Text>
          <Text fz={14} c="dimmed">
            Only you can see this. Threads you started and your latest posts, newest first.
          </Text>
        </Box>

        <Tabs defaultValue="posts" variant="pills" color="grape" keepMounted={false}>
          <Tabs.List mb={12}>
            <Tabs.Tab value="posts">Recent Posts</Tabs.Tab>
            <Tabs.Tab value="threads">Threads You Started</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="posts">
            {postsQuery.isPending ? (
              <SectionLoader />
            ) : posts.length === 0 ? (
              <EmptyMessage
                title="No posts yet"
                description="Your forum posts will show up here as you play."
              />
            ) : (
              <Stack gap={8}>
                {posts.map((post) => (
                  <PostRow key={`${post.threadId}-${post.id}`} post={post} />
                ))}
                {posts.length >= MY_POSTS_LIMIT && (
                  <Text fz={14} c="dimmed" ta="center">
                    Showing your latest {MY_POSTS_LIMIT} posts.
                  </Text>
                )}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="threads">
            {threadsQuery.isPending ? (
              <SectionLoader />
            ) : threads.length === 0 ? (
              <EmptyMessage
                title="No threads yet"
                description="Threads you start (roleplays, missions, challenges) will show up here."
              />
            ) : (
              <Stack gap={8}>
                {threads.map((thread) => (
                  <ThreadRow key={`${thread.forum}-${thread.id}`} thread={thread} />
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
}
