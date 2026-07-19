import {
  Button,
  Container,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Seo from "../../components/common/Seo";
import Editor, { useRichTextEditor } from "../../components/editor/Editor";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../lib/auditLog";
import { isAdmin } from "../../lib/permissions";
import {
  deleteBlogPost,
  getPost,
  saveBlogPost,
  slugify,
} from "../../queries/blog";

const inputStyles = { input: { background: "#2E2D2E" } };

/**
 * Admin blog editor (also handles /Blog/edit/new). SEO fields are
 * first-class: the title doubles as the meta title (60 char cap) and the
 * description as the meta description (160 cap), so every post ships
 * optimized without a separate SEO form.
 */
export default function BlogEdit() {
  const { slug } = useParams();
  const isNew = slug === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: post, isPending } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => getPost(slug!),
    enabled: !!slug && !isNew,
  });

  const [title, setTitle] = React.useState("");
  const [postSlug, setPostSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [author, setAuthor] = React.useState("The Snagem Guild");
  const [published, setPublished] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  const editor = useRichTextEditor({
    content: loaded || isNew ? undefined : post?.content,
  });

  React.useEffect(() => {
    if (isNew || !post || loaded) return;
    setTitle(post.title);
    setPostSlug(post.id);
    setDescription(post.description);
    setCoverImageUrl(post.coverImageUrl ?? "");
    setAuthor(post.author);
    setPublished(post.published);
    editor?.commands.setContent(post.content);
    setLoaded(true);
  }, [post, isNew, loaded, editor]);

  const save = useMutation({
    mutationFn: async () => {
      const finalSlug = isNew ? slugify(postSlug || title) : slug!;
      if (!finalSlug) throw new Error("A slug is required.");
      if (!title.trim()) throw new Error("A title is required.");
      if (description.trim().length < 50 || description.trim().length > 160) {
        throw new Error("The description must be 50 to 160 characters (it is the meta description).");
      }
      await saveBlogPost(
        finalSlug,
        {
          title: title.trim(),
          description: description.trim(),
          content: editor?.getHTML() ?? "",
          coverImageUrl: coverImageUrl.trim(),
          author: author.trim() || "The Snagem Guild",
          published,
        },
        isNew,
      );
      await logAuditEvent({
        action: "blog.edit",
        ...actorFrom(user),
        targetPath: `blogPosts/${finalSlug}`,
        details: { title: title.trim(), published },
      });
      return finalSlug;
    },
    onSuccess: (finalSlug) => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-post", finalSlug] });
      navigate(`/Blog/${finalSlug}`);
    },
    onError: (e) => setStatus(e instanceof Error ? e.message : "Could not save the post."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await deleteBlogPost(slug!);
      await logAuditEvent({
        action: "blog.delete",
        ...actorFrom(user),
        targetPath: `blogPosts/${slug}`,
        details: { title },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      navigate("/Blog");
    },
    onError: () => setStatus("Could not delete the post."),
  });

  if (!isAdmin(user)) return <Navigate to="/Blog" replace />;
  if (!isNew && isPending) {
    return (
      <Container size="md" mt={40}>
        <SectionLoader />
      </Container>
    );
  }

  return (
    <Container size="md" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo noindex title={isNew ? "New Blog Post | Snagem Guild" : "Edit Blog Post | Snagem Guild"} />
      <Stack gap={14}>
        <Title order={1} c="white" fw={600} fz={30}>
          {isNew ? "Write a New Post" : "Edit Post"}
        </Title>
        <Title order={2} fz={14} fw={400} c="dimmed" lh="md">
          The title and description below are also the post's search listing, so
          make them count.
        </Title>

        <TextInput
          label="Title"
          description="Doubles as the meta title. 60 characters max."
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            if (isNew && !slugTouched) setPostSlug(slugify(e.currentTarget.value));
          }}
          maxLength={60}
          required
          styles={inputStyles}
        />
        <TextInput
          label="URL slug"
          description={
            isNew
              ? "Becomes the address: snagemguild.com/Blog/your-slug. Lowercase and dashes only."
              : "The slug cannot change after creation (it is the post's permanent URL)."
          }
          value={postSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setPostSlug(slugify(e.currentTarget.value));
          }}
          disabled={!isNew}
          required
          styles={inputStyles}
        />
        <Textarea
          label="Description"
          description={`Doubles as the meta description. 50 to 160 characters (${description.trim().length} now).`}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={160}
          required
          styles={inputStyles}
        />
        <TextInput
          label="Cover image URL"
          description="Optional. WebP preferred, 1200x630 also serves as the share image."
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.currentTarget.value)}
          styles={inputStyles}
        />
        <TextInput
          label="Author"
          value={author}
          onChange={(e) => setAuthor(e.currentTarget.value)}
          styles={inputStyles}
        />

        <Text fz={14} fw={500} c="white">
          Post content
        </Text>
        <Editor editor={editor} />

        <Switch
          label="Published (visible to the world and listed in the blog sitemap)"
          checked={published}
          onChange={(e) => setPublished(e.currentTarget.checked)}
          color="green"
        />

        {status && (
          <Text fz={14} c="red.4" role="status" aria-live="polite">
            {status}
          </Text>
        )}

        <Group gap={10}>
          <Button radius="xl" color="grape" loading={save.isPending} onClick={() => save.mutate()}>
            {published ? "Save & Publish" : "Save Draft"}
          </Button>
          {!isNew && (
            <Button
              radius="xl"
              variant="outline"
              color="red"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm("Delete this post permanently?")) remove.mutate();
              }}
            >
              Delete Post
            </Button>
          )}
        </Group>
      </Stack>
    </Container>
  );
}
