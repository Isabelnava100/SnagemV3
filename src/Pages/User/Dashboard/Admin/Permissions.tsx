import {
  Badge,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Select,
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
import { getXPDefaults, saveXPDefaults } from "../../../../queries/game";

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
  const [perPost, setPerPost] = React.useState<number | null>(null);
  const [minLength, setMinLength] = React.useState<number | null>(null);
  const [saved, setSaved] = React.useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveXPDefaults({
        perPost: perPost ?? data?.perPost ?? 0,
        minPostLength: minLength ?? data?.minPostLength ?? 0,
      }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["xp-defaults"] });
    },
  });

  if (isPending) return <SectionLoader />;

  return (
    <Stack gap={10} maw={560}>
      <Title order={2} c="white" size={24} fw={400}>
        XP Defaults
      </Title>
      <Text fz={13} c="dimmed">
        Every new thread starts with these values: experience awarded to each team pokemon per
        post, and the minimum post length that qualifies. Admins and AdjustXP directors can
        override them per thread when creating it.
      </Text>
      <Group gap={12}>
        <Group gap={6}>
          <Text fz={13} c="white">
            XP per post:
          </Text>
          <NumberInput
            value={perPost ?? data?.perPost ?? 0}
            onChange={(v) => {
              setSaved(false);
              setPerPost(Math.max(0, Number(v) || 0));
            }}
            min={0}
            w={100}
            styles={{ input: { background: "#2E2D2E" } }}
          />
        </Group>
        <Group gap={6}>
          <Text fz={13} c="white">
            Minimum post length:
          </Text>
          <NumberInput
            value={minLength ?? data?.minPostLength ?? 0}
            onChange={(v) => {
              setSaved(false);
              setMinLength(Math.max(0, Number(v) || 0));
            }}
            min={0}
            w={100}
            styles={{ input: { background: "#2E2D2E" } }}
          />
        </Group>
      </Group>
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
