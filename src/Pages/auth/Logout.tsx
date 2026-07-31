import { Alert, Anchor, Button, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo";
import { MarketingTopBar } from "../../components/redesign/Marketing";
import { AuthCard, warmGradient } from "./components/AuthCard";

/**
 * /Logout as a real page. Signing out lives behind a menu everywhere else,
 * which is awkward on the screens that hide the nav (the access gate, the
 * import page), so a plain URL anyone can type is the reliable escape hatch.
 *
 * It signs out on mount rather than waiting for a click: someone who typed
 * this URL has already decided. Nothing here is destructive beyond ending the
 * session.
 */
export function Logout() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { signOut } = await import("firebase/auth");
        const { auth } = await import("../../context/firebase");
        await signOut(auth);
        if (active) setDone(true);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <MarketingTopBar context="auth" />
      <div className="authShell">
        <Seo noindex title="Signed Out | Snagem Guild" />
        <AuthCard title="Signed out" maw={480}>
          <Stack gap={12}>
            {failed ? (
              <Alert color="yellow" title="Could not sign out" role="status" aria-live="polite">
                Something went wrong ending the session. Reload the page and try again.
              </Alert>
            ) : done ? (
              <Alert color="teal" title="You are signed out" role="status" aria-live="polite">
                Your session on this device has ended.
              </Alert>
            ) : (
              <Text c="dimmed" size="sm" role="status" aria-live="polite">
                Signing you out...
              </Text>
            )}
            <Button
              fullWidth
              size="lg"
              radius={0}
              className="authBtnPrimary"
              variant="gradient"
              gradient={warmGradient}
              onClick={() => navigate("/Login", { replace: true })}
            >
              Log back in
            </Button>
            <Anchor component={Link} to="/" size="sm" ta="center">
              Back to the site
            </Anchor>
          </Stack>
        </AuthCard>
      </div>
    </>
  );
}
