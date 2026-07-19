import { Container, Divider, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Navigate } from "react-router-dom";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { DISCORD_CLIENT_ID, DiscordConfig, discordRedirectUri, getDiscordConfig, saveDiscordConfig } from "../../../queries/discord";
import { EmailConfig, getEmailConfig, saveEmailConfig } from "../../../queries/email";
import { hasCapability, isAdmin } from "../../../lib/permissions";
import SEO from "./Admin/SEO";

/** Admin-only transactional email config (approval/rejection notices). */
function EmailConfigSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["email-config"], queryFn: getEmailConfig });
  const [form, setForm] = React.useState<EmailConfig | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const save = useMutation({
    mutationFn: () => saveEmailConfig(form!),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["email-config"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const set = (patch: Partial<EmailConfig>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };

  return (
    <Stack gap={10} maw={640}>
      <Title order={2} c="white" size={28} fw={400}>
        Email notices
      </Title>
      <Text fz={14} c="dimmed">
        Sends applicants an email when their registration is approved or rejected (they
        cannot see in-app notifications before their first login). Uses SendGrid: create
        a free account, add an API key with Mail Send permission, and verify the sender
        address there. Until a key is saved, no emails are sent and approvals work as
        before.
      </Text>
      <PasswordInput
        label="SendGrid API key"
        description="From SendGrid, Settings, API Keys. Stored here admin-only; used server-side."
        value={form.sendgridApiKey}
        onChange={(e) => set({ sendgridApiKey: e.currentTarget.value })}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <TextInput
        label="From address"
        description="Must be a sender verified in SendGrid (for example noreply@snagemguild.com)."
        value={form.fromEmail}
        onChange={(e) => set({ fromEmail: e.currentTarget.value })}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <TextInput
        label="From name"
        placeholder="Snagem Guild"
        value={form.fromName}
        onChange={(e) => set({ fromName: e.currentTarget.value })}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      {saved && (
        <Text fz={14} c="green.0" role="status" aria-live="polite">
          Email settings saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={save.isPending}
        onClick={() => save.mutateAsync()}
      >
        Save Email Settings
      </GradientButtonPrimary>
    </Stack>
  );
}

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
      <Title order={2} c="white" size={28} fw={400}>
        Discord
      </Title>
      <Text fz={14} c="dimmed">
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
        <Text fz={14} c="green.0" role="status" aria-live="polite">
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
    <Container size="lg" py={{ base: 24, sm: 32 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={16}>
        <Title order={1} c="white" size={34} fw={600}>
          Site Settings
        </Title>
        <SEO />
        {isAdmin(user) && (
          <>
            <Divider color="#4a464a" />
            <DiscordConfigSection />
            <Divider color="#4a464a" />
            <EmailConfigSection />
          </>
        )}
      </Stack>
    </Container>
  );
}
