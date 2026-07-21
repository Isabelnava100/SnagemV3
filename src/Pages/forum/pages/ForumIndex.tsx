import {
  Anchor,
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
import Seo from "../../../components/common/Seo";
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
        <Text fz={20} c="white" fw={500}>
          {thread.title}
        </Text>
      </Group>
      <Text fz={14} c="dimmed">
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
          <Text fz={14} c="dimmed">
            by <span style={{ color: FORUM_LINK_COLOR }}>{thread.lastPost.by}</span>
          </Text>
          <Text fz={14} c="white">
            {formatFireTime(thread.lastPost.at)}
          </Text>
        </Stack>
      </Group>
    </Link>
  ) : (
    <Link
      to={`/Forum/${forum}/thread/${thread.id}/last`}
      style={{ textDecoration: "none", color: FORUM_LINK_COLOR, fontSize: 14 }}
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
            <Text fz={14} c="dimmed" tt="uppercase" fw={700}>
              Latest post
            </Text>
            {lastPost}
          </Stack>
          <Stack gap={2} align="flex-end">
            <Text fz={14} c="dimmed">
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
        <Text fz={14} c="dimmed">
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
  const [searchAll, setSearchAll] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // Main-Forum is publicly viewable; every other board is members-only
  // (mirrored in firestore.rules, which is the real enforcement).
  const publicOnly = !user && activeLink !== "Main-Forum";

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
    enabled: !publicOnly,
  });

  // Cross-category search: fetch every accessible board's list and tag each
  // thread with its home forum. Cached per board by react-query, so flipping
  // the toggle mostly reuses lists the tabs already loaded.
  const crossSearch = !!search && searchAll && !!user;
  const allThreads = useQuery({
    queryKey: ["forum-threads-all", archive, tabs.map((t) => t.link).join(",")],
    queryFn: async () => {
      const lists = await Promise.all(
        tabs.map(async (t) => {
          const rows = await getThreadList(t.link, archive).catch(() => []);
          return rows.map((thread) => ({ thread, forumLink: t.link, forumLabel: t.label }));
        })
      );
      return lists.flat();
    },
    enabled: crossSearch,
  });

  const visible = React.useMemo(() => {
    return (threads ?? []).filter((thread) => threadMatches(thread, search));
  }, [threads, search]);
  const crossVisible = React.useMemo(() => {
    return (allThreads.data ?? []).filter((row) => threadMatches(row.thread, search));
  }, [allThreads.data, search]);

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
      {/* Forums are never crawlable: robots.txt disallow, an X-Robots-Tag
          header (netlify.toml), and this noindex. Meta still names the tab. */}
      <Seo
        noindex
        title={`${category?.label ?? "Snagem Forums"} | Snagem Guild Forums`}
        description={
          category
            ? `${category.description} Roleplay board on the Snagem Guild's Pokemon roleplay forums.`
            : "The Snagem Guild's Pokemon roleplay boards. Pick a board, join a thread, or start your own story."
        }
      />
      <PageHero
        eyebrow="The Roleplay Boards"
        title="Snagem Forums"
        subtitle="Where the guild's stories happen. Pick a board, join a thread, or start your own."
        aside={
          <Stack gap={6} w={{ base: "100%", sm: 220 }}>
            <TextInput
              placeholder="Search the Forums..."
              aria-label="Search the Forums"
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              size="xs"
              w="100%"
              radius="xl"
              styles={{ input: { background: "rgba(0,0,0,0.25)" } }}
            />
            {!!search && !!user && (
              <Switch
                size="xs"
                label="Search all categories"
                checked={searchAll}
                onChange={(e) => setSearchAll(e.currentTarget.checked)}
                styles={{ label: { color: "rgba(255,255,255,0.8)" } }}
              />
            )}
          </Stack>
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
        <Text fz={14} fw={700} c="white" tt="uppercase" style={{ flex: 3 }}>
          Topics
        </Text>
        {isOverSm && (
          <Text fz={14} fw={700} c="white" tt="uppercase" style={{ flex: 2 }}>
            Latest post
          </Text>
        )}
        <Text
          fz={14}
          fw={700}
          c="white"
          tt="uppercase"
          ta="right"
          style={{ flex: 1 }}
        >
          Replies
        </Text>
      </Flex>

      {/* Thread rows. Members-only boards ask visitors to log in. */}
      {publicOnly ? (
        <Stack gap={10} align="center" py={40}>
          <Text fz={16} c="white" ta="center">
            This board is for guild members. Log in to read its stories, or
            browse the public Main Adventures board.
          </Text>
          <Group gap={10}>
            <GradientButtonSecondary radius="xl" size="xs" onClick={() => navigate("/Login")}>
              Log In
            </GradientButtonSecondary>
            <GradientButtonSecondary
              radius="xl"
              size="xs"
              onClick={() => navigate("/Forum/Main-Forum")}
            >
              Go to Main Adventures
            </GradientButtonSecondary>
          </Group>
        </Stack>
      ) : isPending ? (
        <SectionLoader />
      ) : crossSearch ? (
        <Stack gap={8} mt={8}>
          {allThreads.isPending ? (
            <SectionLoader />
          ) : (
            <>
              {crossVisible.slice(0, 60).map((row) => (
                <Box key={`${row.forumLink}-${row.thread.id}`}>
                  <Text fz={12} c="dimmed" tt="uppercase" fw={700} mb={2}>
                    {row.forumLabel}
                  </Text>
                  <ThreadRow thread={row.thread} forum={row.forumLink} />
                </Box>
              ))}
              {!crossVisible.length && (
                <Text fz={16} c="dimmed" ta="center" py={30}>
                  Nothing matches across the boards.
                </Text>
              )}
            </>
          )}
        </Stack>
      ) : (
        <Stack gap={8} mt={8}>
          {pageThreads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} forum={activeLink} />
          ))}
          {!pageThreads.length && (
            <Text fz={16} c="dimmed" ta="center" py={30}>
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
          styles={{ label: { color: "white", fontSize: 14 } }}
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
      <CategoryDisclaimer link={activeLink} />
    </Container>
  );
}

