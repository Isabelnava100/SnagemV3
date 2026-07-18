import { Badge, Box, Button, Group, Select, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import {
  approveNewUser,
  getNewUsers,
  NewUserApplicant,
  rejectNewUser,
} from "../../../../queries/applicants";

// Approval always grants Verified. Higher tiers (Master, Director) are assigned
// later through Admin > Permissions, not at approval time.
const ROLE_OPTIONS = ["Verified"];

export function ApplicantCard(props: { applicant: NewUserApplicant; onDone: () => void }) {
  const { applicant } = props;
  const [role, setRole] = React.useState("Verified");
  const [message, setMessage] = React.useState("");

  const approve = useMutation({
    mutationFn: () => approveNewUser(applicant.id, role),
    onSuccess: props.onDone,
    onError: (e) => setMessage((e as Error).message || "Could not approve."),
  });
  const reject = useMutation({
    mutationFn: () => rejectNewUser(applicant.id, ""),
    onSuccess: props.onDone,
    onError: (e) => setMessage((e as Error).message || "Could not reject."),
  });

  const busy = approve.isPending || reject.isPending;

  return (
    <Box p={14} bg="#2b2a2b" style={{ borderRadius: 12 }}>
      <Group justify="space-between" wrap="wrap" gap={8} mb={6}>
        <Group gap={8}>
          <Text c="white" fw={600}>
            {applicant.username || "Unnamed"}
          </Text>
          {applicant.isGaia === "Yes" && (
            <Badge variant="light" color="grape" size="sm">
              Gaia{applicant.gaiaName ? `: ${applicant.gaiaName}` : ""}
            </Badge>
          )}
        </Group>
        <Text fz={12} c="dimmed">
          {applicant.email}
        </Text>
      </Group>
      {applicant.application ? (
        <Box p={10} mb={8} bg="#211f21" style={{ borderRadius: 8 }}>
          <Text fz={11} fw={700} c="dimmed" tt="uppercase" mb={2}>
            Application
          </Text>
          <Text fz={13} c="rgba(255,255,255,0.8)" style={{ whiteSpace: "pre-wrap" }}>
            {applicant.application}
          </Text>
        </Box>
      ) : (
        <Text fz={12} c="dimmed" mb={8}>
          No written application on file.
        </Text>
      )}
      <Group gap={10} align="end" wrap="wrap">
        <Select
          label="Approve as"
          data={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole(v ?? "Verified")}
          size="xs"
          w={140}
          allowDeselect={false}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <GradientButtonSecondary
          radius="lg"
          size="xs"
          loading={approve.isPending}
          disabled={busy}
          onClick={() => {
            setMessage("");
            approve.mutateAsync().catch(() => undefined);
          }}
        >
          Approve
        </GradientButtonSecondary>
        <Button
          radius="lg"
          size="xs"
          variant="light"
          color="red"
          loading={reject.isPending}
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Reject and remove this application? This cannot be undone.")) return;
            setMessage("");
            reject.mutateAsync().catch(() => undefined);
          }}
        >
          Reject
        </Button>
      </Group>
      {message && (
        <Text fz={12} c="#E54156" mt={6} role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Box>
  );
}

export default function Applicants() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["new-users"],
    queryFn: getNewUsers,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["new-users"] });

  return (
    <SimpleSectionWrapper>
      <Stack gap={14}>
        <Title order={2} c="white" size={24} fw={400}>
          Member Approvals
        </Title>
        <Text fz={13} c="dimmed">
          New members who registered are waiting here. Approving one creates their
          account in the members list with the chosen role; rejecting removes the
          application.
        </Text>
        {isPending ? (
          <SectionLoader />
        ) : data && data.length ? (
          <Stack gap={10}>
            {data.map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} onDone={refresh} />
            ))}
          </Stack>
        ) : (
          <EmptyMessage title="All caught up" description="There are no pending applicants." />
        )}
      </Stack>
    </SimpleSectionWrapper>
  );
}
