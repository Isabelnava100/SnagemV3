import { Button, Center, Stack, Text } from "@mantine/core";
import type { JSX } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loader } from "./loading";

type Props = {
  children: JSX.Element;
};

export const Protect = ({ children }: Props) => {
  const { user, pending } = useAuth();

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

  // if(pathname.includes('/Forum')){
  //     switch (true) {
  //         case pathname.includes('/Forum/3'):
  //         case pathname.includes('/Forum/6'):
  //         case pathname.includes('/Forum/7'):
  //             return <>You don't have the permissions to view this page.</>;
  //         default:
  //             return children;
  //       }
  // }

  return children;
};
