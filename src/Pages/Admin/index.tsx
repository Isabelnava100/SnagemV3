import { Box, Container, Text } from "@mantine/core";
import React from "react";
import { Navigate } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { canAccessStaffArea, hasCapability, isAdmin } from "../../lib/permissions";
import Inbox from "./Inbox";
import Manage, { ToolKey } from "./Manage";

/**
 * Top-level Admin Access page: the Inbox (unified pending stream) with the
 * Manage area (grouped editors + config) stacked directly below it, so staff
 * see everything on one page. Capability gating is unchanged (admins see all,
 * directors see the tools their capabilities cover). The selected Manage tool
 * is lifted here so the Inbox's "Help Desk Open" tile can deep-link into the
 * Dev Board.
 */
export default function AdminPage() {
  const { user } = useAuth();
  const [tool, setTool] = React.useState<ToolKey | null>(null);

  // A director with only content/balance caps has nothing in the Inbox.
  const canInbox =
    isAdmin(user) ||
    hasCapability(user, Capability.ApproveImports) ||
    hasCapability(user, Capability.ReviewRewards);

  if (!canAccessStaffArea(user)) return <Navigate to="/Dashboard" replace />;

  const openHelpDesk = () => {
    setTool("devboard");
    document.getElementById("admin-manage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo noindex title="Admin | Snagem Guild" />
      <PageHero
        eyebrow="Staff Tools · Restricted"
        title={isAdmin(user) ? "Admin Console" : "Staff Tools"}
        subtitle="Run the guild: approvals, hosting, grading, config, and the help desk."
        aside={
          <Box style={{ border: "1px solid #E54156", padding: "8px 16px" }}>
            <Text
              fz={14}
              fw={700}
              c="#E54156"
              tt="uppercase"
              style={{
                fontFamily: "var(--font-display, 'Quantico', sans-serif)",
                letterSpacing: "0.14em",
              }}
            >
              {isAdmin(user) ? "Director Access" : "Staff Access"}
            </Text>
          </Box>
        }
      />
      {canInbox && (
        <Box mb={26}>
          <Inbox onOpenHelpDesk={openHelpDesk} />
        </Box>
      )}
      <Box id="admin-manage" style={{ scrollMarginTop: 90 }}>
        <Manage selected={tool} onSelect={setTool} />
      </Box>
    </Container>
  );
}