/**
 * Small bottom-right note explaining this category's creation limits, so
 * members know where gated threads actually start (with the link to go
 * there). Full details live in Library > The Charter.
 */
function CategoryDisclaimer(props: { link: string }) {
  const notes: Record<string, React.ReactNode> = {
    "Main-Forum": "Main Adventure threads are created by admins and directors.",
    "Side-Roleplay": "Any member can start a Side Story thread here.",
    Quests: (
      <>
        Mission threads cannot be created here directly. Pick up a mission from
        the{" "}
        <Anchor component={Link} to="/Missions" c="blue.3" fz={14}>
          Mission hub
        </Anchor>{" "}
        and your thread is created for you.
      </>
    ),
    Events: (
      <>
        Event threads are launched by admins and event hosts (Safari Contests
        from Admin &gt; Manage).
      </>
    ),
    "The-Colosseum": (
      <>
        Colosseum threads are hosted by staff; training posts start from the{" "}
        <Anchor component={Link} to="/Colosseum" c="blue.3" fz={14}>
          Colosseum page
        </Anchor>
        .
      </>
    ),
    "Master-Mission": (
      <>
        Master Missions are requested from the{" "}
        <Anchor component={Link} to="/Research" c="blue.3" fz={14}>
          Research page
        </Anchor>{" "}
        and visible to Master members.
      </>
    ),
  };
  const note = notes[props.link];
  if (!note) return null;
  return (
    <Group justify="flex-end" mt={16}>
      <Text fz={14} c="dimmed" ta="right" maw={420}>
        {note}{" "}
        <Anchor component={Link} to="/Library?tab=forums" c="blue.3" fz={14}>
          Forum guide
        </Anchor>
      </Text>
    </Group>
  );
}
