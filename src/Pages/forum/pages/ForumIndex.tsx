import {
  Anchor,
  Avatar,
  Box,
  Container,
  Flex,
  Group,
  Pagination,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  MASTER_CATEGORY,
  THREADS_PER_PAGE,
  categoryByLink,
} from "../config";
import { getThreadList } from "../queries";
import { ForumThread, formatFireDate } from "../types";
import "../forum.css";

/** Angled corner cut shared by the category pills. */
const PILL_CLIP = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";

function threadMatches(thread: ForumThread, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    thread.title?.toLowerCase().includes(q) ||
    thread.createdBy?.toLowerCase().includes(q) ||
    (thread.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
  );
}

/**
 * Status badge for a thread row: BOSS (active boss battle) > CLOSED (archived) >
 * MISSION (mission-linked) > OPEN (default). Colors follow the redesign palette.
 */
function statusBadge(thread: ForumThread): { label: string; bg: string; fg: string } {
  if (thread.bossBattle?.active) return { label: "BOSS", bg: "#E54156", fg: "#fff" };
  if (thread.closed) return { label: "CLOSED", bg: "#3C3A3C", fg: "#fff" };
  if (thread.missionId) return { label: "MISSION", bg: "#FFD074", fg: "#1A1B1E" };
  return { label: "OPEN", bg: "#12B7B6", fg: "#fff" };
}

