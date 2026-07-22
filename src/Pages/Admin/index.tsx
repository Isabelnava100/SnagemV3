import { Box, Container, Text } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { canAccessStaffArea, hasCapability, isAdmin } from "../../lib/permissions";
import Inbox from "./Inbox";
import Manage from "./Manage";

/**
 * Top-level Admin Access page: the Inbox (unified pending stream) with the
 * Manage area (grouped editors + config) stacked directly below it, so staff
 * see everything on one page. Capability gating is unchanged (admins see all,
 * directors see the tools their capabilities cover).
 */
export default function AdminPage() {
  const { user } = useAuth();

  // A director with only content/balance caps has nothing in the Inbox.
  const canInbox =
    isAdmin(user) ||
    hasCapability(user, Capability.ApproveImports) ||
    hasCapability(user, Capability.ReviewRewards);

  if (!canAccessStaffArea(user)) return <Navigate to="/Dashboard" replace />;

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
        <Box mb={36}>
          <Inbox />
        </Box>
      )}
      <Box>
        <Manage />
      </Box>
    </Container>
  );
}
