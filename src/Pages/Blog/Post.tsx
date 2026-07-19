import { Anchor, Badge, Box, Container, Group, Image, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Link, useParams } from "react-router-dom";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, withSuffix } from "../../lib/seo/site";
import { stripHtml, truncate } from "../../lib/seo/text";
import { formatPostDate, getPost, isoPostDate } from "../../queries/blog";

/**
 * Single blog post. Fully indexable: unique meta title/description, a
 * self-referential canonical, and BlogPosting JSON-LD. Post HTML comes from
 * the Tiptap editor via Firestore and is sanitized before rendering.
 */
export default function BlogPostPage() {
  const { slug } = useParams();
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

  return (
    <Container size="md" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo
        title={withSuffix(truncate(post.title, 60))}
        description={truncate(description, 160)}
        canonicalPath={canonical}
        noindex={!post.published}
        ogType="article"
        schema={{
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
        }}
      />

      <Stack gap={10} mb={24}>
        <Anchor component={Link} to="/Blog" c="grape.3" fz={14}>
          &larr; The Guild Blog
        </Anchor>
        {!post.published && (
          <Badge color="yellow" variant="light" w="fit-content">
            Draft, only admins can see this
          </Badge>
        )}
        <Title order={1} c="white" fw={800} fz={{ base: 30, sm: 40 }} lh={1.15}>
          {post.title}
        </Title>
        <Group gap={8}>
          <Text fz={14} c="dimmed">
            By {post.author}
          </Text>
          <Text fz={14} c="dimmed">
            &middot; {formatPostDate(post.publishedAt ?? post.createdAt)}
          </Text>
        </Group>
      </Stack>

      {post.coverImageUrl && (
        <Image
          src={post.coverImageUrl}
          alt={`Cover art for ${post.title}, from the Snagem Guild Pokemon roleplay blog`}
          radius="lg"
          mb={24}
          w="100%"
          fit="cover"
        />
      )}

      {/* Tiptap output (h2/h3, lists, images, links) styled by forum.css-like
          defaults; sanitized because it round-trips through Firestore. */}
      <Box
        className="blog-content"
        c="gray.2"
        fz={17}
        style={{ lineHeight: 1.75, wordBreak: "break-word" }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
      />
    </Container>
  );
}
