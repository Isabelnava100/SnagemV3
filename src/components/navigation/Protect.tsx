import { Button, Center, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type Props = {
  children: JSX.Element;
};

export const Protect = ({ children }: Props) => {
  const { user } = useAuth();
  // let {pathname} = useLocation();
  // console.log(pathname);
  // console.log(user?.otherinfo?.permissions);

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
