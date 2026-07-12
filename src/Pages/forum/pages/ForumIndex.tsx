import {
  Avatar,
  Badge,
  Box,
  Container,
  Flex,
  Group,
  Pagination,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GradientButtonSecondary } from "../../../components/common/GradientButton";
import { PageHero } from "../../../components/common/PageHero";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { canAccessForum } from "../../../lib/permissions";
import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  FORUM_ACCENT,
  FORUM_CATEGORIES,
  FORUM_LINK_COLOR,
  MASTER_CATEGORY,
  THREADS_PER_PAGE,
  categoryByLink,
} from "../config";
import { getThreadList } from "../queries";
import { ForumThread, formatFireDate, formatFireTime } from "../types";
import "../forum.css";

function ParticipantAvatars(props: { thread: ForumThread }) {
  const participants = Object.values(props.thread.participants ?? {});
  if (!participants.length) return null;
  return (
    <Avatar.Group spacing="xs">
      {participants.slice(0, 4).map((participant, i) => (
        <Avatar key={i} src={participant.avatar || undefined} alt={`${participant.name ?? "User"} avatar`} size={26} radius="xl" />
      ))}
      {participants.length > 4 && (
        <Avatar size={26} radius="xl" alt={`${participants.length - 4} more participants`}>
          +{participants.length - 4}
        </Avatar>
      )}
    </Avatar.Group>
  );
}

function threadMatches(thread: ForumThread, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    thread.title?.toLowerCase().includes(q) ||
    thread.createdBy?.toLowerCase().includes(q) ||
    (thread.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
  );
}

function ThreadRow(props: { thread: ForumThread; forum: string }) {
  const { thread, forum } = props;
  const { isOverSm } = useMediaQuery();
  const posts = (thread.replyCount ?? 0) + 1;

  const title = (
    <Link to={`/Forum/${forum}/thread/${thread.id}`} style={{ textDecoration: "none" }}>
      <Group gap={8}>
        {thread.pinned && (
          <Badge size="xs" variant="filled" color="pink.0">
            Pinned
          </Badge>
        )}
        <Text fz={16} c="white" fw={500}>
          {thread.title}
        </Text>
      </Group>
      <Text fz={11} c="dimmed">
        By <span style={{ color: FORUM_LINK_COLOR }}>{thread.createdBy}</span>{" "}
        {formatFireDate(thread.createdAt ?? thread.timePosted)}
      </Text>
      {!!thread.tags?.length && (
        <Group gap={4} mt={2}>
          {thread.tags.slice(0, 5).map((tag) => (
            <Badge key={tag} size="xs" variant="outline" color="gray">
              {tag}
            </Badge>
          ))}
        </Group>
      )}
    </Link>
  );

  const lastPost = thread.lastPost ? (
    <Link
      to={`/Forum/${forum}/thread/${thread.id}/last`}
      style={{ textDecoration: "none" }}
    >
      <Group gap={8} wrap="nowrap">
        <Avatar
          src={thread.lastPost.avatar || undefined}
          alt={`${thread.lastPost.by ?? "User"} avatar`}
          size={34}
          radius="xl"
        />
        <Stack gap={0}>
          <Text fz={11} c="dimmed">
            by <span style={{ color: FORUM_LINK_COLOR }}>{thread.lastPost.by}</span>
          </Text>
          <Text fz={12} c="white">
            {formatFireTime(thread.lastPost.at)}
          </Text>
        </Stack>
      </Group>
    </Link>
  ) : (
    <Link
      to={`/Forum/${forum}/thread/${thread.id}/last`}
      style={{ textDecoration: "none", color: FORUM_LINK_COLOR, fontSize: 12 }}
    >
      {formatFireTime(thread.timePosted)}
    </Link>
  );

  if (!isOverSm) {
    return (
      <Box p={12} bg="#2b2a2b" style={{ borderRadius: 10 }}>
        {title}
        <Flex justify="space-between" align="center" mt={8} gap={8} wrap="wrap">
          <Stack gap={2}>
            <Text fz={10} c="dimmed" tt="uppercase" fw={700}>
              Latest post
            </Text>
            {lastPost}
          </Stack>
          <Stack gap={2} align="flex-end">
            <Text fz={12} c="dimmed">
              {posts} post{posts === 1 ? "" : "s"}
            </Text>
            <ParticipantAvatars thread={thread} />
          </Stack>
        </Flex>
      </Box>
    );
  }

  return (
    <Flex px={14} py={10} bg="#2b2a2b" style={{ borderRadius: 8 }} align="center" gap={12}>
      <Box style={{ flex: 3, minWidth: 0 }}>{title}</Box>
      <Box style={{ flex: 2, minWidth: 0 }}>{lastPost}</Box>
      <Stack gap={2} align="flex-end" style={{ flex: 1 }}>
        <ParticipantAvatars thread={thread} />
        <Text fz={12} c="dimmed">
          {posts} post{posts === 1 ? "" : "s"}
        </Text>
      </Stack>
    </Flex>
  );
}

