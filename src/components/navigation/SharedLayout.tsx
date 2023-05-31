import { Outlet } from "react-router-dom";

import { Button } from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import useWindowDimensions from "./Screen";

function SharedLayout() {
  const [scroll, scrollTo] = useWindowScroll();
  const { height } = useWindowDimensions();

  return (
    <>
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
