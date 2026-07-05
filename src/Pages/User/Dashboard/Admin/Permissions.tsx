import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../../components/common/GradientButton";
import { ActivityLog } from "../../../../components/admin/ActivityLog";
import { SectionLoader } from "../../../../components/navigation/loading";
import { CAPABILITY_INFO, Capability, UserRoles } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../context/firebase";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import {
  BattleConfig,
  DEFAULT_BATTLE_CONFIG,
  StageCosts,
  XPDefaults,
  XP_STAT_FIELDS,
  getBattleConfig,
  getXPDefaults,
  saveBattleConfig,
  saveXPDefaults,
} from "../../../../queries/game";
import { BATTLE_STAGE_LABEL, BattleStage } from "../../../../lib/battleStage";
import { getLevelingCurve, saveLevelingCurve } from "../../../../queries/leveling";
import { DEFAULT_XP_CURVE, MAX_LEVEL, setActiveCurve } from "../../../../lib/leveling";

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
  const [role, setRole] = React.useState<string>("");
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const selected = members?.find((m) => m.id === selectedId);
  React.useEffect(() => {
    if (selected && loadedFor !== selected.id) {
      setCaps(selected.capabilities ?? []);
      setRole(selected.permissions ?? "");
      setLoadedFor(selected.id);
      setSaved(false);
    }
  }, [selected, loadedFor]);

  const roleChanged = !!selected && role !== (selected.permissions ?? "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", selectedId!), {
        capabilities: caps,
        ...(role ? { permissions: role } : {}),
      });
      await logAuditEvent({
        action: "user.capability_change",
        ...actorFrom(user),
        targetPath: `users/${selectedId}`,
        details: { username: selected?.username, capabilities: caps },
      });
      if (roleChanged) {
        await logAuditEvent({
          action: "user.role_change",
          ...actorFrom(user),
          targetPath: `users/${selectedId}`,
          details: { username: selected?.username, from: selected?.permissions ?? "", to: role },
        });
      }
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
        Roles & Permissions
      </Title>
      <Text fz={13} c="dimmed">
        Set a member's role (including temporarily promoting someone to Admin) and
        toggle each director capability. Admins implicitly have every power.
      </Text>
      <Select
        placeholder="Search for a member"
        searchable
        limit={20}
        data={(members ?? []).map((m) => ({
          value: m.id,
          label: `${m.username}${m.permissions ? ` (${m.permissions})` : ""}`,
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
          <Select
            label="Role"
            description="Sets the member's trust tier. Use Admin to temporarily grant full access, then set it back."
            data={Object.values(UserRoles).map((r) => ({ value: r, label: r }))}
            value={role || null}
            onChange={(v) => setRole(v ?? "")}
            allowDeselect={false}
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          {role === UserRoles.Admin && selected.permissions !== UserRoles.Admin && (
            <Text fz={12} c="#f0a500" role="status" aria-live="polite">
              Heads up: Admin grants full control over every member and setting.
            </Text>
          )}
          {Object.values(Capability).map((capability) => (
            <Checkbox
              key={capability}
              label={
                <span>
                  <b>{capability}</b>: {CAPABILITY_INFO[capability]}
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
            <Text fz={13} c="green.0" role="status" aria-live="polite">
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

/**
 * Editable XP-per-level table (admin/leveling). Each row is the cumulative XP a
 * pokemon needs to REACH that level; level 1 is always 0. Level is derived from
 * a pokemon's earned experience through this table, so it also controls when
 * level-gated evolutions unlock. Changes apply to members after they reload.
 */
function LevelingCurveSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["leveling-curve"], queryFn: getLevelingCurve });
  const [curve, setCurve] = React.useState<number[] | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !curve) setCurve([...data]);
  }, [data, curve]);

  const saveMutation = useMutation({
    mutationFn: () => saveLevelingCurve(curve!),
    onSuccess: () => {
      setSaved(true);
      setActiveCurve(curve!);
      queryClient.invalidateQueries({ queryKey: ["leveling-curve"] });
    },
  });

  if (isPending || !curve) return <SectionLoader />;

  const setLevel = (level: number, value: number) => {
    setSaved(false);
    setCurve((prev) => {
      const next = [...prev!];
      next[level] = Math.max(0, Math.round(value) || 0);
      return next;
    });
  };

  const levels = Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2);

  return (
    <Stack gap={10} maw={560}>
      <Title order={2} c="white" size={24} fw={400}>
        Leveling XP Table
      </Title>
      <Text fz={13} c="dimmed">
        The total experience a pokemon needs to reach each level (level 1 is 0).
        Experience is earned from posting (see XP Defaults); this table decides when
        each level is reached and therefore when level-based evolutions unlock. Edits
        apply to members after they reload.
      </Text>
      <Group>
        <Button
          size="xs"
          variant="light"
          color="gray"
          onClick={() => {
            setSaved(false);
            setCurve([...DEFAULT_XP_CURVE]);
          }}
        >
          Reset to default
        </Button>
      </Group>
      <ScrollArea h={360} type="auto" offsetScrollbars>
        <Table stickyHeader withRowBorders={false} verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Level</Table.Th>
              <Table.Th>XP to reach</Table.Th>
              <Table.Th>From previous</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {levels.map((l) => (
              <Table.Tr key={l}>
                <Table.Td>
                  <Text c="white" fz={13}>
                    {l}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    aria-label={`XP to reach level ${l}`}
                    value={curve[l]}
                    onChange={(v) => setLevel(l, Number(v) || 0)}
                    min={0}
                    size="xs"
                    w={130}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Table.Td>
                <Table.Td>
                  <Text c="dimmed" fz={12}>
                    +{Math.max(0, curve[l] - (curve[l - 1] ?? 0))}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {saved && (
        <Text fz={13} c="green.0" role="status" aria-live="polite">
          XP table saved.
        </Text>
      )}
      <GradientButtonSecondary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save XP Table
      </GradientButtonSecondary>
    </Stack>
  );
}

const STAGE_KEYS: BattleStage[] = ["stage1", "stage2", "stage3", "legendary"];

function BattleCostsSection() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["battle-config"], queryFn: getBattleConfig });
  const [form, setForm] = React.useState<BattleConfig | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: () => saveBattleConfig(form!),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["battle-config"] });
    },
  });

  if (isPending || !form) return <SectionLoader />;

  const setCost = (group: "boss" | "encounter", stage: BattleStage, value: number) => {
    setSaved(false);
    setForm({
      ...form,
      [group]: { ...form[group], [stage]: Math.max(1, value) } as StageCosts,
    });
  };

  const Table = (props: { group: "boss" | "encounter"; label: string; hint: string }) => (
    <Stack gap={8} maw={560}>
      <Title order={3} c="white" size={16} fw={600}>
        {props.label}
      </Title>
      <Text fz={12} c="dimmed">
        {props.hint}
      </Text>
      <SimpleGrid cols={{ base: 2, xs: 4 }} spacing={10}>
        {STAGE_KEYS.map((stage) => (
          <Stack gap={2} key={stage}>
            <Text fz={11} c="dimmed">
              {BATTLE_STAGE_LABEL[stage]}
            </Text>
            <NumberInput
              value={form[props.group][stage]}
              onChange={(v) => setCost(props.group, stage, Number(v) || 0)}
              min={1}
              styles={{ input: { background: "#2E2D2E" } }}
            />
          </Stack>
        ))}
      </SimpleGrid>
    </Stack>
  );

  return (
    <Stack gap={14}>
      <Title order={2} c="white" size={24} fw={400}>
        Battle Costs
      </Title>
      <Text fz={13} c="dimmed">
        How many posts it takes to defeat a boss or capture an encounter, by the
        target's evolution stage. Boss posts are totalled across everyone
        attacking; encounter posts are counted per capture. Defaults are{" "}
        {STAGE_KEYS.map((s) => DEFAULT_BATTLE_CONFIG.boss[s]).join(" / ")} for
        bosses and {STAGE_KEYS.map((s) => DEFAULT_BATTLE_CONFIG.encounter[s]).join(" / ")}{" "}
        for encounters.
      </Text>
      <Table
        group="boss"
        label="Boss defeat (posts)"
        hint="Attack posts needed to take a boss down."
      />
      <Table
        group="encounter"
        label="Encounter capture (posts)"
        hint="Posts needed before a rolled encounter can be caught."
      />
      {saved && (
        <Text fz={13} c="green.0" role="status" aria-live="polite">
          Battle costs saved.
        </Text>
      )}
      <GradientButtonPrimary
        radius="xl"
        w="fit-content"
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutateAsync()}
      >
        Save Battle Costs
      </GradientButtonPrimary>
    </Stack>
  );
}

export default function Permissions() {
  return (
    <Stack gap={20}>
      <CapabilityChecklist />
      <Divider color="#4a464a" />
      <XPDefaultsSection />
      <Divider color="#4a464a" />
      <LevelingCurveSection />
      <Divider color="#4a464a" />
      <BattleCostsSection />
      <Divider color="#4a464a" />
      <ActivityLog title="Staff activity log" max={80} />
    </Stack>
  );
}