export default function ForumIndex() {
  const { forum } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const activeLink = forum && forum !== "Forum" ? forum : "Main-Forum";
  const category = categoryByLink(activeLink);

  const [archive, setArchive] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const tabs = React.useMemo(() => {
    const base = [...FORUM_CATEGORIES];
    if (canAccessForum(user, MASTER_CATEGORY.value)) base.push(MASTER_CATEGORY);
    return base;
  }, [user]);

  // Archive state is filtered server-side (keyed so open/archived cache
  // separately and flip instantly once both are fetched).
  const { data: threads, isPending } = useQuery({
    queryKey: ["forum-threads", activeLink, archive],
    queryFn: () => getThreadList(activeLink, archive),
  });

  const visible = React.useMemo(() => {
    return (threads ?? []).filter((thread) => threadMatches(thread, search));
  }, [threads, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / THREADS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageThreads = visible.slice(
    (safePage - 1) * THREADS_PER_PAGE,
    safePage * THREADS_PER_PAGE
  );

  // Category visibility respects the forum-permission tiers.
  if (category && !canAccessForum(user, category.value) && category.value === MASTER_CATEGORY.value) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">You do not have access to this forum.</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <PageHero
        eyebrow="The Roleplay Boards"
        title="Snagem Forums"
        subtitle="Where the guild's stories happen. Pick a board, join a thread, or start your own."
        aside={
          <TextInput
            placeholder="Search the Forums..."
            aria-label="Search the Forums"
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            size="xs"
            w={{ base: "100%", sm: 220 }}
            radius="xl"
            styles={{ input: { background: "rgba(0,0,0,0.25)" } }}
          />
        }
        mb={16}
      />

      <Group gap={10} mt={14} mb={16}>
        <GradientButtonSecondary radius="xl" size="xs" onClick={() => navigate("/Dashboard/Bookmarks")}>
          View Your Bookmarks
        </GradientButtonSecondary>
        {/* Forum rules point at the Community Rules tab of the public policies page. */}
        <GradientButtonSecondary
          radius="xl"
          size="xs"
          onClick={() => navigate("/Policies?tab=conduct")}
        >
          View Forum Rules
        </GradientButtonSecondary>
        <GradientButtonSecondary
          radius="xl"
          size="xs"
          onClick={() => navigate(`/Forum/${activeLink}/new`)}
        >
          Start a New Roleplay
        </GradientButtonSecondary>
      </Group>

      {/* Category tabs */}
      <Tabs
        value={activeLink}
        onChange={(link) => link && navigate(`/Forum/${link}`)}
        variant="pills"
        color={FORUM_ACCENT}
        keepMounted={false}
      >
        <Tabs.List style={{ background: "#2b2a2b", borderRadius: 8, padding: 4, rowGap: 4 }}>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.link} value={tab.link} fz={isOverSm ? 14 : 12} c="white">
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {/* Header bar */}
      <Flex
        px={14}
        py={6}
        mt={10}
        style={{ background: FORUM_ACCENT, borderRadius: 6 }}
        justify="space-between"
      >
        <Text fz={12} fw={700} c="white" tt="uppercase" style={{ flex: 3 }}>
          Topics
        </Text>
        {isOverSm && (
          <Text fz={12} fw={700} c="white" tt="uppercase" style={{ flex: 2 }}>
            Latest post
          </Text>
        )}
        <Text
          fz={12}
          fw={700}
          c="white"
          tt="uppercase"
          ta="right"
          style={{ flex: 1 }}
        >
          Replies
        </Text>
      </Flex>

      {/* Thread rows */}
      {isPending ? (
        <SectionLoader />
      ) : (
        <Stack gap={8} mt={8}>
          {pageThreads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} forum={activeLink} />
          ))}
          {!pageThreads.length && (
            <Text fz={14} c="dimmed" ta="center" py={30}>
              {archive ? "No archived threads here." : "No threads here yet."}
            </Text>
          )}
        </Stack>
      )}

      <Flex justify="space-between" align="center" mt={16} gap={10} wrap="wrap">
        <Switch
          label={archive ? "Viewing Archived Threads" : "View Archived Threads"}
          color="green.0"
          checked={archive}
          onChange={(e) => {
            setArchive(e.currentTarget.checked);
            setPage(1);
          }}
          styles={{ label: { color: "white", fontSize: 13 } }}
        />
        {totalPages > 1 && (
          <Pagination
            total={totalPages}
            value={safePage}
            onChange={setPage}
            color={FORUM_ACCENT}
            size="sm"
            withEdges
          />
        )}
      </Flex>
    </Container>
  );
}
