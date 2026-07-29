import { Button, Center, Group, Stack, Text } from "@mantine/core";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { AccessGatePage } from "../auth/AccessGate";
import { useAuth } from "../../context/AuthContext";
import { Loader } from "./loading";

type Props = {
  children: JSX.Element;
};

export const Protect = ({ children }: Props) => {
  const { user, pending, setUser } = useAuth();

  // The auth context no longer gates the tree on the first emission, so
  // protected routes must wait for it here before judging the user.
  if (pending) {
    return (
      <Center w="100%" h="100%">
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return (
      <Center w="100%" h="100%">
        <Stack>
          <Text>You must be logged in to view this page</Text>
          <Button component={Link} to="/Login">
            Login
          </Button>
        </Stack>
      </Center>
    );
  }

  // A Firebase session alone is not membership. A brand new applicant is signed
  // in the moment they register, so without this they could walk straight into
  // /Onboarding before verifying their email or being approved. Both steps are
  // shown as cards instead of a bare error so they know what is left.
  //
  // Fails open when profileExists is undefined: that means the users doc read
  // failed (offline, rules hiccup), not that the member is unapproved.
  const needsVerification = user.emailVerified === false;
  const needsApproval = user.profileExists === false;
  if (needsVerification || needsApproval) {
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

    // emailVerified is baked into the cached auth user, so a link opened in
    // another tab only shows up after a reload of the Firebase user.
    const onRecheck = async () => {
      const { auth } = await import("../../context/firebase");
      if (!auth.currentUser) return;
      await auth.currentUser.reload().catch(() => undefined);
      if (auth.currentUser.emailVerified) {
        setUser({ ...user, emailVerified: true });
      }
    };

    const onSignOut = async () => {
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("../../context/firebase");
      await signOut(auth).catch(() => undefined);
    };

    return (
      <AccessGatePage
        email={user.email ?? ""}
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

  return children;
};
