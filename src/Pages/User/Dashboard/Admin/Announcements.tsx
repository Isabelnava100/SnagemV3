import { Stack, Switch, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { v4 as uuid } from "uuid";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import {
  Announcement,
  getAnnouncement,
  saveAnnouncement,
} from "../../../../queries/announcements";

/**
 * Admin editor for the dashboard's "Important Announcement!" banner.
 * Saving regenerates the announcement id, so everyone's "Mark as Read"
 * state resets whenever the content changes.
 */
export default function Announcements() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["announcement"],
    queryFn: getAnnouncement,
  });

  const [form, setForm] = React.useState<Announcement | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (isPending || form) return;
    setForm(
      data ?? { id: "", title: "", body: "", ctaLabel: "", ctaUrl: "", active: false }
    );
  }, [data, isPending, form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await saveAnnouncement({ ...form, id: uuid() });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["announcement"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const setField = (field: keyof Announcement, value: string | boolean) => {
    setSaved(false);
    setForm({ ...form, [field]: value } as Announcement);
  };

  return (
    <Stack maw={560}>
      <Title order={2} size={24} c="white" fw={400}>
        Dashboard Announcement
      </Title>
      <Text fz={13} c="dimmed">
        Shown at the top of everyone&apos;s Snag Dashboard until they mark it as read. Saving
        resets everyone&apos;s read state.
      </Text>
      <TextInput
        label="Title"
        value={form.title}
        onChange={(e) => setField("title", e.currentTarget.value)}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <Textarea
        label="Body"
        autosize
        minRows={3}
        value={form.body}
        onChange={(e) => setField("body", e.currentTarget.value)}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <TextInput
        label="Button label (optional)"
        value={form.ctaLabel ?? ""}
        onChange={(e) => setField("ctaLabel", e.currentTarget.value)}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <TextInput
        label="Button link (optional, e.g. /Forum/Events)"
        value={form.ctaUrl ?? ""}
        onChange={(e) => setField("ctaUrl", e.currentTarget.value)}
        styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
      />
      <Switch
        label="Active (visible on dashboards)"
        color="green.0"
        checked={form.active}
        onChange={(e) => setField("active", e.currentTarget.checked)}
        styles={{ label: { color: "white" } }}
      />
      {saved && (
        <Text fz={13} c="green.0">
          Announcement saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        disabled={!form.title.trim() || !form.body.trim()}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save Announcement
      </GradientButtonPrimary>
    </Stack>
  );
}
