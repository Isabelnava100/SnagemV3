import { Badge, Box, Button, Group, Stack, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronDown } from "@tabler/icons-react";
import React from "react";
import { EmptyMessage } from "../../components/common/Message";
import { SectionLoader } from "../../components/navigation/loading";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { hasCapability, isAdmin } from "../../lib/permissions";
import { getUsers } from "../../queries/admin";
import { getNewUsers } from "../../queries/applicants";
import {
  getPendingMasterMissionRequests,
  getPendingMissionSubmissions,
} from "../../queries/grading";
import { getPendingImports } from "../../queries/imports";
import { ApplicantCard } from "../User/Dashboard/Admin/Applicants";
import { MMRequestCard, SubmissionCard } from "../User/Dashboard/Admin/Grading";
import { ReviewCard } from "../User/Dashboard/Admin/Imports";

type InboxType = "application" | "import" | "mission" | "master";

const TYPE_META: Record<InboxType, { label: string; color: string; action: string }> = {
  application: { label: "Application", color: "#a855f7", action: "Review" },
  import: { label: "Import", color: "#3b82f6", action: "Review" },
  mission: { label: "Mission", color: "#ef4444", action: "Grade" },
  master: { label: "Master Req", color: "#14b8a6", action: "Grant" },
};

/** Collapsed summary row that expands to the full review card for that item. */
function InboxRow(props: {
  type: InboxType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const meta = TYPE_META[props.type];
  const [open, setOpen] = React.useState(false);
  return (
    <Box
      style={{
        borderRadius: 14,
        background: "#1c1a26",
        border: "1px solid #2a2637",
        borderLeft: `4px solid ${meta.color}`,
        overflow: "hidden",
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="md" p="md">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge radius="sm" tt="uppercase" style={{ background: meta.color, color: "#fff" }}>
            {meta.label}
          </Badge>
          <Box style={{ minWidth: 0 }}>
            <Text fw={700} c="white" lineClamp={1}>
              {props.title}
            </Text>
            {props.subtitle && (
              <Text fz={13} c="dimmed" lineClamp={1}>
                {props.subtitle}
              </Text>
            )}
          </Box>
        </Group>
        <Button
          variant={open ? "light" : "gradient"}
          gradient={{ from: "indigo", to: "cyan", deg: 90 }}
          color="gray"
          size="sm"
          radius="xl"
          rightSection={
            <IconChevronDown
              size={16}
              style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 150ms" }}
            />
          }
          onClick={() => setOpen((o) => !o)}
          style={{ flexShrink: 0 }}
        >
          {open ? "Close" : meta.action}
        </Button>
      </Group>
      {open && (
        <Box px="md" pb="md">
          {props.children}
        </Box>
      )}
    </Box>
  );
}

function CountPill(props: { label: string; count: number }) {
  return (
    <Box
      p={12}
      style={{ borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid #2a2637", minWidth: 96 }}
    >
      <Text fz={22} fw={800} c={props.count ? "#ff6b6b" : "dimmed"} lh={1}>
        {props.count}
      </Text>
      <Text fz={10} c="dimmed" tt="uppercase" mt={4} style={{ letterSpacing: 1 }}>
        {props.label}
      </Text>
    </Box>
  );
}

export default function Inbox() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const queryClient = useQueryClient();

  // Each stream is gated by the same capability as its old standalone tab.
  const canApps = admin;
  const canImports = admin || hasCapability(user, Capability.ApproveImports);
  const canGrade = admin || hasCapability(user, Capability.ReviewRewards);

  const apps = useQuery({
    queryKey: ["new-users"],
    queryFn: getNewUsers,
    enabled: canApps,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const imports = useQuery({
    queryKey: ["pending-imports"],
    queryFn: getPendingImports,
    enabled: canImports,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const missions = useQuery({
    queryKey: ["pending-submissions"],
    queryFn: getPendingMissionSubmissions,
    enabled: canGrade,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const master = useQuery({
    queryKey: ["pending-mm-requests"],
    queryFn: getPendingMasterMissionRequests,
    enabled: canGrade,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const { data: users } = useQuery({
    queryKey: ["get-all-users"],
    queryFn: getUsers,
    enabled: canImports,
  });

  const refresh = (key: string) => () => queryClient.invalidateQueries({ queryKey: [key] });
  const nameFor = (uid: string) => users?.find((u) => u.id === uid)?.username ?? uid;

  const appList = canApps ? apps.data ?? [] : [];
  const importList = canImports ? imports.data ?? [] : [];
  const missionList = canGrade ? missions.data ?? [] : [];
  const masterList = canGrade ? master.data ?? [] : [];

  const loading =
    (canApps && apps.isPending) ||
    (canImports && imports.isPending) ||
    (canGrade && (missions.isPending || master.isPending));

  const total = appList.length + importList.length + missionList.length + masterList.length;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Box>
          <Text fz={30} fw={800} c="white">
            Inbox
          </Text>
          <Text fz={14} c="dimmed" mt={4}>
            Triage every pending request from one stream.
          </Text>
        </Box>
        <Group gap={10}>
          {canApps && <CountPill label="Applications" count={appList.length} />}
          {canImports && <CountPill label="Imports" count={importList.length} />}
          {canGrade && <CountPill label="Missions" count={missionList.length} />}
          {canGrade && <CountPill label="Master Req" count={masterList.length} />}
        </Group>
      </Group>

      <Badge variant="light" color="gray" radius="sm" size="lg" w="fit-content">
        Pending
      </Badge>

      <Text fz={13} c="dimmed">
        One stream for every pending review: applications, imports, mission submissions and master
        requests. Act on each without hunting through tabs.
      </Text>

      {loading ? (
        <SectionLoader />
      ) : total === 0 ? (
        <EmptyMessage
          title="Inbox zero"
          description="Nothing is waiting for review. New requests will appear here."
        />
      ) : (
        <Stack gap="md">
          {appList.map((a) => (
            <InboxRow
              key={`app-${a.id}`}
              type="application"
              title={a.username || "Unnamed"}
              subtitle={`New member${a.email ? ` · ${a.email}` : ""}`}
            >
              <ApplicantCard applicant={a} onDone={refresh("new-users")} />
            </InboxRow>
          ))}
          {importList.map((req) => (
            <InboxRow
              key={`imp-${req.uid}`}
              type="import"
              title={nameFor(req.uid)}
              subtitle={`${req.currency?.pokecoin ?? 0} coins · ${req.items?.length ?? 0} items · ${
                req.pokemon?.length ?? 0
              } Pokemon`}
            >
              <ReviewCard req={req} username={nameFor(req.uid)} />
            </InboxRow>
          ))}
          {missionList.map((s) => (
            <InboxRow
              key={`mis-${s.id}`}
              type="mission"
              title={s.submitterName || "Unknown member"}
              subtitle={`Mission ${s.missionId || "unknown"}`}
            >
              <SubmissionCard submission={s} onDone={refresh("pending-submissions")} />
            </InboxRow>
          ))}
          {masterList.map((r) => (
            <InboxRow
              key={`mm-${r.id}`}
              type="master"
              title={r.username || "Unknown member"}
              subtitle={`${r.type || "Master"} Master Mission #${r.number ?? "?"}`}
            >
              <MMRequestCard request={r} onDone={refresh("pending-mm-requests")} />
            </InboxRow>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
