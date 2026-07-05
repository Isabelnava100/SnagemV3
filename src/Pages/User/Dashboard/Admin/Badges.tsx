import {
  Badge,
  Box,
  Button,
  ColorInput,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Popover } from "@mantine/core";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Capability } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { hasCapability, isAdmin } from "../../../../lib/permissions";
import {
  BadgeDef,
  assignBadgeToUsers,
  deleteBadge,
  getBadgeCatalog,
  saveBadge,
} from "../../../../queries/badges";
import { getUsers } from "../../../../queries/admin";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * A live preview of a badge. Rendered as a plain pill (not Mantine <Badge>,
 * which leaks its theme color at the rounded left cap) so the gradient is clean.
 */
function BadgePreview(props: { name: string; background: string }) {
  return (
    <Box
      style={{
        background: props.background,
        color: "white",
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1,
        padding: "7px 16px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {props.name || "Preview"}
    </Box>
  );
}

export default function Badges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = isAdmin(user) || hasCapability(user, Capability.ManageBadges);

  const { data: catalog, isPending } = useQuery({
    queryKey: ["badge-catalog"],
    queryFn: getBadgeCatalog,
  });

  // Editor form (used for both create and edit).
  const [editing, setEditing] = React.useState<BadgeDef | null>(null);
  const [name, setName] = React.useState("");
  const [background, setBackground] = React.useState("#762B77");
  const [description, setDescription] = React.useState("");
  const [message, setMessage] = React.useState("");

  const loadIntoForm = (badge: BadgeDef | null) => {
    setEditing(badge);
    setName(badge?.name ?? "");
    setBackground(badge?.background ?? "#762B77");
    setDescription(badge?.description ?? "");
    setMessage("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = editing?.id ?? slugify(name);
      if (!id) throw new Error("Give the badge a name.");
      await saveBadge({ id, name: name.trim(), background, description: description.trim() });
    },
    onSuccess: () => {
      setMessage(editing ? "Badge updated." : "Badge created.");
      loadIntoForm(null);
      queryClient.invalidateQueries({ queryKey: ["badge-catalog"] });
    },
    onError: (err) => setMessage((err as Error).message || "Could not save the badge."),
  });

  if (!canManage) {
    return (
      <Text c="white">You don&apos;t have permission to manage badges.</Text>
    );
  }
  if (isPending || !catalog) return <SectionLoader />;

  return (
    <Stack gap={20} maw={620}>
      <Title order={2} c="white" size={24} fw={400}>
        Badges
      </Title>

      {/* Create / edit */}
      <Stack gap={10} p={16} style={{ background: "#1E1D2080", borderRadius: 12 }}>
        <Group justify="space-between">
          <Text c="white" fw={600}>
            {editing ? `Edit "${editing.name}"` : "Create a badge"}
          </Text>
          {editing && (
            <Button size="xs" variant="subtle" color="gray" onClick={() => loadIntoForm(null)}>
              Cancel edit
            </Button>
          )}
        </Group>
        <Group align="flex-end" gap={10} wrap="wrap">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <ColorInput
            label="Background color"
            value={background}
            onChange={setBackground}
            format="hex"
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          <BadgePreview name={name} background={background} />
        </Group>
        {/* Advanced: defaults use gradients; allow a raw CSS background too. */}
        <TextInput
          label="Background (CSS — optional, supports gradients)"
          value={background}
          onChange={(e) => setBackground(e.currentTarget.value)}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <TextInput
          label="Description (how to obtain)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        {message && (
          <Text fz={13} c={message.includes("Could not") || message.includes("Give") ? "#E35C65" : "green.0"}>
            {message}
          </Text>
        )}
        <GradientButtonPrimary
          radius="xl"
          w="fit-content"
          disabled={!name.trim()}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutateAsync()}
        >
          {editing ? "Save Changes" : "Create Badge"}
        </GradientButtonPrimary>
      </Stack>

      {/* All badges */}
      <Stack gap={10}>
        <Text c="white" fw={600}>
          All badges
        </Text>
        <Stack gap={8}>
          {catalog.map((badge) => (
            <Group
              key={badge.id}
              justify="space-between"
              wrap="nowrap"
              gap={8}
              p={10}
              style={{ background: "#1E1D2080", borderRadius: 8 }}
            >
              <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                <BadgePreview name={badge.name} background={badge.background} />
                {badge.isDefault && (
                  <Badge size="xs" variant="outline" color="gray">
                    Default
                  </Badge>
                )}
                {badge.description && (
                  <Text fz={12} c="dimmed" lineClamp={1}>
                    {badge.description}
                  </Text>
                )}
              </Group>
              <Group gap={6} wrap="nowrap">
                <Button size="xs" variant="light" onClick={() => loadIntoForm(badge)}>
                  Edit
                </Button>
                {/* Defaults can be edited but not deleted. */}
                {!badge.isDefault && <DeleteBadge id={badge.id} />}
              </Group>
            </Group>
          ))}
        </Stack>
      </Stack>

      <AssignBadges catalog={catalog} />
    </Stack>
  );
}

