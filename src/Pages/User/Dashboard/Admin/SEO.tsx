import { Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { SEOSettings, getSEOSettings, saveSEOSettings } from "../../../../queries/seo";

/**
 * Admin/ManageSEO editor for the site-wide SEO defaults. This is the starting
 * scaffold: it stores the standard meta and social-share fields at admin/seo.
 * How these get applied for crawlers, plus any per-page overrides, is a later
 * pass once the SEO approach is settled.
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
        details: { siteTitle: form.siteTitle },
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
      <Title order={2} c="white" size={24} fw={400}>
        SEO Settings
      </Title>
      <Text fz={13} c="dimmed">
        These are the site's default search and social-share details. They set the
        browser tab title, the description that shows up in search results, and the
        preview card people see when a link is shared. Page-specific overrides come
        in a later update.
      </Text>

      <TextInput
        label="Site title"
        description="Shown in the browser tab and used as the default page title."
        value={form.siteTitle}
        onChange={(e) => setField("siteTitle", e.currentTarget.value)}
        maxLength={70}
        styles={inputStyles}
      />

      <TextInput
        label="Title suffix"
        description="Added after page names, for example ' | Snagem Guild'."
        value={form.titleSuffix}
        onChange={(e) => setField("titleSuffix", e.currentTarget.value)}
        maxLength={40}
        styles={inputStyles}
      />

      <Textarea
        label="Meta description"
        description="The summary search engines show. Aim for 150 to 160 characters."
        value={form.metaDescription}
        onChange={(e) => setField("metaDescription", e.currentTarget.value)}
        autosize
        minRows={2}
        maxLength={200}
        styles={inputStyles}
      />

      <TextInput
        label="Keywords"
        description="Comma-separated. Optional, most engines ignore these now."
        value={form.keywords}
        onChange={(e) => setField("keywords", e.currentTarget.value)}
        styles={inputStyles}
      />

      <TextInput
        label="Canonical URL"
        description="The site's primary address, for example https://snagemguild.com."
        value={form.canonicalUrl}
        onChange={(e) => setField("canonicalUrl", e.currentTarget.value)}
        styles={inputStyles}
      />

      <TextInput
        label="Social share image URL"
        description="Absolute URL of the default preview image. 1200x630 works best."
        value={form.ogImageUrl}
        onChange={(e) => setField("ogImageUrl", e.currentTarget.value)}
        styles={inputStyles}
      />

      <TextInput
        label="Twitter/X handle"
        description="Include the @, for example @snagemguild."
        value={form.twitterHandle}
        onChange={(e) => setField("twitterHandle", e.currentTarget.value)}
        styles={inputStyles}
      />

      {saved && (
        <Text fz={13} c="green.0" role="status" aria-live="polite">
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
