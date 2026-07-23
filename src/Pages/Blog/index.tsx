import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { type CSSProperties, type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import snagLogo from "../../assets/images/snag-hand-logo.png";
import {
  HERO_BORDER,
  HERO_CLIP,
  HERO_GRADIENT,
  HERO_STRIPES,
  PageHero,
} from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/permissions";
import { SITE_URL } from "../../lib/seo/site";
import {
  BLOG_PAGE_SIZE,
  BlogPost,
  formatPostDate,
  getAllPosts,
  getPublishedPostsPage,
} from "../../queries/blog";

const DISPLAY_FONT = "var(--font-display, 'Quantico', sans-serif)";

function PostCard({ post }: { post: BlogPost }) {
  const date = formatPostDate(post.publishedAt ?? post.createdAt);
  return (
    <Card
      component={Link}
      to={`/Blog/${post.id}`}
      className="dc-card"
      radius={0}
      p={0}
      bg="#17151c"
      sx={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        textDecoration: "none",
        transition: "transform .15s ease, border-color .25s ease",
        "&:hover": { transform: "translateY(-3px)" },
      }}
    >
      {post.coverImageUrl ? (
        <Image
          src={post.coverImageUrl}
          alt={`Cover art for ${post.title}`}
          h={170}
          fit="cover"
          loading="lazy"
          style={{ borderBottom: "1px solid #2a2637" }}
        />
      ) : (
        <Box
          h={170}
          aria-hidden
          style={{ background: "#141318", borderBottom: "1px solid #2a2637" }}
        />
      )}
      <Stack gap={9} p={22}>
        <Group gap={8} align="center">
          {!post.published && (
            <Badge color="yellow" variant="light" size="sm">
              Draft
            </Badge>
          )}
          {date && (
            <Text
              fz={14}
              fw={700}
              tt="uppercase"
              style={{ letterSpacing: "0.18em", color: "#12B7B6" }}
            >
              {date}
            </Text>
          )}
        </Group>
        <Title
          order={2}
          fz={19}
          fw={700}
          c="white"
          style={{ fontFamily: DISPLAY_FONT, lineHeight: 1.3 }}
        >
          {post.title}
        </Title>
        <Text fz={14} c="#b6b1bc" lineClamp={3} style={{ lineHeight: 1.6 }}>
          {post.description}
        </Text>
        <Text fz={14} c="#b6b1bc" mt={4}>
          by {post.author}
        </Text>
      </Stack>
    </Card>
  );
}

/**
 * "Never miss a post" subscribe band: the striped-gradient hero surface reused
 * as a full-width call to action. The form is a local, no-backend capture that
 * acknowledges with a polite status message (wire to a list provider later).
 */
export function SubscribeBand() {
  const isMobile = useMediaQuery("(max-width: 800px)");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  const labelStyle: CSSProperties = {
    fontFamily: DISPLAY_FONT,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "#FFD074",
    marginBottom: 6,
    display: "block",
    textTransform: "uppercase",
  };
  const inputStyle: CSSProperties = {
    background: "#141318",
    border: "1px solid #3a3550",
    color: "#fff",
    fontSize: 15,
    padding: "16px 18px",
    width: "100%",
    outline: "none",
    borderRadius: 0,
    fontFamily: "inherit",
  };

  return (
    <Box
      component="section"
      mt={isMobile ? 40 : 56}
      p={{ base: 24, sm: 44 }}
      style={{
        position: "relative",
        overflow: "hidden",
        background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
        border: `1px solid ${HERO_BORDER}`,
        clipPath: HERO_CLIP,
      }}
    >
      <Flex
        direction={isMobile ? "column" : "row"}
        gap={isMobile ? 24 : 44}
        align={isMobile ? "stretch" : "flex-end"}
        justify="space-between"
        style={{ position: "relative" }}
      >
        <Box maw={480} miw={0}>
          <Group gap={12} align="center" mb={14} wrap="nowrap">
            <Box
              aria-hidden
              style={{ width: 36, height: 3, background: "#E54156", flexShrink: 0 }}
            />
            <Text
              fz={14}
              fw={700}
              c="#FFD074"
              tt="uppercase"
              style={{ letterSpacing: "0.3em", fontFamily: DISPLAY_FONT }}
            >
              Never Miss a Post
            </Text>
          </Group>
          <Text
            component="h2"
            c="white"
            fw={700}
            fz={{ base: 26, sm: 36 }}
            style={{
              fontFamily: DISPLAY_FONT,
              lineHeight: 1.05,
              letterSpacing: "0.02em",
              margin: 0,
            }}
          >
            Subscribe to{" "}
            <Text span inherit c="#FFD074">
              the Blog
            </Text>
          </Text>
          <Text fz={16} c="#b6b1bc" mt={12} style={{ lineHeight: 1.55 }}>
            Announcements, upcoming events and story retrospectives, straight to
            your inbox. No spam, unsubscribe anytime.
          </Text>
        </Box>

        <form
          onSubmit={submit}
          style={{
            position: "relative",
            flex: isMobile ? "1 1 100%" : "1 1 auto",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          <Flex gap={12} align="flex-end" wrap="wrap">
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 170px", minWidth: 0 }}>
              <label htmlFor="sub-name" style={labelStyle}>
                Name
              </label>
              <input
                id="sub-name"
                type="text"
                name="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 200px", minWidth: 0 }}>
              <label htmlFor="sub-email" style={labelStyle}>
                Email
              </label>
              <input
                id="sub-email"
                type="email"
                name="email"
                placeholder="you@email.com"
                aria-label="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              className="dc-cta dc-cta-red"
              style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}
            >
              Subscribe
            </button>
          </Flex>
          {subscribed && (
            <Text
              role="status"
              aria-live="polite"
              mt={12}
              fz={14}
              c="#FFD074"
              style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.08em" }}
            >
              Thanks for subscribing!
            </Text>
          )}
        </form>
      </Flex>
    </Box>
  );
}

