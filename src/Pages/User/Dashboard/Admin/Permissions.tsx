import {
  Badge,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { CAPABILITY_INFO, Capability } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../context/firebase";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { XPDefaults, XP_STAT_FIELDS, getXPDefaults, saveXPDefaults } from "../../../../queries/game";

/**
 * Admin checklist for Director powers (Q5): pick a member, toggle each
 * capability on/off, save. Real enforcement is the `capabilities` field on
 * the user doc (admin-only writable per rules) checked by the Cloud
 * Functions and firestore.rules. Also hosts the site-wide XP defaults.
 */

interface MemberRow {
  id: string;
  username: string;
  permissions?: string;
  capabilities?: string[];
}

const getMembersWithRoles = async (): Promise<MemberRow[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        username: (data.username as string) ?? "",
        permissions: data.permissions as string,
        capabilities: (data.capabilities as string[]) ?? [],
      };
    })
    .filter((m) => m.username);
};

function CapabilityChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: members, isPending } = useQuery({
    queryKey: ["members-with-roles"],
    queryFn: getMembersWithRoles,
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [caps, setCaps] = React.useState<string[]>([]);
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const selected = members?.find((m) => m.id === selectedId);
  React.useEffect(() => {
    if (selected && loadedFor !== selected.id) {
      setCaps(selected.capabilities ?? []);
      setLoadedFor(selected.id);
      setSaved(false);
    }
  }, [selected, loadedFor]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", selectedId!), { capabilities: caps });
      await logAuditEvent({
        action: "user.capability_change",
        ...actorFrom(user),
        targetPath: `users/${selectedId}`,
        details: { username: selected?.username, capabilities: caps },
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["members-with-roles"] });
    },
  });

  if (isPending) return <SectionLoader />;

  return (
    <Stack gap={12} maw={560}>
      <Title order={2} c="white" size={24} fw={400}>
        Director Permissions
      </Title>
      <Text fz={13} c="dimmed">
        Assign admin powers to a member in checklist form, or take them away. Admins implicitly
        have every power.
      </Text>
      <Select
        placeholder="Search for a member"
        searchable
        limit={20}
        data={(members ?? []).map((m) => ({
          value: m.id,
          label: `${m.username}${m.permissions ? ` — ${m.permissions}` : ""}`,
        }))}
        value={selectedId}
        onChange={setSelectedId}
        styles={{ input: { background: "#2E2D2E" } }}
      />
      {selected && (
        <Stack gap={10}>
          <Group gap={8}>
            <Text c="white" fw={600}>
              {selected.username}
            </Text>
            <Badge variant="light" color="cyan.0">
              {selected.permissions ?? "Member"}
            </Badge>
          </Group>
          {Object.values(Capability).map((capability) => (
            <Checkbox
              key={capability}
              label={
                <span>
                  <b>{capability}</b> — {CAPABILITY_INFO[capability]}
                </span>
              }
              color="green.0"
              checked={caps.includes(capability)}
              onChange={(e) =>
                setCaps(
                  e.currentTarget.checked
                    ? [...caps, capability]
                    : caps.filter((c) => c !== capability)
                )
              }
              styles={{ label: { color: "white", fontSize: 13 } }}
            />
          ))}
          {saved && (
            <Text fz={13} c="green.0">
              Permissions saved.
            </Text>
          )}
          <GradientButtonPrimary
            radius="xl"
            w="fit-content"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutateAsync()}
          >
            Save Permissions
          </GradientButtonPrimary>
        </Stack>
      )}
    </Stack>
  );
}

function XPDefaultsSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["xp-defaults"], queryFn: getXPDefaults });
  const [form, setForm] = React.useState<XPDefaults | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: () => saveXPDefaults(form!),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["xp-defaults"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const setField = (key: keyof XPDefaults, value: number) => {
    setSaved(false);
    setForm({ ...form, [key]: Math.max(0, value) });
  };

  return (
    <Stack gap={10} maw={560}>
      <Title order={2} c="white" size={24} fw={400}>
        XP Defaults
      </Title>
      <Text fz={13} c="dimmed">
        Every new thread starts with these values: how many Experience, Friendship, Purification
        and Shadow points each team pokemon earns per qualifying post, plus the minimum post
        length that qualifies. Admins and AdjustXP directors can override them per thread.
      </Text>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={12}>
        {XP_STAT_FIELDS.map((stat) => (
          <Group gap={6} key={stat.key} justify="space-between">
            <Text fz={13} c="white">
              {stat.label} per post:
            </Text>
            <NumberInput
              value={form[stat.key]}
              onChange={(v) => setField(stat.key, Number(v) || 0)}
              min={0}
              w={100}
              styles={{ input: { background: "#2E2D2E" } }}
            />
          </Group>
        ))}
        <Group gap={6} justify="space-between">
          <Text fz={13} c="white">
            Minimum post length:
          </Text>
          <NumberInput
            value={form.minPostLength}
            onChange={(v) => setField("minPostLength", Number(v) || 0)}
            min={0}
            w={100}
            styles={{ input: { background: "#2E2D2E" } }}
          />
        </Group>
      </SimpleGrid>
      {saved && (
        <Text fz={13} c="green.0">
          Defaults saved.
        </Text>
      )}
      <GradientButtonSecondary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save XP Defaults
      </GradientButtonSecondary>
    </Stack>
  );
}

export default function Permissions() {
  return (
    <Stack gap={20}>
      <CapabilityChecklist />
      <Divider color="#4a464a" />
      <XPDefaultsSection />
    </Stack>
  );
}
