import { Box, Container, Group, Text, UnstyledButton } from "@mantine/core";
import React from "react";
import { Navigate } from "react-router-dom";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { canAccessStaffArea, hasCapability, isAdmin } from "../../lib/permissions";
import Inbox from "./Inbox";
import Manage from "./Manage";

type Tab = "inbox" | "manage";

function TabPill(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      style={{
        padding: "8px 20px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        color: props.active ? "#fff" : "rgba(255,255,255,0.6)",
        background: props.active
          ? "linear-gradient(180deg, #912691 28%, #4D14C4 89%)"
          : "transparent",
      }}
    >
      {props.label}
    </UnstyledButton>
  );
}

/**
 * Top-level Admin Access page. Two tabs: the Inbox (unified pending stream) and
 * Manage (grouped editors + config). Replaces the old /Dashboard/Admin-Access
 * sub-tab layout; capability gating is unchanged (admins see all, directors see
 * the tools their capabilities cover).
 */
export default function AdminPage() {
  const { user } = useAuth();

  // A director with only content/balance caps has nothing in the Inbox, so open
  // straight to Manage for them.
  const canInbox =
    isAdmin(user) ||
    hasCapability(user, Capability.ApproveImports) ||
    hasCapability(user, Capability.ReviewRewards);
  const [tab, setTab] = React.useState<Tab>(canInbox ? "inbox" : "manage");

  if (!canAccessStaffArea(user)) return <Navigate to="/Dashboard" replace />;

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Text fz={12} fw={700} tt="uppercase" c="grape.3" mb={10} style={{ letterSpacing: 1 }}>
        {isAdmin(user) ? "Admin Access" : "Staff Tools"}
      </Text>
      <Group
        gap={6}
        mb={28}
        p={4}
        w="fit-content"
        style={{ borderRadius: 999, background: "#1c1a26", border: "1px solid #2a2637" }}
      >
        {canInbox && <TabPill label="Inbox" active={tab === "inbox"} onClick={() => setTab("inbox")} />}
        <TabPill label="Manage" active={tab === "manage"} onClick={() => setTab("manage")} />
      </Group>

      <Box>{tab === "inbox" && canInbox ? <Inbox /> : <Manage />}</Box>
    </Container>
  );
}
