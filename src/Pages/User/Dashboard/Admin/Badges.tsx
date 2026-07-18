import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
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
import { IconTrash, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Popover } from "@mantine/core";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Capability } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { hasCapability, isAdmin } from "../../../../lib/permissions";
import {
  AUTO_ASSIGNED_BADGE_IDS,
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

// Only real hex colors are allowed so the composed CSS background can never
// break. Accepts #RGB or #RRGGBB.
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isHex = (value: string) => HEX_RE.test(value.trim());

/**
 * Build the CSS background from 1 to 3 hex stops. One color is solid; two or
 * three make a left-to-right gradient with the stops spaced evenly.
 */
function buildBackground(colors: string[]): string {
  const c = colors.map((x) => x.trim()).filter(isHex);
  if (c.length <= 1) return c[0] ?? "#762B77";
  if (c.length === 2) return `linear-gradient(90deg, ${c[0]} 0%, ${c[1]} 100%)`;
  return `linear-gradient(90deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2]} 100%)`;
}

/** Best-effort recovery of the hex stops from a saved background string. */
function parseColors(background: string): string[] {
  const found = background.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g) ?? [];
  return found.slice(0, 3);
}

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
        fontSize: 16,
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
  // 1 to 3 hex stops. Index 0 is required; 1 and 2 extend it into a gradient.
  const [colors, setColors] = React.useState<string[]>(["#762B77"]);
  const [description, setDescription] = React.useState("");
  const [message, setMessage] = React.useState("");

  const loadIntoForm = (badge: BadgeDef | null) => {
    setEditing(badge);
    setName(badge?.name ?? "");
    const loaded = badge?.colors?.length
      ? badge.colors
      : badge
      ? parseColors(badge.background)
      : [];
    setColors(loaded.length ? loaded.slice(0, 3) : ["#762B77"]);
    setDescription(badge?.description ?? "");
    setMessage("");
  };

  const setColor = (index: number, value: string) => {
    setColors((prev) => prev.map((c, i) => (i === index ? value : c)));
  };
  const addColor = () => setColors((prev) => (prev.length < 3 ? [...prev, "#239DAD"] : prev));
  const removeColor = (index: number) =>
    setColors((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const background = buildBackground(colors);
  const allColorsValid = colors.every(isHex);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = editing?.id ?? slugify(name);
      if (!id) throw new Error("Give the badge a name.");
      if (!colors.every(isHex)) throw new Error("Every color must be a valid hex value.");
      await saveBadge({
        id,
        name: name.trim(),
        background,
        colors,
        description: description.trim(),
      });
      await logAuditEvent({
        action: "badge.edit",
        ...actorFrom(user),
        targetPath: `admin/badges/${id}`,
        details: { name: name.trim(), editing: !!editing },
      });
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
      <Title order={2} c="white" size={28} fw={400}>
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
        <TextInput
          label="Name"
          required
          withAsterisk
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maw={280}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />

        {/* Colors: 1 required (solid), 2 to 3 make an evenly spaced gradient. */}
        <Stack gap={8}>
          {colors.map((color, i) => (
            <Group key={i} gap={8} align="flex-end" wrap="nowrap">
              <ColorInput
                label={i === 0 ? "Color 1 (required)" : `Color ${i + 1} (optional)`}
                value={color}
                onChange={(v) => setColor(i, v)}
                format="hex"
                withEyeDropper
                error={color && !isHex(color) ? "Enter a valid hex, e.g. #A1B2C3" : undefined}
                w={220}
                styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
              />
              {i > 0 && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  mb={4}
                  onClick={() => removeColor(i)}
                  aria-label={`Remove color ${i + 1}`}
                >
                  <IconX size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}
          {colors.length < 3 && (
            <Button size="xs" variant="light" w="fit-content" onClick={addColor}>
              {colors.length === 1 ? "Add a second color (gradient)" : "Add a third color"}
            </Button>
          )}
          <Text fz={14} c="dimmed">
            One color is a solid badge. Two or three blend into a gradient, spaced
            evenly. Use the swatch to pick a color if you do not have the hex code.
          </Text>
        </Stack>

        <Group gap={10} align="center">
          <Text fz={14} c="white">
            Preview:
          </Text>
          <BadgePreview name={name} background={background} />
        </Group>

        <TextInput
          label="Description (how to obtain)"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        {message && (
          <Text fz={14} c={message.includes("Could not") || message.includes("Give") ? "#E54156" : "green.0"}>
            {message}
          </Text>
        )}
        <GradientButtonPrimary
          radius="xl"
          w="fit-content"
          disabled={!name.trim() || !allColorsValid}
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
                  <Text fz={14} c="dimmed" lineClamp={1}>
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
  const [removeFromUsers, setRemoveFromUsers] = React.useState(false);
  const mutation = useMutation({
    mutationFn: async () => deleteBadge(id, removeFromUsers),
    onSuccess: () => {
      close();
      setRemoveFromUsers(false);
      queryClient.invalidateQueries({ queryKey: ["badge-catalog"] });
    },
  });
  return (
    <Popover
      opened={opened}
      onChange={(o) => (o ? open() : close())}
      position="bottom-end"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={open}>
          Delete
        </Button>
      </Popover.Target>
      <Popover.Dropdown bg="#1E1D20">
        <Stack gap={10} maw={260}>
          <Text c="white" fz={16}>
            Delete this badge from the catalog?
          </Text>
          <Checkbox
            checked={removeFromUsers}
            onChange={(e) => setRemoveFromUsers(e.currentTarget.checked)}
            label="Also remove it from users who have it"
            description="Leave unchecked to let current holders keep their copy."
            styles={{ label: { color: "white" }, description: { color: "#9a989a" } }}
          />
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

/** Manually assign a badge to one or more users. */
function AssignBadges(props: { catalog: BadgeDef[] }) {
  const { catalog } = props;
  const { data: users } = useQuery({ queryKey: ["get-all-users"], queryFn: getUsers });
  const [badgeId, setBadgeId] = React.useState<string | null>(null);
  const [userIds, setUserIds] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState("");

  // Admin, Master, New User and Legacy are handed out automatically from
  // account status, so they can never be assigned by hand.
  const assignable = catalog.filter((b) => !AUTO_ASSIGNED_BADGE_IDS.includes(b.id));

  const mutation = useMutation({
    mutationFn: async () => {
      const badge = assignable.find((b) => b.id === badgeId);
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
      <Text fz={14} c="dimmed">
        Assigned badges arrive disabled. Each user enables them from Settings, Collections.
        Admin, Master, New User and Legacy are earned automatically and are not listed here.
      </Text>
      <Group align="flex-end" gap={10} wrap="wrap">
        <Select
          label="Badge"
          placeholder="Pick a badge"
          data={assignable.map((b) => ({ value: b.id, label: b.name }))}
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
        <Text fz={14} c={message.startsWith("Could not") ? "#E54156" : "green.0"}>
          {message}
        </Text>
      )}
      <Box />
    </Stack>
  );
}
