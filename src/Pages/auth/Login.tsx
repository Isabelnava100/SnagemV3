import {
  Anchor,
  Button,
  Divider,
  Grid,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconBrandGoogle } from "@tabler/icons-react";
import { AccessGate } from "../../components/auth/AccessGate";
import Seo from "../../components/common/Seo";
import { MarketingTopBar } from "../../components/redesign/Marketing";
import { useAuth } from "../../context/AuthContext";
import { AuthCard, coolGradient, warmGradient } from "./components/AuthCard";
import {
  handleGoogleSignIn,
  lastGoogleEmail,
  resolveGoogleRedirect,
  type GoogleSignInResult,
} from "./components/GoogleHandle";
import { handleSignIn, lastSignInContext, resendVerificationEmail } from "./components/LoginHandle";

const EEVEE_IMG =
  "https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/site%2Fsleepingeevee.png?alt=media&token=72f49c9d-9479-441f-bae3-4191b18ba42f";

export function Login() {
  const navigate = useNavigate();
  const [submitted, setSub] = useState(false);
  const [googleError, setGoogleError] = useState("");
  // Application still in the NewUsers queue: verified, but no admin decision
  // yet. Shown as step 2 of the access gate.
  const [pendingEmail, setPendingEmail] = useState("");
  // Unverified password accounts land here instead of the dashboard: the form
  // keeps their credentials so "Resend" can re-authenticate just long enough
  // to send a fresh link (see resendVerificationEmail).
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const { setUser, user } = useAuth();
  const gateEmail = unverifiedEmail || pendingEmail;
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email."),
    },
  });

  useEffect(() => {
    // The gate screen suppresses the redirect: resending briefly signs the
    // unverified user back in, which would otherwise bounce them to the
    // dashboard through this effect.
    if (user && !gateEmail) {
      navigate("/Dashboard");
    }
  }, [user, gateEmail]);

  // No session on this screen (the gate signed them back out), so a resend has
  // to re-authenticate with the credentials still on the form.
  const onResend = () => resendVerificationEmail(form.values.email, form.values.password);

  // Shared result handling for the popup path and the redirect round-trip.
  const handleGoogleResult = (result: GoogleSignInResult | null) => {
    if (result === null || result === "redirect") return;
    if (result === "success") {
      navigate("/Dashboard");
    } else if (result === "pending") {
      setPendingEmail(lastGoogleEmail || form.values.email || "your account");
    } else if (result === "no-account") {
      setGoogleError("No account matches that Google email. Apply to join first.");
    } else if (result === "auth/account-exists-with-different-credential") {
      // Firebase is set to one account per email, so Google cannot sign into an
      // address that was registered with a password. Point them at the form.
      setGoogleError(
        "That email already has a password account here. Log in with your email and password above."
      );
    } else if (result === "auth/popup-blocked") {
      setGoogleError("Your browser blocked the Google popup. Allow popups for this site and retry.");
    } else if (result === "auth/unauthorized-domain") {
      setGoogleError("This domain is not authorized for Google sign-in yet. Tell an admin.");
    } else if (result === "auth/operation-not-allowed") {
      setGoogleError("Google sign-in is switched off for this project. Tell an admin.");
    } else if (result !== "auth/popup-closed-by-user" && result !== "auth/cancelled-popup-request") {
      // Show the raw code: a bare "try again" makes these impossible to debug
      // from a screenshot.
      setGoogleError(`Google sign-in failed (${result}). Please try again.`);
    }
  };

  useEffect(() => {
    // Pick up a Google sign-in returning via full-page redirect (the fallback
    // for browsers whose popup handshake fails, e.g. third-party storage
    // blocked in Chrome).
    let live = true;
    resolveGoogleRedirect(setUser).then((result) => {
      if (live) handleGoogleResult(result);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGoogle = async () => {
    setSub(true);
    setGoogleError("");
    const result = await handleGoogleSignIn(setUser);
    handleGoogleResult(result);
    // "redirect" means the page is navigating to Google; keep the spinner.
    if (result !== "redirect") setSub(false);
  };

  // "Wrong email" path: the gate already signed them out, but sign out again
  // defensively (a resend attempt may have left a transient session), then
  // drop them back on the empty form.
  const onWrongEmail = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("../../context/firebase");
    await signOut(auth).catch(() => undefined);
    setUnverifiedEmail("");
    setPendingEmail("");
    form.reset();
  };

  // Both "not verified yet" and "verified, waiting on an admin" land on the
  // same two-step gate, so an applicant always sees the whole path in.
  if (gateEmail) {
    return (
      <>
        <MarketingTopBar context="auth" />
        <div className="authShell">
          <Seo noindex title="Almost In | Snagem Guild" />
          <AuthCard title="Almost in" maw={900}>
            <AccessGate
              email={gateEmail}
              emailVerified={!unverifiedEmail}
              approved={lastSignInContext.approved}
              isGaia={lastSignInContext.isGaia}
              onResend={onResend}
              footer={
                <Group gap={10}>
                  <Anchor component="button" type="button" size="sm" onClick={onWrongEmail}>
                    Wrong email? Start over with a different address
                  </Anchor>
                </Group>
              }
            />
          </AuthCard>
        </div>
      </>
    );
  }

  return (
    <>
      <MarketingTopBar context="auth" />
      <div className="authShell">
      <Seo noindex title="Log In | Snagem Guild" />
      <AuthCard title="Access the Dashboard" maw={780}>
        <form
          onSubmit={form.onSubmit(async (values) => {
            setSub(true);
            const results = await handleSignIn(values.email, values.password, setUser);
            if (results === "auth/user-not-found" || results === "auth/invalid-credential" || results === "auth/invalid-email") {
              form.setFieldError("email", "Invalid email or password");
              form.setFieldError("password", "Invalid email or password");
            } else if (results === "auth/wrong-password") {
              form.setFieldError("password", "Invalid password");
            } else if (results === "auth/too-many-requests") {
              form.setFieldError("email", "Too many attempts");
            } else if (results === "pending") {
              setPendingEmail(values.email);
            } else if (results === "unlinked") {
              form.setFieldError(
                "email",
                "This login isn't linked to a member profile yet. Contact an admin to finish setting up your account."
              );
            } else if (results === "unverified") {
              setUnverifiedEmail(values.email);
            } else if (results === "success") {
              form.reset();
              navigate("/Dashboard");
            } else {
              form.setFieldError("email", "An unexpected error occurred");
            }
            setSub(false);
          })}
        >
          <Grid gap="xl" align="center">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <TextInput
                label="Email Address"
                required
                {...form.getInputProps("email")}
              />
              <PasswordInput
                mt="md"
                required
                label="Password"
                {...form.getInputProps("password")}
              />
              <Group justify="right" mt={6}>
                <Anchor component={Link} to="/Forgot" size="sm" c="dimmed">
                  Forgot your password?
                </Anchor>
              </Group>
              <Button
                type="submit"
                fullWidth
                mt="xl"
                size="lg"
                radius={0}
                className="authBtnPrimary"
                variant="gradient"
                gradient={warmGradient}
                disabled={submitted}
              >
                {submitted ? "Loading..." : "LOG IN"}
              </Button>
              <Divider label="or" labelPosition="center" my="md" />
              <Button
                fullWidth
                variant="default"
                radius="md"
                leftSection={<IconBrandGoogle size={18} />}
                onClick={onGoogle}
                disabled={submitted}
              >
                Continue with Google
              </Button>
              {googleError && (
                <Text c="red" size="sm" mt="xs" ta="center">
                  {googleError}
                </Text>
              )}
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Stack align="center" gap="sm">
                <img src={EEVEE_IMG} alt="Sleeping Eevee" className="authEevee" />
                <Text size="sm" c="dimmed">
                  Don&apos;t have an account yet?
                </Text>
                <Button
                  component={Link}
                  to="/Register"
                  radius={0}
                  className="authBtnPrimary"
                  variant="gradient"
                  gradient={coolGradient}
                >
                  Apply to Join
                </Button>
              </Stack>
            </Grid.Col>
          </Grid>
        </form>
      </AuthCard>
      </div>
    </>
  );
}
