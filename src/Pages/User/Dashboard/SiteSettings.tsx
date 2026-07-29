import {
  Button,
  Container,
  Divider,
  Group,
  NumberInput,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Navigate } from "react-router-dom";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { toastError } from "../../../lib/toast";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { DiscordConfig, discordRedirectUri, getDiscordConfig, saveDiscordConfig } from "../../../queries/discord";
import {
  DonationConfig,
  getDonationConfig,
  saveDonationConfig,
} from "../../../queries/donations";
import {
  EmailConfig,
  MailOutboxItem,
  deleteMailItem,
  getEmailConfig,
  getMailOutbox,
  markMailHandled,
  saveEmailConfig,
} from "../../../queries/email";
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
    onError: (e) => toastError(e, "Could not save the email settings."),
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
        Sends applicants an email when their registration is approved or rejected (they cannot see
        in-app notifications before their first login). Uses SendGrid: create an account, add an
        API key with Mail Send permission, and verify the sender address there.
      </Text>
      <Text fz={14} c="dimmed">
        This is optional. With no key saved, or if the subscription is cancelled later, approvals
        and rejections still work: each notice is recorded in full under Unsent notices below for
        staff to send by hand from the guild address.
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

/** Admin-only Discord integration config (client id, client secret + channel webhook). */
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
    onError: (e) => toastError(e, "Could not save the Discord settings."),
  });

  if (isPending || !form) return <SectionLoader />;

  return (
    <Stack gap={10} maw={640}>
      <Title order={2} c="white" size={28} fw={400}>
        Discord
      </Title>
      <Text fz={14} c="dimmed">
        Connects the site to your Discord server. The OAuth client id, client
        secret and channel webhook are stored here, admin-only, and used
        server-side to link accounts. In the Discord app, add this OAuth
        redirect URL: {discordRedirectUri()}
      </Text>
      <TextInput
        label="OAuth client id"
        description="From the Discord app's OAuth2 page. Safe to expose; stored here so the server never trusts a client-supplied id."
        value={form.clientId}
        onChange={(e) => {
          setSaved(false);
          setForm({ ...form, clientId: e.currentTarget.value });
        }}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
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

/** Strip the notice's HTML down to something an admin can paste into a mail client. */
function plainBody(html: string): string {
  return html
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Notices the server could not send, listed so staff can send them by hand.
 *
 * The site does not depend on SendGrid: if no key is saved (or the
 * subscription lapses and the key stops working) every approval and rejection
 * notice is still recorded in full, and shows up here with a mailto link and a
 * copyable body. Nobody is left without an answer because a bill went unpaid.
 */
function UnsentNoticesSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["mail-outbox"], queryFn: () => getMailOutbox(50) });
  const [copied, setCopied] = React.useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["mail-outbox"] });
  const handled = useMutation({ mutationFn: markMailHandled, onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteMailItem, onSuccess: refresh });

  const pending = (data ?? []).filter((m) => m.status === "queued" || m.status === "failed");

  const copy = async (item: MailOutboxItem) => {
    await navigator.clipboard.writeText(`Subject: ${item.subject}\n\n${plainBody(item.html)}`);
    setCopied(item.id);
  };

  if (isPending) return <SectionLoader />;

  return (
    <Stack gap={10} maw={720}>
      <Title order={2} c="white" size={28} fw={400}>
        Unsent notices
      </Title>
      <Text fz={14} c="dimmed">
        Approval and rejection notices that could not be emailed, either because no provider is
        configured or because the send failed. Send them yourself from the guild address, then mark
        them done. This list is the reason the site keeps working without an email subscription.
      </Text>
      {pending.length === 0 ? (
        <Text fz={14} c="green.0" role="status" aria-live="polite">
          Nothing waiting. Every notice went out.
        </Text>
      ) : (
        pending.map((item) => (
          <Stack key={item.id} gap={6} p={12} style={{ background: "#2b2a2b", borderRadius: 10 }}>
            <Group justify="space-between" wrap="wrap" gap={8}>
              <Text c="white" fw={600} fz={14}>
                {item.subject}
              </Text>
              <Text fz={13} c={item.status === "failed" ? "#E54156" : "dimmed"}>
                {item.status === "failed" ? `Send failed: ${item.detail}` : "Not sent"}
              </Text>
            </Group>
            <Text fz={13} c="dimmed">
              To: {item.to}
            </Text>
            <Text fz={13} c="rgba(255,255,255,0.75)" style={{ whiteSpace: "pre-wrap" }}>
              {plainBody(item.html)}
            </Text>
            <Group gap={8} wrap="wrap">
              <Button
                size="compact-sm"
                variant="light"
                component="a"
                href={`mailto:${item.to}?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(plainBody(item.html))}`}
              >
                Open in mail app
              </Button>
              <Button size="compact-sm" variant="default" onClick={() => copy(item)}>
                {copied === item.id ? "Copied" : "Copy text"}
              </Button>
              <Button
                size="compact-sm"
                variant="subtle"
                loading={handled.isPending && handled.variables === item.id}
                onClick={() => handled.mutate(item.id)}
              >
                Mark as sent
              </Button>
              <Button
                size="compact-sm"
                variant="subtle"
                color="red"
                loading={remove.isPending && remove.variables === item.id}
                onClick={() => remove.mutate(item.id)}
              >
                Discard
              </Button>
            </Group>
          </Stack>
        ))
      )}
    </Stack>
  );
}

