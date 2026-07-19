import { Anchor, Code, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { INDEXABLE_ROUTES, SITE_URL } from "../../../../lib/seo";
import { SEOSettings, getSEOSettings, saveSEOSettings } from "../../../../queries/seo";

/**
 * Admin/ManageSEO panel. Meta titles, descriptions, canonicals, robots
 * directives, structured data and the sitemap are all AUTOMATIC now (the SEO
 * engine in src/lib/seo.ts assigns them per page; threads even get "Page X"
 * titles and first-post descriptions). The only editable knobs left are the
 * sitewide social share standardization. The read-only table below shows
 * what every indexable page currently serves.
 */
export default function SEO() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["seo-settings"], queryFn: getSEOSettings });

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
        details: { ogImageUrl: form.ogImageUrl, twitterHandle: form.twitterHandle },
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const inputStyles = { input: { background: "#2E2D2E" }, label: { color: "white" } };

  return (
    <Stack gap={14} maw={860}>
      <Title order={2} c="white" size={28} fw={400}>
        SEO &amp; Search
      </Title>
      <Text fz={14} c="dimmed">
        Titles, descriptions, canonical tags, robots rules, structured data and the
        sitemap are handled automatically for every page (threads get their thread
        name plus &quot;Page X&quot;, and their description comes from the first
        post). Private areas (forums, dashboards, member profiles) are kept out of
        search entirely. The two settings below are the sitewide social share
        standards; everything else needs no upkeep.
      </Text>

      <TextInput
        label="Social share image URL"
        description="One image for every link preview (Facebook, Discord, X). Absolute URL; 1200x630 recommended."
        value={form.ogImageUrl}
        onChange={(e) => {
          setSaved(false);
          setForm({ ...form, ogImageUrl: e.currentTarget.value });
        }}
        placeholder="https://snagemguild.com/share-card.png"
        styles={inputStyles}
      />

      <TextInput
        label="X (Twitter) handle"
        description="Include the @. Shown as the site attribution on X share cards."
        value={form.twitterHandle}
        onChange={(e) => {
          setSaved(false);
          setForm({ ...form, twitterHandle: e.currentTarget.value });
        }}
        placeholder="@snagemguild"
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

      <Title order={3} c="white" size={20} fw={600} mt={10}>
        What every page serves (automatic)
      </Title>
      <Text fz={14} c="dimmed">
        The indexable pages below are exactly what the sitemap publishes
        (<Code>{SITE_URL}/sitemap.xml</Code>, regenerated on every deploy).
        Descriptions are clamped to 160 characters, titles to 70. To change one,
        edit <Code>src/lib/seoRoutes.json</Code> in the codebase; new pages added
        there are picked up by the sitemap and the head engine automatically.
      </Text>
      <Table.ScrollContainer minWidth={640}>
        <Table withTableBorder withColumnBorders fz={13}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Page</Table.Th>
              <Table.Th>Meta title</Table.Th>
              <Table.Th>Meta description</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {INDEXABLE_ROUTES.map((r) => (
              <Table.Tr key={r.path}>
                <Table.Td>
                  <Anchor href={r.path} fz={13} c="blue.3">
                    {r.path}
                  </Anchor>
                </Table.Td>
                <Table.Td>{r.title}</Table.Td>
                <Table.Td c="dimmed">{r.description}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
