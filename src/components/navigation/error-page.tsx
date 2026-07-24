import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import Seo from "../common/Seo";

/**
 * Catch-all 404 for unmatched routes. Static on purpose: the app uses
 * BrowserRouter (not a data router), so useRouteError() has nothing to read
 * and calling it here throws into the app-wide ErrorBoundary.
 */
export function ErrorPage() {
  return (
    <Container size="sm" mt={80} px={{ base: 16, sm: 24 }} pb={80}>
      <Seo noindex title="Page Not Found | Snagem Guild" />
      <Stack align="center" gap={14}>
        <Title order={1} c="white" fw={500} ta="center">
          This page doesn&apos;t exist
        </Title>
        <Text c="dimmed" ta="center" maw={420}>
          The link may be old, or the address may have a typo. The rest of the
          guild is right where you left it.
        </Text>
        <Group justify="center" gap={10} wrap="wrap">
          <Button component={Link} to="/" radius="xl">
            Home
          </Button>
          <Button component={Link} to="/Forum" variant="light" radius="xl">
            Forum
          </Button>
          <Button component={Link} to="/Dashboard" variant="light" radius="xl">
            Dashboard
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
