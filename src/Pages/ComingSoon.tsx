import { Container, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { GradientButtonSecondary } from "../components/common/GradientButton";

/**
 * Placeholder for sidebar modules that are designed but not built yet
 * (Shop/Marketplace, Users, Activities, Missions). Keeps sidebar links from
 * dead-ending on the 404 page.
 */
export default function ComingSoon(props: { module: string }) {
  const navigate = useNavigate();
  return (
    <Container size="sm" style={{ marginTop: 80, paddingBottom: 100 }}>
      <Stack align="center" gap={12}>
        <Title order={1} c="white" fw={400} ta="center">
          {props.module} is coming soon!
        </Title>
        <Text c="dimmed" ta="center" maw={420}>
          This part of the guild is still under construction. In the meantime, the forums are
          open. Go start a roleplay!
        </Text>
        <GradientButtonSecondary radius="xl" onClick={() => navigate("/Forum/Main-Forum")}>
          Go to the Forums
        </GradientButtonSecondary>
      </Stack>
    </Container>
  );
}
