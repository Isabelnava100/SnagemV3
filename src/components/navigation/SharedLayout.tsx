import { Outlet } from "react-router-dom";

import { Button } from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import { HeaderMenuColored } from "./NavigationTest";
import useWindowDimensions from "./Screen";

interface HeaderSearchProps {
  links: { link: string; label: string; links: { link: string; label: string }[] }[];
}

function SharedLayout() {
  const [scroll, scrollTo] = useWindowScroll();
  const { height } = useWindowDimensions();

  const headerLinks: HeaderSearchProps = {
    links: [
      {
        link: "/login",
        label: "Login",
        links: [
          { link: "/profile", label: "Profile" },
          { link: "/logout", label: "Logout" },
        ],
      },
    ],
  };

  return (
    <>
      <HeaderMenuColored links={headerLinks.links} />
      <Outlet />
      {scroll.y > height && (
        <Button onClick={() => scrollTo({ y: 0 })} id="backtotop">
          <img src="" width="16" height="16" alt="scroll back to the top" />
        </Button>
      )}
    </>
  );
}

export default SharedLayout;
