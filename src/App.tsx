import { Box, Flex, Paper } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { memo } from "react";
import { Outlet } from "react-router-dom";
import { SideBar } from "./components/navigation/SideBar";
import { useAuth } from "./context/AuthContext";

export const App = memo(() => {
  const { user } = useAuth();
  const loginName = user ? "Profile" : "Login";
  const isUnder900 = useMediaQuery("(max-width: 900px)");

  return (
    <Box
      style={{
        height: "100vh",
        width: "100%",
        maxWidth: 1920,
        overflow: "hidden",
      }}
      mx="auto"
      p={0}
    >
      <Flex
        sx={{
          flexDirection: isUnder900 ? "column-reverse" : "row",
          justifyContent: "center",
          alignItems: isUnder900 ? "center" : "start",
          width: "100%",
          height: "100%",
          background: "linear-gradient(90deg, #104459 0%, #A978B5 51.56%, #F79292 100%)",
          paddingTop: isUnder900 ? 0 : 40,
          paddingBottom: isUnder900 ? 0 : 40,
        }}
      >
        <nav
          style={{
            height: isUnder900 ? 70 : "auto",
            maxHeight: "100%",
            overflowY: "auto",
            width: isUnder900 ? "100%" : 150,
          }}
        >
          <SideBar />
        </nav>
        <div
          style={{
            height: "100%",
            width: "100%",
            padding: isUnder900 ? 10 : undefined,
            paddingLeft: isUnder900 ? 10 : 75,
            paddingRight: isUnder900 ? 10 : 75,
            overflowX: "hidden",
          }}
        >
          <Paper
            sx={{
              height: "100%",
              width: "100%",
              borderRadius: isUnder900 ? 8 : 60,
              overflowX: "hidden",
            }}
          >
            <Outlet />
          </Paper>
        </div>
      </Flex>
    </Box>
  );
});
