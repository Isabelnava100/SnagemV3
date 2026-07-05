import {
  Badge,
  Button,
  Divider,
  Group,
  Popover,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconTrash } from "@tabler/icons-react";
import React from "react";
import { v4 as uuid } from "uuid";
import GradientButtonPrimary from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { useAuth } from "../../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import {
  Announcement,
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementHistory,
  saveAnnouncement,
} from "../../../../queries/announcements";

/**
 * Admin editor for the dashboard's "Important Announcement!" banner.
 * Saving regenerates the announcement id, so everyone's "Mark as Read"
 * state resets whenever the content changes.
 */
export default function Announcements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["announcement"],
    queryFn: getAnnouncement,
  });

  const [form, setForm] = React.useState<Announcement | null>(null);
  const [sent, setSent] = React.useState(false);

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
      await logAuditEvent({
        action: "announcement.edit",
        ...actorFrom(user),
        targetPath: "admin/announcements",
        details: { title: form.title, active: form.active },
      });
    },
    onSuccess: () => {
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["announcement"] });
      queryClient.invalidateQueries({ queryKey: ["announcement-history"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const setField = (field: keyof Announcement, value: string | boolean) => {
    setSent(false);
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
      {sent && (
        <Text fz={13} c="green.0" fw={600}>
          Announcement Sent!
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

      <Divider my={8} color="#3C3A3C" />
      <AnnouncementHistory liveId={data?.id ?? null} />
    </Stack>
  );
}

/** Log of everything sent previously, with a delete/cancel action per entry. */
function AnnouncementHistory(props: { liveId: string | null }) {
  const { data: history, isPending } = useQuery({
    queryKey: ["announcement-history"],
    queryFn: getAnnouncementHistory,
  });

  return (
    <Stack gap={10}>
      <Title order={3} size={16} c="white" fw={700} tt="uppercase">
        Sent Announcements
      </Title>
      {isPending ? (
        <SectionLoader />
      ) : !history || history.length === 0 ? (
        <EmptyMessage
          title="No announcements yet"
          description="Announcements you send will show up here."
        />
      ) : (
        <Stack gap={8}>
          {history.map((item) => (
            <HistoryRow key={item.id} item={item} isLive={item.id === props.liveId} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function HistoryRow(props: { item: Announcement; isLive: boolean }) {
  const { item, isLive } = props;
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteAnnouncement(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement"] });
      queryClient.invalidateQueries({ queryKey: ["announcement-history"] });
    },
  });

  const sentOn =
    typeof item.savedAt === "number"
      ? new Date(item.savedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <Group
      align="flex-start"
      justify="space-between"
      wrap="nowrap"
      gap={8}
      p={12}
      style={{ background: "#1E1D2080", borderRadius: 8 }}
    >
      <Stack gap={4} style={{ minWidth: 0 }}>
        <Group gap={8} wrap="nowrap">
          <Text fz={15} fw={600} c="white" lineClamp={1}>
            {item.title || "Untitled"}
          </Text>
          {isLive && item.active ? (
            <Badge color="green.0" variant="filled" size="sm">
              Live
            </Badge>
          ) : null}
        </Group>
        <Text fz={13} c="dimmed" lineClamp={2}>
          {item.body}
        </Text>
        {sentOn && (
          <Text fz={11} c="dimmed">
            Sent {sentOn}
          </Text>
        )}
      </Stack>
      <DeleteConfirm
        isLive={isLive}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </Group>
  );
}

function DeleteConfirm(props: { isLive: boolean; loading: boolean; onConfirm: () => void }) {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Popover withArrow position="bottom-end" opened={opened} onClose={close}>
      <Popover.Target>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          onClick={open}
          leftSection={<IconTrash size={16} />}
          style={{ flexShrink: 0 }}
        >
          Delete
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={10}>
          <Text fz={13}>
            {props.isLive
              ? "This is live on dashboards. Deleting will also remove the banner. Continue?"
              : "Delete this announcement from the history?"}
          </Text>
          <Group gap={8}>
            <Button
              size="xs"
              color="red"
              loading={props.loading}
              onClick={() => {
                props.onConfirm();
                close();
              }}
            >
              {props.isLive ? "Delete & Cancel" : "Delete"}
            </Button>
            <Button size="xs" color="gray" variant="light" onClick={close}>
              Keep
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