/** Compact page footer echoing the marketing footer, scoped to the blog. */
export function BlogFooter() {
  const isMobile = useMediaQuery("(max-width: 800px)");
  return (
    <Box
      component="footer"
      mt={isMobile ? 32 : 44}
      px={isMobile ? 20 : 40}
      py={20}
      style={{ background: "#0a090d", border: "1px solid #17151c" }}
    >
      <Flex
        direction={isMobile ? "column" : "row"}
        align="center"
        justify="space-between"
        gap={16}
      >
        <Group gap={10} align="center">
          <img src={snagLogo} alt="Snagem Guild" width={26} height={26} />
          <Text fz={14} c="#b6b1bc">
            &copy; 2026 The Snagem Guild
          </Text>
        </Group>
        <Group gap={26}>
          <Anchor component={Link} to="/Policies" fz={14} c="#b6b1bc" underline="never">
            Policies
          </Anchor>
          <Anchor component={Link} to="/Library" fz={14} c="#b6b1bc" underline="never">
            Library
          </Anchor>
          <Anchor component={Link} to="/Announcements" fz={14} c="#b6b1bc" underline="never">
            News
          </Anchor>
        </Group>
      </Flex>
    </Box>
  );
}

/**
 * Public blog hub. Lists published posts for everyone; admins also see
 * drafts and the editor controls. Posts are the site's indexable article
 * content and live in their own child sitemap.
 */
export default function Blog() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  // Admins get the flat editor list (drafts included, capped server-side);
  // everyone else pages through published posts BLOG_PAGE_SIZE at a time.
  const adminQuery = useQuery({
    queryKey: ["blog-posts", "all"],
    queryFn: getAllPosts,
    enabled: admin,
  });
  const publicQuery = useInfiniteQuery({
    queryKey: ["blog-posts", "published"],
    queryFn: ({ pageParam }) => getPublishedPostsPage(pageParam),
    initialPageParam: undefined as QueryDocumentSnapshot | undefined,
    getNextPageParam: (last) =>
      last.posts.length === BLOG_PAGE_SIZE ? (last.cursor ?? undefined) : undefined,
    enabled: !admin,
  });

  const posts = admin
    ? (adminQuery.data ?? [])
    : (publicQuery.data?.pages.flatMap((page) => page.posts) ?? []);
  const isPending = admin ? adminQuery.isPending : publicQuery.isPending;

  const published = posts.filter((p) => p.published);

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo
        page="/Blog"
        pageType="CollectionPage"
        schema={{
          "@type": "Blog",
          name: "The Snagem Guild Blog",
          url: `${SITE_URL}/Blog`,
          blogPost: published.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${SITE_URL}/Blog/${p.id}`,
          })),
        }}
      />
      <PageHero
        eyebrow="From the Guild Desk"
        title={
          <>
            The Guild{" "}
            <Text span inherit c="#FFD074">
              Blog
            </Text>
          </>
        }
        subtitle="Stories, dev updates and guides from the Snagem Guild, a Pokemon roleplay community."
        mb={32}
      />

      {admin && (
        <Group mb={20}>
          <Button component={Link} to="/Blog/edit/new" radius="xl" color="grape">
            Write a New Post
          </Button>
        </Group>
      )}

      {isPending ? (
        <SectionLoader />
      ) : posts.length === 0 ? (
        <Box py={40}>
          <Title order={2} fz={18} fw={600} c="white" lh="md" ta="center">
            No posts yet. The first story is on its way!
          </Title>
        </Box>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
            {posts.map((post) => (
              <Stack key={post.id} gap={6}>
                <PostCard post={post} />
                {admin && (
                  <Button
                    component={Link}
                    to={`/Blog/edit/${post.id}`}
                    variant="default"
                    size="xs"
                    radius="xl"
                  >
                    Edit
                  </Button>
                )}
              </Stack>
            ))}
          </SimpleGrid>
          {!admin && publicQuery.hasNextPage && (
            <Group justify="center" mt="xl">
              <Button
                variant="light"
                color="grape"
                radius="xl"
                loading={publicQuery.isFetchingNextPage}
                onClick={() => publicQuery.fetchNextPage()}
              >
                Load more
              </Button>
            </Group>
          )}
        </>
      )}

      <SubscribeBand />
      <BlogFooter />
    </Container>
  );
}
