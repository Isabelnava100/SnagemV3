import { Container, Stack, Title } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { hasCapability, isAdmin } from "../../../lib/permissions";
import SEO from "./Admin/SEO";

/**
 * Site Settings: a standalone page (outside the admin tools tabs) for
 * site-wide configuration. Admins, and directors granted ManageSEO, can view
 * it. For now it hosts the SEO / search settings; more site-level settings can
 * be added here over time.
 */
export default function SiteSettings() {
  const { user } = useAuth();
  const canView = isAdmin(user) || hasCapability(user, Capability.ManageSEO);
  if (!canView) return <Navigate to="/Dashboard" replace />;

  return (
    <Container size="md" py={{ base: 24, sm: 32 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={16}>
        <Title order={1} c="white" size={30} fw={600}>
          Site Settings
        </Title>
        <SEO />
      </Stack>
    </Container>
  );
}
