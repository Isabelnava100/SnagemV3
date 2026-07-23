import {
  Box,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../../../context/AuthContext";

/**
 * Email template builder: staff compose branded HTML emails (announcements,
 * registration welcomes, and so on) with a live preview, then copy the HTML
 * into whatever sender is used. Templates save to admin/email_templates.
 *
 * Email HTML best practice baked in: table layout, fully inlined styles,
 * system font stack, a bulletproof button, dark brand theme, and a 640px
 * default width (wider than ~660px risks clipping in Gmail; the width is
 * editable for anyone who wants the full 800).
 */

interface EmailTemplate {
  subject: string;
  preheader: string;
  title: string;
  body: string;
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  width: number;
}

const BLANK: EmailTemplate = {
  subject: "",
  preheader: "",
  title: "",
  body: "",
  imageUrl: "",
  buttonLabel: "",
  buttonUrl: "https://snagemguild.com",
  width: 640,
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Render the brand email HTML (dark theme, table layout, inline styles). */
export function renderEmailHtml(t: EmailTemplate): string {
  const width = Math.max(320, Math.min(800, t.width || 640));
  const paragraphs = t.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#d9d4de;">${esc(p).replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(t.subject || "Snagem Guild")}</title>
</head>
<body style="margin:0;padding:0;background-color:#141318;">
<!-- Preheader: shows next to the subject in the inbox, hidden in the body -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(t.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#141318;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="max-width:${width}px;width:100%;background-color:#1E1D20;border:1px solid #3a3550;border-radius:16px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td style="background:linear-gradient(120deg,#3a1d63 0%,#2c2352 55%,#1c2a4a 100%);padding:24px 32px;">
      <span style="font-size:12px;font-weight:700;letter-spacing:3px;color:#C17DC1;text-transform:uppercase;">Snagem Guild</span>
    </td></tr>
    ${
      t.imageUrl
        ? `<tr><td><img src="${esc(t.imageUrl)}" alt="" width="${width}" style="display:block;width:100%;height:auto;"/></td></tr>`
        : ""
    }
    <tr><td style="padding:32px;">
      ${t.title ? `<h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;">${esc(t.title)}</h1>` : ""}
      ${paragraphs}
      ${
        t.buttonLabel
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="border-radius:999px;background:#772976;">
             <a href="${esc(t.buttonUrl)}" style="display:inline-block;padding:14px 34px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(t.buttonLabel)}</a>
             </td></tr></table>`
          : ""
      }
    </td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid #2a2637;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8494;">
        You are receiving this because you are a member of the Snagem Guild.
        Manage email updates under Settings &gt; Notifications on
        <a href="https://snagemguild.com" style="color:#C17DC1;">snagemguild.com</a>.
        Account emails such as password resets are always delivered.
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

async function fetchTemplates(): Promise<Record<string, EmailTemplate>> {
  const { getDoc, doc } = await import("firebase/firestore");
  const { getDb } = await import("../../../../context/firebase");
  const db = await getDb();
  return ((await getDoc(doc(db, "admin", "email_templates"))).data() ??
    {}) as Record<string, EmailTemplate>;
}

export default function EmailTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("announcement");
  const [form, setForm] = React.useState<EmailTemplate>({ ...BLANK });
  const [status, setStatus] = React.useState("");

  const { data: templates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: fetchTemplates,
    enabled: !!user,
  });
  const set = (patch: Partial<EmailTemplate>) => {
    setStatus("");
    setForm((f) => ({ ...f, ...patch }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const { setDoc, doc } = await import("firebase/firestore");
      const { getDb } = await import("../../../../context/firebase");
      const db = await getDb();
      const key = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "template";
      await setDoc(doc(db, "admin", "email_templates"), { [key]: form }, { merge: true });
      return key;
    },
    onSuccess: (key) => {
      setStatus(`Saved as "${key}".`);
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (e) => setStatus((e as Error).message || "Could not save the template."),
  });

  const html = renderEmailHtml(form);
  const savedNames = Object.keys(templates ?? {});

  return (
    <Stack gap={14}>
      <Text fz={14} c="dimmed" maw={720}>
        Build a branded email and watch the live preview. Save templates for reuse, or
        Copy HTML to paste into your email sender. Default width is 640px: wider than
        about 660px risks Gmail clipping the layout, but you can raise it up to 800.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={20}>
        <Stack gap={10}>
          <Group gap={8} align="flex-end">
            <TextInput
              label="Template name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              w={200}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            {savedNames.length > 0 && (
              <Select
                label="Load saved"
                placeholder="Pick one"
                data={savedNames}
                value={null}
                onChange={(key) => {
                  if (!key || !templates?.[key]) return;
                  setName(key);
                  setForm({ ...BLANK, ...templates[key] });
                  setStatus(`Loaded "${key}".`);
                }}
                w={180}
                styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
              />
            )}
          </Group>
          <TextInput
            label="Subject"
            placeholder="A new event opens this weekend!"
            value={form.subject}
            onChange={(e) => set({ subject: e.currentTarget.value })}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <TextInput
            label="Preheader"
            description="The short line inboxes show next to the subject."
            value={form.preheader}
            onChange={(e) => set({ preheader: e.currentTarget.value })}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <TextInput
            label="Hero image URL (optional)"
            placeholder="https://... (full-width banner)"
            value={form.imageUrl}
            onChange={(e) => set({ imageUrl: e.currentTarget.value })}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <TextInput
            label="Title"
            placeholder="The Safari Contest returns"
            value={form.title}
            onChange={(e) => set({ title: e.currentTarget.value })}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <Textarea
            label="Body"
            description="Plain text; blank lines split paragraphs."
            autosize
            minRows={6}
            value={form.body}
            onChange={(e) => set({ body: e.currentTarget.value })}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <Group gap={8} grow>
            <TextInput
              label="Button label (optional)"
              value={form.buttonLabel}
              onChange={(e) => set({ buttonLabel: e.currentTarget.value })}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
            <TextInput
              label="Button link"
              value={form.buttonUrl}
              onChange={(e) => set({ buttonUrl: e.currentTarget.value })}
              styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
            />
          </Group>
          <NumberInput
            label="Width (px)"
            min={320}
            max={800}
            value={form.width}
            onChange={(v) => set({ width: typeof v === "number" ? v : 640 })}
            w={140}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <Group gap={8}>
            <Button radius="xl" color="grape" loading={save.isPending} onClick={() => save.mutate()}>
              Save Template
            </Button>
            <Button
              radius="xl"
              variant="light"
              color="cyan"
              onClick={async () => {
                await navigator.clipboard.writeText(html);
                setStatus("HTML copied to your clipboard.");
              }}
            >
              Copy HTML
            </Button>
          </Group>
          {status && (
            <Text fz={14} c="cyan.0" role="status" aria-live="polite">
              {status}
            </Text>
          )}
        </Stack>

        <Stack gap={6}>
          <Title order={3} c="white" size={20} fw={600}>
            Live preview
          </Title>
          <Box
            style={{
              borderRadius: 12,
              border: "1px solid #232028",
              overflow: "hidden",
              background: "#141318",
              minHeight: 480,
            }}
          >
            <iframe
              title="Email preview"
              srcDoc={html}
              style={{ width: "100%", height: 560, border: 0, display: "block" }}
            />
          </Box>
          <Text fz={14} c="dimmed">
            Sending is manual for now: copy the HTML into your mailer. When a sending
            service is wired up, it should skip members who turned off "Receive
            information via Email" (password resets are handled by Firebase Auth and
            always send).
          </Text>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
