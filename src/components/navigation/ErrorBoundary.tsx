import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import React from "react";

interface State {
  hasError: boolean;
  isChunkError: boolean;
  message: string;
}

/** True for the "stale bundle after a new deploy" dynamic-import failures. */
function isChunkLoadError(error: unknown): boolean {
  const message = (error as { message?: string; name?: string })?.message ?? "";
  const name = (error as { name?: string })?.name ?? "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/**
 * App-wide error boundary. Without one, any render error or failed lazy-chunk
 * load blanks the whole SPA and traps the user (browser back can't revive a
 * crashed React tree). This catches those, auto-reloads once on a stale-chunk
 * error (new deploy invalidated the old bundle), and otherwise shows a
 * recover screen with real navigation.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, isChunkError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
      message: (error as { message?: string })?.message ?? "Unknown error",
    };
  }

  componentDidCatch(error: unknown) {
    // A stale chunk after a deploy fixes itself with one hard reload, but
    // guard against a reload loop if the fetch keeps failing (e.g. offline).
    if (isChunkLoadError(error)) {
      const KEY = "snagem-chunk-reloaded";
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkError) {
      return (
        <Container size="sm" mt={80}>
          <Stack align="center" gap={12}>
            <Title order={2} c="white" ta="center" fw={400}>
              Updating to the latest version…
            </Title>
            <Text c="dimmed" ta="center">
              The site was just updated. Reload to pick up the newest version.
            </Text>
            <Button radius="xl" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Stack>
        </Container>
      );
    }

    return (
      <Container size="sm" mt={80}>
        <Stack align="center" gap={12}>
          <Title order={2} c="white" ta="center" fw={400}>
            Something went wrong on this page
          </Title>
          <Text c="dimmed" ta="center">
            This one page hit an error. The rest of the site still works.
          </Text>
          {this.state.message && (
            <Text
              ff="monospace"
              fz={12}
              c="#E54156"
              ta="center"
              maw={420}
              style={{ wordBreak: "break-word" }}
            >
              {this.state.message}
            </Text>
          )}
          <Group>
            <Button
              variant="light"
              radius="xl"
              onClick={() => {
                this.setState({ hasError: false, isChunkError: false, message: "" });
                window.history.back();
              }}
            >
              Go Back
            </Button>
            <Button
              radius="xl"
              onClick={() => {
                this.setState({ hasError: false, isChunkError: false, message: "" });
                window.location.assign("/Dashboard");
              }}
            >
              Go to Dashboard
            </Button>
          </Group>
        </Stack>
      </Container>
    );
  }
}
