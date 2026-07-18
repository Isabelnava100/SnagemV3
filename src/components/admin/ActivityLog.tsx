import { Anchor, Box, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { AuditRow, auditTitle, describeAuditDetails, getAuditLogs } from "../../lib/auditLog";
import { SectionLoader } from "../navigation/loading";

const dt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const formatWhen = (row: AuditRow) =>
  row.createdAt?.seconds ? dt.format(new Date(row.createdAt.seconds * 1000)) : "just now";

/**
 * Staff activity log. Shows recent admin/director actions (approvals, list
 * edits, thread closes, permission changes, etc.) newest first: a summarized
 * title, who did it, and when. Long payloads (reward/item/Pokemon lists) are
 * tucked under a per-row "Details" expander so the feed stays scannable.
 *
 * Pass `filter` to scope it to one screen (e.g. only reward actions).
 */
export function ActivityLog(props: {
  title?: string;
  max?: number;
  filter?: (row: AuditRow) => boolean;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["audit-logs", props.max ?? 60],
    queryFn: () => getAuditLogs(props.max ?? 60),
  });

  const rows = (data ?? []).filter((r) => (props.filter ? props.filter(r) : true));

  return (
    <Stack gap={8}>
      <Text c="white" fw={600} fz={16}>
        {props.title ?? "Activity log"}
      </Text>
      {isPending ? (
        <SectionLoader />
      ) : !rows.length ? (
        <Text fz={14} c="dimmed">
          No activity recorded yet.
        </Text>
      ) : (
        <Stack gap={6}>
          {rows.map((row) => (
            <LogRow key={row.id} row={row} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function LogRow(props: { row: AuditRow }) {
  const { row } = props;
  const [open, { toggle }] = useDisclosure(false);
  const hasDetails = row.details && Object.keys(row.details).length > 0;

  return (
    <Box p={10} style={{ background: "#1E1D2080", borderRadius: 8 }}>
      <Group justify="space-between" wrap="nowrap" gap={8} align="flex-start">
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text c="white" fz={14} fw={500}>
            {auditTitle(row.action)}
          </Text>
          <Text fz={14} c="dimmed">
            {formatWhen(row)} by {row.actorName || "unknown"}
          </Text>
        </Stack>
        {hasDetails && (
          <Anchor component="button" type="button" fz={14} onClick={toggle} c="grape.2">
            {open ? "Hide" : "Details"}
          </Anchor>
        )}
      </Group>
      {hasDetails && open && (
        <Stack gap={2} mt={6} p={10} style={{ background: "#141316", borderRadius: 6 }}>
          {describeAuditDetails(row.details).map((line, i) => (
            <Text key={i} fz={14} c="rgba(255,255,255,0.75)" style={{ wordBreak: "break-word" }}>
              {line}
            </Text>
          ))}
        </Stack>
      )}
    </Box>
  );
}