/**
 * Admin-only donation config for the Library's Support the Guild wing. Read by
 * the public page, so keep every field here non-secret: PayPal hosted button
 * ids and share links are meant to be seen.
 */
function DonationConfigSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["donation-config"],
    queryFn: getDonationConfig,
  });
  const [form, setForm] = React.useState<DonationConfig | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const save = useMutation({
    mutationFn: () => saveDonationConfig(form!),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["donation-config"] });
    },
    onError: (e) => toastError(e, "Could not save the donation settings."),
  });

  if (isPending || !form) return <SectionLoader />;

  const set = (patch: Partial<DonationConfig>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };
  const inputStyles = { input: { background: "#2E2D2E" }, label: { color: "white" } };

  return (
    <Stack gap={10} maw={640}>
      <Title order={2} c="white" size={28} fw={400}>
        Donations
      </Title>
      <Text fz={14} c="dimmed">
        Powers Library, Support the Guild. The cost table on that page is fixed in code; the goal
        tiers, the raised total and the PayPal links come from here. Nothing appears on the public
        page until at least one PayPal link or button id is filled in.
      </Text>
      <Switch
        checked={form.enabled}
        onChange={(e) => set({ enabled: e.currentTarget.checked })}
        label="Show the donate controls"
        description="Off keeps the costs and goal visible but hides every PayPal button."
      />
      <TextInput
        label="PayPal hosted button id"
        description="From the PayPal Donate button generator. Renders PayPal's own button in the page."
        value={form.paypalHostedButtonId}
        onChange={(e) => set({ paypalHostedButtonId: e.currentTarget.value })}
        styles={inputStyles}
      />
      <TextInput
        label="One-time donate link"
        description="A PayPal.me or hosted donate URL. Shown as a plain link, and used by anyone blocking scripts."
        placeholder="https://www.paypal.com/donate/?hosted_button_id=..."
        value={form.paypalDonateUrl}
        onChange={(e) => set({ paypalDonateUrl: e.currentTarget.value })}
        styles={inputStyles}
      />
      <TextInput
        label="Monthly subscribe link"
        description="The subscribe link for the recurring plan created in PayPal."
        placeholder="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=..."
        value={form.paypalSubscribeUrl}
        onChange={(e) => set({ paypalSubscribeUrl: e.currentTarget.value })}
        styles={inputStyles}
      />
      <Group gap={10} align="end" wrap="wrap">
        <NumberInput
          label="Minimum monthly"
          description="In dollars."
          min={1}
          w={150}
          value={form.minMonthly}
          onChange={(v) => set({ minMonthly: Number(v) || 0 })}
          styles={inputStyles}
        />
        <NumberInput
          label="Goal: essentials"
          min={0}
          w={150}
          value={form.goalEssentials}
          onChange={(v) => set({ goalEssentials: Number(v) || 0 })}
          styles={inputStyles}
        />
        <NumberInput
          label="Goal: art"
          min={0}
          w={150}
          value={form.goalGrowth}
          onChange={(v) => set({ goalGrowth: Number(v) || 0 })}
          styles={inputStyles}
        />
        <NumberInput
          label="Goal: stretch"
          min={0}
          w={150}
          value={form.goalStretch}
          onChange={(v) => set({ goalStretch: Number(v) || 0 })}
          styles={inputStyles}
        />
      </Group>
      <Group gap={10} align="end" wrap="wrap">
        <NumberInput
          label="Raised so far"
          description="Typed in by hand until the PayPal sync is built."
          min={0}
          w={190}
          value={form.raised}
          onChange={(v) => set({ raised: Number(v) || 0 })}
          styles={inputStyles}
        />
        <TextInput
          label="Total updated on"
          placeholder="29 July 2026"
          w={190}
          value={form.raisedUpdated}
          onChange={(e) => set({ raisedUpdated: e.currentTarget.value })}
          styles={inputStyles}
        />
        <TextInput
          label="Year shown"
          placeholder="2026"
          w={120}
          value={form.year}
          onChange={(e) => set({ year: e.currentTarget.value })}
          styles={inputStyles}
        />
      </Group>
      {saved && (
        <Text fz={14} c="green.0" role="status" aria-live="polite">
          Donation settings saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={save.isPending}
        onClick={() => save.mutateAsync()}
      >
        Save Donation Settings
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
            <Divider color="#4a464a" />
            <UnsentNoticesSection />
            <Divider color="#4a464a" />
            <DonationConfigSection />
          </>
        )}
      </Stack>
    </Container>
  );
}