function DeleteBadge(props: { id: string }) {
  const { id } = props;
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const mutation = useMutation({
    mutationFn: async () => deleteBadge(id),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["badge-catalog"] });
    },
  });
  return (
    <Popover opened={opened} onChange={close} position="bottom-end" withArrow shadow="md">
      <Popover.Target>
        <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={open}>
          Delete
        </Button>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20">
        <Stack gap={8}>
          <Text c="white" fz={14}>
            Delete this badge? Users who have it keep their copy.
          </Text>
          <Group gap={8} justify="flex-end">
            <Button size="xs" color="gray" variant="light" onClick={close}>
              Cancel
            </Button>
            <Button size="xs" color="red" loading={mutation.isPending} onClick={() => mutation.mutateAsync()}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

/** Manually assign a badge to one or more users (auto-assignment is deferred). */
function AssignBadges(props: { catalog: BadgeDef[] }) {
  const { catalog } = props;
  const { data: users } = useQuery({ queryKey: ["get-all-users"], queryFn: getUsers });
  const [badgeId, setBadgeId] = React.useState<string | null>(null);
  const [userIds, setUserIds] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const badge = catalog.find((b) => b.id === badgeId);
      if (!badge || !userIds.length) return;
      await assignBadgeToUsers(badge, userIds);
    },
    onSuccess: () => {
      setMessage(`Badge assigned to ${userIds.length} user${userIds.length === 1 ? "" : "s"}.`);
      setUserIds([]);
    },
    onError: (err) => setMessage((err as Error).message || "Could not assign the badge."),
  });

  return (
    <Stack gap={10} p={16} style={{ background: "#1E1D2080", borderRadius: 12 }}>
      <Text c="white" fw={600}>
        Assign a badge to users
      </Text>
      <Text fz={12} c="dimmed">
        Assigned badges arrive disabled — each user enables them from Settings → Collections.
      </Text>
      <Group align="flex-end" gap={10} wrap="wrap">
        <Select
          label="Badge"
          placeholder="Pick a badge"
          data={catalog.map((b) => ({ value: b.id, label: b.name }))}
          value={badgeId}
          onChange={(v) => {
            setMessage("");
            setBadgeId(v);
          }}
          w={200}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <MultiSelect
          label="Users"
          placeholder="Search users"
          searchable
          data={(users ?? []).map((u) => ({ value: u.id, label: u.username }))}
          value={userIds}
          onChange={(v) => {
            setMessage("");
            setUserIds(v);
          }}
          w={260}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <GradientButtonSecondary
          radius="xl"
          disabled={!badgeId || !userIds.length}
          loading={mutation.isPending}
          onClick={() => mutation.mutateAsync()}
        >
          Assign
        </GradientButtonSecondary>
      </Group>
      {message && (
        <Text fz={13} c={message.startsWith("Could not") ? "#E35C65" : "green.0"}>
          {message}
        </Text>
      )}
      <Box />
    </Stack>
  );
}
