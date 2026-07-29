import { Alert, Anchor, Button, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Seo from "../../components/common/Seo";
import { MarketingTopBar } from "../../components/redesign/Marketing";
import { auth } from "../../context/firebase";
import { AuthCard, warmGradient } from "./components/AuthCard";

/**
 * Branded handler for Firebase's email action links (the "custom action URL"
 * set on the Auth templates). Every emailed link (verify address, password
 * reset, email-change revert) lands here on our own domain instead of the
 * unstyled snagemguild.firebaseapp.com page.
 *
 * Firebase appends `mode` and `oobCode`; this page dispatches on `mode` and
 * hands the password-reset flow to the existing /Reset screen. Anything it
 * does not recognize goes to the login page rather than dead-ending.
 */

const REDIRECT_SECONDS = 4;

export function AuthAction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode") ?? "";
  const oobCode = searchParams.get("oobCode") ?? "";
  const continueUrl = searchParams.get("continueUrl") ?? "";

  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  // Only same-origin continue URLs are followed. The parameter comes off a URL
  // the user clicked, so treating it as a trusted redirect target would hand
  // anyone an open redirect on our domain.
  const safeContinuePath = (() => {
    if (!continueUrl) return "/Login";
    try {
      const url = new URL(continueUrl, window.location.origin);
      return url.origin === window.location.origin ? url.pathname + url.search : "/Login";
    } catch {
      return "/Login";
    }
  })();

  const handled = mode === "verifyEmail" || mode === "recoverEmail";

  useEffect(() => {
    if (!handled || !oobCode) return;
    let active = true;
    (async () => {
      const { applyActionCode } = await import("firebase/auth");
      try {
        await applyActionCode(auth, oobCode);
        // The signed-in user object caches emailVerified, so refresh it before
        // the redirect or the access gate would still read "not verified".
        await auth.currentUser?.reload().catch(() => undefined);
        if (active) setState("done");
      } catch {
        if (active) setState("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, [handled, oobCode]);

  // Count down, then send them into the site.
  useEffect(() => {
    if (state !== "done") return;
    if (countdown <= 0) {
      navigate(safeContinuePath, { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown, safeContinuePath, navigate]);

  // Password resets already have a screen; keep the oobCode with them.
  if (mode === "resetPassword") {
    return <Navigate to={`/Reset?oobCode=${encodeURIComponent(oobCode)}`} replace />;
  }
  if (!handled) return <Navigate to="/Login" replace />;

  const verifying = mode === "verifyEmail";

  return (
    <>
      <MarketingTopBar context="auth" />
      <div className="authShell">
        <Seo noindex title="Email Confirmed | Snagem Guild" />
        <AuthCard title={verifying ? "Verifying your email" : "Restoring your email"} maw={540}>
          <Stack gap={12}>
            {state === "working" && (
              <Text c="dimmed" size="sm" role="status" aria-live="polite">
                One moment, confirming the link you opened.
              </Text>
            )}

            {state === "done" && (
              <>
                <Alert color="teal" title="All set" role="status" aria-live="polite">
                  {verifying
                    ? "Your email address is verified. An admin still reviews your application before the guild opens up, and you will hear back by email."
                    : "Your email address has been restored."}
                </Alert>
                <Text c="dimmed" size="sm">
                  Taking you back to the site in {countdown}...
                </Text>
                <Button
                  fullWidth
                  size="lg"
                  radius={0}
                  className="authBtnPrimary"
                  variant="gradient"
                  gradient={warmGradient}
                  onClick={() => navigate(safeContinuePath, { replace: true })}
                >
                  Continue now
                </Button>
              </>
            )}

            {state === "failed" && (
              <>
                <Alert color="yellow" title="That link did not work" role="status" aria-live="polite">
                  Verification links expire, and each one can only be used once. If you already
                  verified, just log in. Otherwise log in and ask for a fresh link from the screen
                  that appears.
                </Alert>
                <Anchor component={Link} to="/Login" size="sm">
                  Go to login
                </Anchor>
              </>
            )}
          </Stack>
        </AuthCard>
      </div>
    </>
  );
}
