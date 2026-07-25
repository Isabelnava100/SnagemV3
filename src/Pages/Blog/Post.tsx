import { Anchor, Badge, Box, Container, Flex, Image, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Link, useParams } from "react-router-dom";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, withSuffix } from "../../lib/seo/site";
import { stripHtml, truncate } from "../../lib/seo/text";
import { formatPostDate, getPost, isoPostDate } from "../../queries/blog";
import { BlogFooter, SubscribeBand } from "./index";

const DISPLAY_FONT = "var(--font-display, 'Quantico', sans-serif)";

/**
 * Single blog post. Fully indexable: unique meta title/description, a
 * self-referential canonical, and BlogPosting JSON-LD. Post HTML comes from
 * the Tiptap editor via Firestore and is sanitized before rendering.
 */
export default function BlogPostPage() {
  const { slug } = useParams();
  const isMobile = useMediaQuery("(max-width: 800px)");
  const { data: post, isPending } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => getPost(slug!),
    enabled: !!slug,
  });

  if (isPending) {
    return (
      <Container size="md" mt={40}>
        <SectionLoader />
      </Container>
    );
  }

  if (!post) {
    return (
      <Container size="md" mt={60}>
        <Seo noindex title="Post Not Found | Snagem Guild Blog" />
        <Stack align="center" gap={10}>
          <Title order={1} c="white" fw={600}>
            Post not found
          </Title>
          <Text c="dimmed">This story does not exist or has been unpublished.</Text>
          <Anchor component={Link} to="/Blog" c="grape.3">
            Back to the Guild Blog
          </Anchor>
        </Stack>
      </Container>
    );
  }

  const canonical = `/Blog/${post.id}`;
  const description =
    post.description?.trim() || truncate(stripHtml(post.content), 160);
  const authorInitial = (post.author?.trim()?.[0] || "?").toUpperCase();

  return (
    <Container size={820} py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 32 }}>
      <Seo
        title={withSuffix(truncate(post.title, 60))}
        description={truncate(description, 160)}
        canonicalPath={canonical}
        noindex={!post.published}
        ogType="article"
        schema={[
          {
            "@type": "BlogPosting",
            headline: truncate(post.title, 110),
            description: truncate(description, 160),
            url: `${SITE_URL}${canonical}`,
            image: post.coverImageUrl || DEFAULT_OG_IMAGE,
            datePublished: isoPostDate(post.publishedAt),
            dateModified: isoPostDate(post.updatedAt ?? post.publishedAt),
            author: { "@type": "Person", name: post.author },
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            mainEntityOfPage: `${SITE_URL}${canonical}`,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "The Guild Blog", item: `${SITE_URL}/Blog` },
              { "@type": "ListItem", position: 3, name: truncate(post.title, 60) },
            ],
          },
        ]}
      />

      {/* Scoped typography for the sanitized Tiptap body: Quantico subheads,
          gold links, and framed images, matching the BlogPost mockup. */}
      <style>{`
        .blog-content h2 { font-family: ${DISPLAY_FONT}; font-weight: 700; font-size: 24px; color: #fff; letter-spacing: .04em; line-height: 1.3; margin: 12px 0 0; }
        .blog-content h3 { font-family: ${DISPLAY_FONT}; font-weight: 700; font-size: 20px; color: #fff; letter-spacing: .03em; line-height: 1.3; margin: 8px 0 0; }
        .blog-content p { margin: 0; }
        .blog-content a { color: #FFD074; }
        .blog-content a:hover { color: #fff; }
        .blog-content ul, .blog-content ol { margin: 0; padding-left: 1.4em; }
        .blog-content li { margin: 4px 0; }
        .blog-content img { max-width: 100%; height: auto; border: 1px solid #2a2637; }
        .blog-content blockquote { border-left: 3px solid #772976; margin: 0; padding-left: 16px; color: #b6b1bc; }
      `}</style>

      <Anchor
        component={Link}
        to="/Blog"
        underline="never"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: DISPLAY_FONT,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#FFD074",
          textDecoration: "none",
          marginBottom: 28,
        }}
      >
        &larr; The Guild Blog
      </Anchor>

      {!post.published && (
        <Badge color="yellow" variant="light" w="fit-content" mb={16}>
          Draft, only admins can see this
        </Badge>
      )}

      <Title
        order={1}
        c="white"
        fw={700}
        fz={{ base: 30, sm: 44 }}
        mb={16}
        style={{ fontFamily: DISPLAY_FONT, lineHeight: 1.12, letterSpacing: "0.01em" }}
      >
        {post.title}
      </Title>

      <Flex align="center" gap={14} mb={34} wrap="wrap">
        <Box
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid #772976",
            background: "#141318",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 15,
            color: "#fff",
          }}
        >
          {authorInitial}
        </Box>
        <Text fz={14} c="white" fw={700}>
          {post.author}
        </Text>
        <Text fz={14} c="#b6b1bc">
          &middot; {formatPostDate(post.publishedAt ?? post.createdAt)}
        </Text>
      </Flex>

      {post.coverImageUrl && (
        <Image
          src={post.coverImageUrl}
          alt={`Cover art for ${post.title}, from the Snagem Guild Pokemon roleplay blog`}
          h={isMobile ? 220 : 340}
          w="100%"
          fit="cover"
          radius={0}
          mb={38}
          style={{ border: "1px solid #2a2637" }}
        />
      )}

      {/* Tiptap output (h2/h3, lists, images, links); sanitized because it
          round-trips through Firestore. */}
      <Box
        className="blog-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          fontSize: 17,
          color: "#d7d3dc",
          lineHeight: 1.85,
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
      />

      <SubscribeBand />
      <BlogFooter />
    </Container>
  );
}