function ThreadRow(props: { thread: ForumThread; forum: string }) {
  const { thread, forum } = props;
  const { isOverSm } = useMediaQuery();
  const badge = statusBadge(thread);
  const replies = thread.replyCount ?? 0;
  const avatarSrc =
    Object.values(thread.participants ?? {})[0]?.avatar ||
    thread.lastPost?.avatar ||
    undefined;
  const lastBy = thread.lastPost?.by ?? thread.createdBy;
  const lastAt = formatFireDate(thread.lastPost?.at ?? thread.timePosted);
  const threadUrl = `/Forum/${forum}/thread/${thread.id}`;
  const lastUrl = `/Forum/${forum}/thread/${thread.id}/last`;

  const badgeEl = (
    <Box
      component="span"
      style={{
        flex: "none",
        fontFamily: "var(--font-display)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: badge.fg,
        background: badge.bg,
        padding: "3px 9px",
      }}
    >
      {badge.label}
    </Box>
  );

  const avatar = (
    <Avatar
      src={avatarSrc}
      alt={`Avatar for ${thread.createdBy}'s roleplay thread`}
      size={40}
      radius="xl"
      style={{ border: "2px solid #772976", flex: "none" }}
    />
  );

  const titleBlock = (
    <Box style={{ minWidth: 0 }}>
      <Group gap={8} wrap={isOverSm ? "nowrap" : "wrap"} align="center" style={{ minWidth: 0 }}>
        {thread.pinned && (
          <Box
            component="span"
            style={{
              flex: "none",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#fff",
              background: "#772976",
              padding: "2px 7px",
            }}
          >
            PINNED
          </Box>
        )}
        <Text
          fz={15.5}
          fw={700}
          c="white"
          style={
            isOverSm
              ? { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
              : {}
          }
        >
          {thread.title}
        </Text>
        {badgeEl}
      </Group>
      <Text fz={14} c="#b6b1bc" mt={4}>
        by {thread.createdBy} · started {formatFireDate(thread.createdAt ?? thread.timePosted)}
      </Text>
      {!!thread.tags?.length && (
        <Group gap={5} mt={5}>
          {thread.tags.slice(0, 5).map((tag) => (
            <Text
              key={tag}
              component="span"
              fz={11}
              c="#b6b1bc"
              tt="uppercase"
              style={{ border: "1px solid #2a2637", padding: "1px 7px", letterSpacing: "0.06em" }}
            >
              {tag}
            </Text>
          ))}
        </Group>
      )}
    </Box>
  );

  const repliesInline = (
    <Box style={{ flex: "none", textAlign: "right", width: 78 }}>
      <Text fz={17} fw={800} c="#FFD074" style={{ lineHeight: 1.1 }}>
        {replies}
      </Text>
      <Text fz={12} fw={700} c="#b6b1bc" style={{ letterSpacing: "0.14em" }}>
        REPLIES
      </Text>
    </Box>
  );

  const lastPostCol = (
    <Link to={lastUrl} style={{ textDecoration: "none" }}>
      <Text fz={14} fw={700} c="white" style={{ lineHeight: 1.2 }}>
        {lastBy}
      </Text>
      <Text fz={13} c="#b6b1bc">
        {lastAt}
      </Text>
    </Link>
  );

  if (isOverSm) {
    return (
      <Box className="dc-row-hover" style={{ borderTop: "1px solid #2a2637" }}>
        <Flex align="center" gap={20} style={{ padding: "16px 26px" }}>
          <Link
            to={threadUrl}
            style={{ textDecoration: "none", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 16 }}
          >
            {avatar}
            <Box style={{ flex: 1, minWidth: 0 }}>{titleBlock}</Box>
            {repliesInline}
          </Link>
          <Box style={{ flex: "none", width: 140, textAlign: "right" }}>{lastPostCol}</Box>
        </Flex>
      </Box>
    );
  }

  return (
    <Box className="dc-row-hover" style={{ borderTop: "1px solid #2a2637" }}>
      <Box style={{ padding: "14px 16px" }}>
        <Link
          to={threadUrl}
          style={{ textDecoration: "none", display: "flex", gap: 12, alignItems: "flex-start" }}
        >
          {avatar}
          <Box style={{ flex: 1, minWidth: 0 }}>{titleBlock}</Box>
        </Link>
        <Flex justify="space-between" align="center" mt={10} gap={10}>
          <Box>
            <Text fz={16} fw={800} c="#FFD074" component="span">
              {replies}
            </Text>{" "}
            <Text fz={12} fw={700} c="#b6b1bc" component="span" style={{ letterSpacing: "0.14em" }}>
              REPLIES
            </Text>
          </Box>
          <Box style={{ textAlign: "right" }}>{lastPostCol}</Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default function ForumIndex() {
  const { forum } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const activeLink = forum && forum !== "Forum" ? forum : "Main-Forum";
  const category = categoryByLink(activeLink);

  // List state lives in the URL so refresh, share, and back-from-thread all
  // restore the same view (replace: no history spam while typing/paging).
  const [params, setParams] = useSearchParams();
  const archive = params.get("archive") === "1";
  const search = params.get("q") ?? "";
  const searchAll = params.get("all") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [hoverTab, setHoverTab] = React.useState<string | null>(null);

  const patchParams = (patch: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true }
    );
  };
  const setArchive = (v: boolean) => patchParams({ archive: v ? "1" : null, page: null });
  const setSearch = (v: string) => patchParams({ q: v || null, page: null });
  const setSearchAll = (v: boolean) => patchParams({ all: v ? "1" : null });
  const setPage = (v: number) => patchParams({ page: v > 1 ? String(v) : null });

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

  const heroButtonStyle: React.CSSProperties = isOverSm ? {} : { width: "100%" };

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
        eyebrow="The Roleplay Engine"
        title="The Forums"
        subtitle="Where the stories happen. Every post rolls encounters, resolves battles, and grows your team."
        aside={
          <Flex
            direction="column"
            align={isOverSm ? "flex-end" : "stretch"}
            gap={12}
            w={isOverSm ? "auto" : "100%"}
          >
            <button
              type="button"
              className="dc-cta dc-cta-outline"
              style={heroButtonStyle}
              onClick={() => navigate("/Dashboard/Bookmarks")}
            >
              ☆ View Your Bookmarks
            </button>
            <button
              type="button"
              className="dc-cta dc-cta-red"
              style={heroButtonStyle}
              onClick={() => navigate(`/Forum/${activeLink}/new`)}
            >
              + New Roleplay
            </button>
          </Flex>
        }
        mb={24}
      />

      <Stack gap={20}>
        {/* Category tabs: angled segmented pills, scroll horizontally on mobile. */}
        <Box
          component="nav"
          aria-label="Forum categories"
          style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}
        >
          {tabs.map((tab) => {
            const active = tab.link === activeLink;
            return (
              <UnstyledButton
                key={tab.link}
                onClick={() => navigate(`/Forum/${tab.link}`)}
                onMouseEnter={() => setHoverTab(tab.link)}
                onMouseLeave={() => setHoverTab(null)}
                aria-current={active ? "page" : undefined}
                fz={{ base: 12, sm: 14 }}
                style={{
                  flex: "none",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "13px 22px",
                  cursor: "pointer",
                  color: "#fff",
                  whiteSpace: "nowrap",
                  clipPath: PILL_CLIP,
                  background: active ? "linear-gradient(90deg,#912691,#4D14C4)" : "#17151c",
                  border: active
                    ? "1px solid transparent"
                    : `1px solid ${hoverTab === tab.link ? "#E54156" : "#2a2637"}`,
                }}
              >
                {tab.label}
              </UnstyledButton>
            );
          })}
        </Box>

        {/* Search stays available (moved out of the hero aside per the mockup). */}
        <Flex justify="flex-end" align="center" gap={10} wrap="wrap">
          <TextInput
            placeholder="Search the Forums..."
            aria-label="Search the Forums"
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            size="xs"
            w={isOverSm ? 260 : "100%"}
            styles={{ input: { background: "#17151c", borderColor: "#2a2637" } }}
          />
          {!!search && !!user && (
            <Switch
              size="xs"
              label="Search all categories"
              checked={searchAll}
              onChange={(e) => setSearchAll(e.currentTarget.checked)}
              styles={{ label: { color: "#b6b1bc" } }}
            />
          )}
        </Flex>

        {/* Thread panel: gradient category header + flat angular row list. */}
        <Box style={{ background: "#17151c", border: "1px solid #2a2637" }}>
          <Flex
            align="center"
            justify="space-between"
            gap={12}
            wrap="wrap"
            style={{
              background: "linear-gradient(90deg,#762B77 7%,#17F1F0 66%)",
              padding: "16px 26px",
            }}
          >
            <Text
              component="h2"
              c="white"
              fw={700}
              tt="uppercase"
              fz={17}
              style={{ margin: 0, fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}
            >
              {category?.label ?? activeLink}
            </Text>
            {category?.description && (
              <Text fz={14} c="rgba(255,255,255,0.92)" style={{ maxWidth: 420 }}>
                {category.description}
              </Text>
            )}
          </Flex>

          {/* Members-only boards ask visitors to log in. */}
          {publicOnly ? (
            <Stack gap={12} align="center" py={44} px={20}>
              <Text fz={16} c="white" ta="center" maw={460}>
                This board is for guild members. Log in to read its stories, or browse the public
                Main Adventures board.
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
            <Box py={30}>
              <SectionLoader />
            </Box>
          ) : crossSearch ? (
            allThreads.isPending ? (
              <Box py={30}>
                <SectionLoader />
              </Box>
            ) : crossVisible.length ? (
              crossVisible.slice(0, 60).map((row) => (
                <Box key={`${row.forumLink}-${row.thread.id}`} style={{ borderTop: "1px solid #2a2637" }}>
                  <Text
                    fz={12}
                    c="#b6b1bc"
                    tt="uppercase"
                    fw={700}
                    px={26}
                    pt={10}
                    style={{ letterSpacing: "0.1em" }}
                  >
                    {row.forumLabel}
                  </Text>
                  <ThreadRow thread={row.thread} forum={row.forumLink} />
                </Box>
              ))
            ) : (
              <Text fz={16} c="#b6b1bc" ta="center" py={40}>
                Nothing matches across the boards.
              </Text>
            )
          ) : pageThreads.length ? (
            pageThreads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} forum={activeLink} />
            ))
          ) : (
            <Text fz={16} c="#b6b1bc" ta="center" py={40}>
              {archive ? "No archived threads here." : "No threads here yet."}
            </Text>
          )}
        </Box>

        {/* Archive toggle + pagination. */}
        <Flex justify="space-between" align="center" gap={10} wrap="wrap">
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
              radius={0}
              withEdges
              styles={{ control: { fontFamily: "var(--font-display)", fontWeight: 700 } }}
            />
          )}
        </Flex>

        {/* Rules callout: a purple-flagged strip that points at the policies page. */}
        <Flex
          align="center"
          justify="space-between"
          gap={20}
          wrap="wrap"
          style={{
            background: "#141318",
            border: "1px solid #2a2637",
            borderLeft: "3px solid #772976",
            padding: "18px 24px",
          }}
        >
          <Text fz={14} c="#b6b1bc" style={{ flex: "1 1 260px" }}>
            New to the forums? The rules cover who can post where, thread etiquette, and grading.
          </Text>
          <button
            type="button"
            className="dc-cta dc-cta-outline"
            style={heroButtonStyle}
            onClick={() => navigate("/Policies?tab=conduct")}
          >
            View Forum Rules
          </button>
        </Flex>

        <CategoryDisclaimer link={activeLink} />
      </Stack>
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
    <Group justify="flex-end">
      <Text fz={14} c="dimmed" ta="right" maw={420}>
        {note}{" "}
        <Anchor component={Link} to="/Library?tab=forums" c="blue.3" fz={14}>
          Forum guide
        </Anchor>
      </Text>
    </Group>
  );
}
