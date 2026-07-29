import { Button, Center, Stack, Text } from "@mantine/core";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { SignedInAccessGate, useAccessGate } from "../auth/AccessGate";
import { useAuth } from "../../context/AuthContext";
import { Loader } from "./loading";

type Props = {
  children: JSX.Element;
};

export const Protect = ({ children }: Props) => {
  const { user, pending } = useAuth();
  const { gated } = useAccessGate();

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

  // A Firebase session alone is not membership: a brand new applicant is signed
  // in the moment they register, so without this they could walk straight into
  // /Onboarding before verifying their email or being approved. App.tsx applies
  // the same gate to every route; this is the belt-and-braces copy for the
  // routes that are protected individually.
  if (gated) return <SignedInAccessGate />;

  return children;
};
