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
    return <>You must be logged in to see this page.</>;
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
