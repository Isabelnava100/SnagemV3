import { Container, Divider, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Navigate } from "react-router-dom";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { DISCORD_CLIENT_ID, DiscordConfig, discordRedirectUri, getDiscordConfig, saveDiscordConfig } from "../../../queries/discord";
import { hasCapability, isAdmin } from "../../../lib/permissions";
import SEO from "./Admin/SEO";

/** Admin-only Discord integration config (client secret + channel webhook). */
function DiscordConfigSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["discord-config"], queryFn: getDiscordConfig });
  const [form, setForm] = React.useState<DiscordConfig | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const save = useMutation({
    mutationFn: () => saveDiscordConfig(form!),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["discord-config"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  return (
    <Stack gap={10} maw={640}>
      <Title order={2} c="white" size={24} fw={400}>
        Discord
      </Title>
      <Text fz={13} c="dimmed">
        Connects the site to your Discord server. The client id is set in the
        site's environment ({DISCORD_CLIENT_ID ? "configured" : "not set yet"}); the
        client secret and channel webhook are stored here, admin-only. In the
        Discord app, add this OAuth redirect URL: {discordRedirectUri()}
      </Text>
      <PasswordInput
        label="OAuth client secret"
        description="From the Discord app's OAuth2 page. Used server-side to link accounts."
        value={form.clientSecret}
        onChange={(e) => {
          setSaved(false);
          setForm({ ...form, clientSecret: e.currentTarget.value });
        }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <TextInput
        label="Channel webhook URL"
        description="Channel Settings -> Integrations -> Webhooks. New roleplays post here."
        value={form.webhookUrl}
        onChange={(e) => {
          setSaved(false);
          setForm({ ...form, webhookUrl: e.currentTarget.value });
        }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      {saved && (
        <Text fz={13} c="green.0" role="status" aria-live="polite">
          Discord settings saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={save.isPending}
        onClick={() => save.mutateAsync()}
      >
        Save Discord Settings
      </GradientButtonPrimary>
    </Stack>
  );
}

/**
 * Site Settings: a standalone page (outside the admin tools tabs) for
 * site-wide configuration. Admins, and directors granted ManageSEO, can view
 * it. Hosts the SEO / search settings; Discord config is admin-only.
 */
export default function SiteSettings() {
  const { user } = useAuth();
  const canView = isAdmin(user) || hasCapability(user, Capability.ManageSEO);
  if (!canView) return <Navigate to="/Dashboard" replace />;

  return (
    <Container size="md" py={{ base: 24, sm: 32 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={16}>
        <Title order={1} c="white" size={30} fw={600}>
          Site Settings
        </Title>
        <SEO />
        {isAdmin(user) && (
          <>
            <Divider color="#4a464a" />
            <DiscordConfigSection />
          </>
        )}
      </Stack>
    </Container>
  );
}
