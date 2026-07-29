import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { EmptyMessage } from "../../../../components/common/Message";
import { SectionLoader } from "../../../../components/navigation/loading";
import { SimpleSectionWrapper } from "../../../../components/Dashboard/SubTabsLayout";
import {
  ApplicationLogEntry,
  approveNewUser,
  getApplicationLog,
  getNewUsers,
  NewUserApplicant,
  rejectNewUser,
} from "../../../../queries/applicants";
import { callableMessage } from "../../../forum/functionsClient";

// Approval always grants Verified. Higher tiers (Master, Director) are assigned
// later through Admin > Permissions, not at approval time.
const ROLE_OPTIONS = ["Verified"];

export function ApplicantCard(props: { applicant: NewUserApplicant; onDone: () => void }) {
  const { applicant } = props;
  const [role, setRole] = React.useState("Verified");
  const [message, setMessage] = React.useState("");
  // Rejecting asks for a written reason: it is emailed to the applicant and
  // kept in the application log, so it is not optional.
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState("");

  const approve = useMutation({
    mutationFn: () => approveNewUser(applicant.id, role),
    onSuccess: props.onDone,
    // callableMessage surfaces the server's HttpsError text and hides raw
    // "internal" noise.
    onError: (e) => setMessage(callableMessage(e, "Could not approve.")),
  });
  const reject = useMutation({
    mutationFn: () => rejectNewUser(applicant.id, reason.trim()),
    onSuccess: () => {
      setRejectOpen(false);
      props.onDone();
    },
    onError: (e) => setMessage(callableMessage(e, "Could not reject.")),
  });

  const submitReject = () => {
    if (reason.trim().length < 10) {
      setReasonError("Write at least a sentence. The applicant is sent this reason.");
      return;
    }
    setReasonError("");
    setMessage("");
    reject.mutateAsync().catch(() => undefined);
  };

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
        <Text fz={14} c="dimmed">
          {applicant.email}
        </Text>
      </Group>
      {applicant.application ? (
        <Box p={10} mb={8} bg="#211f21" style={{ borderRadius: 8 }}>
          <Text fz={14} fw={700} c="dimmed" tt="uppercase" mb={2}>
            Application
          </Text>
          <Text fz={14} c="rgba(255,255,255,0.8)" style={{ whiteSpace: "pre-wrap" }}>
            {applicant.application}
          </Text>
        </Box>
      ) : (
        <Text fz={14} c="dimmed" mb={8}>
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
            setReasonError("");
            setRejectOpen(true);
          }}
        >
          Reject
        </Button>
      </Group>
      {message && (
        <Text fz={14} c="#E54156" mt={6} role="status" aria-live="polite">
          {message}
        </Text>
      )}

      <Modal
        opened={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Reject ${applicant.username || "this application"}`}
        centered
      >
        <Stack gap={10}>
          <Text fz={14} c="dimmed">
            The reason below is emailed to {applicant.email || "the applicant"} and saved to the
            application log. Write it for them to read: say what was missing and whether they may
            apply again.
          </Text>
          <Textarea
            label="Reason for rejection"
            placeholder="For example: the writing sample was under the length we ask for, and the starter pokemon chosen was a fully evolved species. You are welcome to reapply with a longer sample."
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            error={reasonError}
            autosize
            minRows={5}
            maxRows={12}
            required
          />
          <Group justify="flex-end" gap={8}>
            <Button variant="default" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              size="sm"
              loading={reject.isPending}
              onClick={submitReject}
            >
              Reject and send email
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

/** Read-only history of decided applications, newest first. */
export function ApplicationLog() {
  const { data, isPending } = useQuery({
    queryKey: ["application-log"],
    queryFn: () => getApplicationLog(100),
  });

  if (isPending) return <SectionLoader />;
  if (!data || !data.length) {
    return (
      <EmptyMessage
        title="No decisions yet"
        description="Approved and rejected applications are recorded here."
      />
    );
  }

  return (
    <Stack gap={10}>
      {data.map((entry) => (
        <ApplicationLogRow key={entry.id} entry={entry} />
      ))}
    </Stack>
  );
}

function ApplicationLogRow(props: { entry: ApplicationLogEntry }) {
  const { entry } = props;
  const [open, setOpen] = React.useState(false);
  const rejected = entry.decision === "rejected";
  const decided = entry.decidedAt?.seconds
    ? new Date(entry.decidedAt.seconds * 1000).toLocaleDateString()
    : "";

  return (
    <Box p={14} bg="#2b2a2b" style={{ borderRadius: 12 }}>
      <Group justify="space-between" wrap="wrap" gap={8}>
        <Group gap={8}>
          <Badge variant="light" color={rejected ? "red" : "teal"} size="sm">
            {rejected ? "Rejected" : "Approved"}
          </Badge>
          <Text c="white" fw={600}>
            {entry.username || "Unnamed"}
          </Text>
          {entry.isGaia === "Yes" && (
            <Badge variant="light" color="grape" size="sm">
              Gaia{entry.gaiaName ? `: ${entry.gaiaName}` : ""}
            </Badge>
          )}
        </Group>
        <Text fz={14} c="dimmed">
          {[entry.email, decided ? `decided ${decided}` : "", entry.reviewerName ? `by ${entry.reviewerName}` : ""]
            .filter(Boolean)
            .join(" • ")}
        </Text>
      </Group>
      {rejected && entry.reason && (
        <Box p={10} mt={8} bg="#211f21" style={{ borderRadius: 8 }}>
          <Text fz={14} fw={700} c="dimmed" tt="uppercase" mb={2}>
            Reason sent to the applicant
          </Text>
          <Text fz={14} c="rgba(255,255,255,0.8)" style={{ whiteSpace: "pre-wrap" }}>
            {entry.reason}
          </Text>
        </Box>
      )}
      {entry.application && (
        <>
          <Button variant="subtle" size="compact-xs" mt={8} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide application" : "Show application"}
          </Button>
          {open && (
            <Box p={10} mt={6} bg="#211f21" style={{ borderRadius: 8 }}>
              <Text fz={14} c="rgba(255,255,255,0.8)" style={{ whiteSpace: "pre-wrap" }}>
                {entry.application}
              </Text>
            </Box>
          )}
        </>
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["new-users"] });
    queryClient.invalidateQueries({ queryKey: ["application-log"] });
  };

  return (
    <SimpleSectionWrapper>
      <Stack gap={14}>
        <Title order={2} c="white" size={28} fw={400}>
          Member Approvals
        </Title>
        <Text fz={14} c="dimmed">
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

        <Title order={2} c="white" size={24} fw={400} mt={10}>
          Past Applications
        </Title>
        <Text fz={14} c="dimmed">
          Every decided application is kept here with the essay and, for rejections, the reason the
          applicant was sent.
        </Text>
        <ApplicationLog />
      </Stack>
    </SimpleSectionWrapper>
  );
}
