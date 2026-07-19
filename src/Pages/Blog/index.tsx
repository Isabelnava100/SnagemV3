import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/permissions";
import { SITE_URL } from "../../lib/seo/site";
import {
  BlogPost,
  formatPostDate,
  getAllPosts,
  getPublishedPosts,
} from "../../queries/blog";

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Card
      component={Link}
      to={`/Blog/${post.id}`}
      withBorder
      radius="lg"
      p={0}
      bg="#1c1a1e"
      style={{ borderColor: "#332e38", overflow: "hidden" }}
    >
      {post.coverImageUrl && (
        <Image
          src={post.coverImageUrl}
          alt={`Cover art for ${post.title}`}
          h={170}
          fit="cover"
          loading="lazy"
        />
      )}
      <Stack gap={8} p="lg">
        <Group gap={8}>
          {!post.published && (
            <Badge color="yellow" variant="light" size="sm">
              Draft
            </Badge>
          )}
          <Text fz={13} c="dimmed">
            {formatPostDate(post.publishedAt ?? post.createdAt)}
          </Text>
        </Group>
        <Title order={2} fz={20} fw={700} c="white" lh="md">
          {post.title}
        </Title>
        <Text fz={14} c="dimmed" lineClamp={3}>
          {post.description}
        </Text>
        <Text fz={13} c="gray.5">
          By {post.author}
        </Text>
      </Stack>
    </Card>
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
  const { data: posts, isPending } = useQuery({
    queryKey: ["blog-posts", admin ? "all" : "published"],
    queryFn: admin ? getAllPosts : getPublishedPosts,
  });

  const published = (posts ?? []).filter((p) => p.published);

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
        title="The Guild Blog"
        subtitle="Stories, dev updates and guides from the Snagem Guild, a Pokemon roleplay community."
        mb={24}
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
      ) : (posts ?? []).length === 0 ? (
        <Box py={40}>
          <Title order={2} fz={18} fw={600} c="white" lh="md" ta="center">
            No posts yet. The first story is on its way!
          </Title>
        </Box>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
          {(posts ?? []).map((post) => (
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
      )}
    </Container>
  );
}
