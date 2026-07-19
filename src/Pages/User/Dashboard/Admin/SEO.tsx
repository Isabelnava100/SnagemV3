import { List, Stack, Text, TextInput, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { DEFAULT_OG_IMAGE } from "../../../../lib/seo/site";
import { SEOSettings, getSEOSettings, saveSEOSettings } from "../../../../queries/seo";

/**
 * Site Settings SEO panel. Titles, descriptions, canonicals, robots, the
 * sitemap, and structured data are all assigned automatically (Seo component
 * plus src/lib/seo/pages.json plus scripts/gen-sitemap.mjs), so this panel
 * only manages the standardized social share images and the X handle.
 */
export default function SEO() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: getSEOSettings,
  });

  const [form, setForm] = React.useState<SEOSettings | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (isPending || form || !data) return;
    setForm(data);
  }, [data, isPending, form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await saveSEOSettings(form);
      await logAuditEvent({
        action: "seo.edit",
        ...actorFrom(user),
        targetPath: "admin/seo",
        details: { ogImageUrl: form.ogImageUrl },
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const setField = (field: keyof SEOSettings, value: string) => {
    setSaved(false);
    setForm({ ...form, [field]: value });
  };

  const inputStyles = { input: { background: "#2E2D2E" } };

  return (
    <Stack gap={14} maw={640}>
      <Title order={2} c="white" size={28} fw={400}>
        SEO &amp; Search
      </Title>
      <Text fz={14} c="dimmed">
        Search engine details are handled automatically, so there is nothing to
        fill in for them here:
      </Text>
      <List fz={14} c="dimmed" spacing={4}>
        <List.Item>
          Every page gets a unique meta title (60 characters max) and meta
          description; threads use their thread name and the first post's text,
          with "Page X" added on paginated pages.
        </List.Item>
        <List.Item>
          Canonical tags, robots rules, and structured data (WebPage, FAQ,
          forum post schemas) are assigned per page. Private pages are kept out
          of search results.
        </List.Item>
        <List.Item>
          sitemap.xml regenerates on every deploy from the main public pages;
          robots.txt and llms.txt live alongside it.
        </List.Item>
      </List>

      <Text fz={14} c="dimmed">
        The share images below are standardized site-wide: they are the preview
        card people see when any page is shared on Discord, X, Facebook, and
        friends. 1200x630 works best.
      </Text>

      <TextInput
        label="Social share image URL"
        description={`Used for all link previews. Leave blank for the default (${DEFAULT_OG_IMAGE}).`}
        value={form.ogImageUrl}
        onChange={(e) => setField("ogImageUrl", e.currentTarget.value)}
        placeholder={DEFAULT_OG_IMAGE}
        styles={inputStyles}
      />

      <TextInput
        label="X/Twitter share image URL"
        description="Optional X-specific image. Falls back to the social share image."
        value={form.twitterImageUrl}
        onChange={(e) => setField("twitterImageUrl", e.currentTarget.value)}
        styles={inputStyles}
      />

      <TextInput
        label="X/Twitter handle"
        description="Include the @, for example @snagemguild. Shown on X share cards."
        value={form.twitterHandle}
        onChange={(e) => setField("twitterHandle", e.currentTarget.value)}
        styles={inputStyles}
      />

      {saved && (
        <Text fz={14} c="green.0" role="status" aria-live="polite">
          SEO settings saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save SEO Settings
      </GradientButtonPrimary>
    </Stack>
  );
}
