import { Alert, Anchor, Badge, Box, Button, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { IconCircleCheck, IconClockHour4, IconMailForward } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * The two-step entry gate every new account passes before the guild opens up:
 *
 *   1. verify the email address (self-serve, with a throttled resend)
 *   2. wait for an admin to review the roleplay application
 *
 * Both steps render side by side as cards so an applicant can always see where
 * they are and what is left. Used from the login screen (no session: resend
 * re-authenticates with the credentials on the form) and from Protect (session
 * exists: resend goes straight through Firebase).
 */

/** Applicants may ask for a fresh verification link once every 10 minutes. */
export const RESEND_COOLDOWN_MINUTES = 10;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_MINUTES * 60 * 1000;

const resendKey = (email: string) => "snagem:verifyresend:" + email.trim().toLowerCase();

/** Milliseconds left on the throttle for this address, 0 when it is free. */
export function resendWaitMs(email: string): number {
  if (!email) return 0;
  const raw = localStorage.getItem(resendKey(email));
  const last = raw ? Number(raw) : 0;
  if (!last || Number.isNaN(last)) return 0;
  return Math.max(0, last + RESEND_COOLDOWN_MS - Date.now());
}

/** Stamp a send so the throttle survives a reload or a new tab. */
export function markResend(email: string): void {
  if (email) localStorage.setItem(resendKey(email), String(Date.now()));
}

function countdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function StepCard(props: {
  step: string;
  title: string;
  done: boolean;
  /** Blocked by an earlier step, or (for review) sitting with the staff. */
  waiting?: boolean;
  /** Badge wording for the waiting state; the default reads "Waiting". */
  waitingLabel?: string;
  /** Greyed out because an earlier step has to clear first. */
  blocked?: boolean;
  children: React.ReactNode;
}) {
  const state = props.done ? "done" : props.blocked ? "blocked" : "active";
  return (
    <Box
      p={18}
      h="100%"
      bg="#211f21"
      style={{
        borderRadius: 12,
        border: `1px solid ${state === "done" ? "#2f9e69" : state === "active" ? "#762B77" : "#3a383a"}`,
        opacity: state === "blocked" ? 0.7 : 1,
      }}
    >
      <Stack gap={10}>
        <Group gap={8} wrap="nowrap">
          <Text fz={12} fw={700} c="dimmed" tt="uppercase">
            Step {props.step}
          </Text>
          {props.done ? (
            <Badge
              size="sm"
              variant="light"
              color="teal"
              leftSection={<IconCircleCheck size={12} />}
            >
              Done
            </Badge>
          ) : props.waiting ? (
            <Badge size="sm" variant="light" color="gray" leftSection={<IconClockHour4 size={12} />}>
              {props.waitingLabel ?? "Waiting"}
            </Badge>
          ) : (
            <Badge size="sm" variant="light" color="yellow">
              Action needed
            </Badge>
          )}
        </Group>
        <Title order={2} c="white" fz={20} fw={700}>
          {props.title}
        </Title>
        {props.children}
      </Stack>
    </Box>
  );
}

export function AccessGate(props: {
  email: string;
  emailVerified: boolean;
  /** Sends a fresh verification email. Resolves "sent" on success. */
  onResend: () => Promise<string>;
  /** Re-checks Firebase for a verification that just happened in another tab. */
  onRecheck?: () => Promise<void>;
  /** Rendered under the cards (sign out, back to login, and so on). */
  footer?: React.ReactNode;
}) {
  const { email, emailVerified } = props;
  // Google applicants can reach the gate without an address on hand, so never
  // render a sentence that starts with a blank.
  const shown = email || "Your email address";
  const [resending, setResending] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [message, setMessage] = useState("");
  const [waitMs, setWaitMs] = useState(() => resendWaitMs(email));

  // Tick the throttle down once a second while it is running.
  useEffect(() => {
    setWaitMs(resendWaitMs(email));
    const t = setInterval(() => setWaitMs(resendWaitMs(email)), 1000);
    return () => clearInterval(t);
  }, [email]);

  const onResend = async () => {
    if (waitMs > 0) return;
    setResending(true);
    setMessage("");
    const result = await props.onResend();
    if (result === "sent") {
      markResend(email);
      setWaitMs(RESEND_COOLDOWN_MS);
      setMessage(`Verification email sent to ${email}. Check your spam folder too.`);
    } else if (result === "auth/too-many-requests") {
      setMessage("Firebase is rate limiting this address. Wait a few minutes and try again.");
    } else {
      setMessage("Could not send the email. Try again in a moment.");
    }
    setResending(false);
  };

  const onRecheck = async () => {
    if (!props.onRecheck) return;
    setRechecking(true);
    await props.onRecheck();
    setRechecking(false);
  };

  return (
    <Stack gap={16}>
      <Grid gap={16}>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <StepCard step="01" title="Verify your email" done={emailVerified}>
            {emailVerified ? (
              <Text fz={14} c="dimmed">
                <b>{shown}</b> is verified. Nothing else to do here.
              </Text>
            ) : (
              <>
                <Text fz={14} c="dimmed">
                  We sent a verification link to <b>{shown}</b>. Open it, then come back and log in.
                  Not there? Check your spam folder first, then ask for a new one.
                </Text>
                <Button
                  leftSection={<IconMailForward size={16} />}
                  onClick={onResend}
                  disabled={resending || waitMs > 0}
                  variant="light"
                  color="grape"
                >
                  {waitMs > 0
                    ? `New link available in ${countdown(waitMs)}`
                    : resending
                      ? "Sending..."
                      : "Resend verification email"}
                </Button>
                <Text fz={12} c="dimmed">
                  One email every {RESEND_COOLDOWN_MINUTES} minutes.
                </Text>
                {props.onRecheck && (
                  <Anchor component="button" type="button" fz={14} onClick={onRecheck}>
                    {rechecking ? "Checking..." : "I verified it, check again"}
                  </Anchor>
                )}
                {message && (
                  <Text fz={14} c="dimmed" role="status" aria-live="polite">
                    {message}
                  </Text>
                )}
              </>
            )}
          </StepCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          {/* Step 2 is never "done" on this screen: once an admin approves, the
              member is let straight through to the dashboard. It is always the
              staff's turn, so it never asks the applicant for an action. */}
          <StepCard
            step="02"
            title="Admin review"
            done={false}
            waiting
            waitingLabel={emailVerified ? "Under review" : "Waiting on step 1"}
            blocked={!emailVerified}
          >
            {emailVerified ? (
              <>
                <Text fz={14} c="dimmed">
                  Your email is verified, so your application is now with the team. Every one is read
                  by hand, so give it a day or two.
                </Text>
                <Text fz={14} c="dimmed">
                  You will get an email either way: a welcome message once you are accepted, or a
                  note explaining why you were turned down and whether you can apply again.
                </Text>
              </>
            ) : (
              <Text fz={14} c="dimmed">
                Once your email is verified, an admin reviews your roleplay application. That
                usually takes a day or two, and you will hear back by email either way.
              </Text>
            )}
          </StepCard>
        </Grid.Col>
      </Grid>

      <Alert color="grape" variant="light" role="status" aria-live="polite">
        Both steps have to be cleared before your dashboard and the new trainer setup open up.
      </Alert>

      {props.footer}
    </Stack>
  );
}

/**
 * Whether the signed-in account still has a step to clear. Both flags read the
 * auth context, so no extra Firestore read happens here.
 *
 * Fails OPEN on unknown state: `profileExists` is undefined when the users doc
 * read failed (offline, rules hiccup), and an approved member must never be
 * locked out by a flaky read.
 */
export function useAccessGate(): {
  gated: boolean;
  needsVerification: boolean;
  needsApproval: boolean;
} {
  const { user } = useAuth();
  const needsVerification = !!user && user.emailVerified === false;
  const needsApproval = !!user && user.profileExists === false;
  return { gated: needsVerification || needsApproval, needsVerification, needsApproval };
}

/**
 * The gate wired to the live session: resend goes straight through Firebase
 * (there IS a session here, unlike on the login screen), and "check again"
 * reloads the auth user so a link opened in another tab is picked up.
 */
export function SignedInAccessGate() {
  const { user, setUser } = useAuth();
  const { needsVerification } = useAccessGate();

  const onResend = async () => {
    const { sendEmailVerification } = await import("firebase/auth");
    const { auth } = await import("../../context/firebase");
    if (!auth.currentUser) return "error";
    try {
      await sendEmailVerification(auth.currentUser);
      return "sent";
    } catch (error: any) {
      return error?.code || "error";
    }
  };

  // emailVerified is baked into the cached auth user, so a link opened
  // elsewhere only shows up after reloading the Firebase user.
  const onRecheck = async () => {
    const { auth } = await import("../../context/firebase");
    if (!auth.currentUser || !user) return;
    await auth.currentUser.reload().catch(() => undefined);
    if (auth.currentUser.emailVerified) setUser({ ...user, emailVerified: true });
  };

  const onSignOut = async () => {
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("../../context/firebase");
    await signOut(auth).catch(() => undefined);
  };

  return (
    <AccessGatePage
      email={user?.email ?? ""}
      emailVerified={!needsVerification}
      onResend={onResend}
      onRecheck={onRecheck}
      footer={
        <Group gap={10}>
          <Button variant="default" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
          <Button component={Link} to="/" variant="subtle" size="sm">
            Back to the site
          </Button>
        </Group>
      }
    />
  );
}

/** The gate as a standalone page (used by Protect for a signed-in applicant). */
export function AccessGatePage(props: Parameters<typeof AccessGate>[0]) {
  return (
    <Box maw={900} mx="auto" w="100%" p={16}>
      <Stack gap={14}>
        <Title order={1} c="white" fz={28} fw={800}>
          Almost in
        </Title>
        <Text fz={14} c="dimmed">
          Two things stand between you and the guild. Here is where you are.
        </Text>
        <AccessGate {...props} />
        <Text fz={14} c="dimmed">
          Questions in the meantime? Read up on the guild in the{" "}
          <Anchor component={Link} to="/Library" fz={14}>
            Library
          </Anchor>
          .
        </Text>
      </Stack>
    </Box>
  );
}
