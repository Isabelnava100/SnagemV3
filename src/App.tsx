import { Box, Flex, Paper } from "@mantine/core";
import { useMediaQuery as useMediaQueryCore } from "@mantine/hooks";
import { memo } from "react";
import { Outlet } from "react-router-dom";
import { SideBar } from "./components/navigation/SideBar";
import { useAuth } from "./context/AuthContext";
import useMediaQuery from "./hooks/useMediaQuery";

export const App = memo(() => {
  const { user } = useAuth();
  const loginName = user ? "Profile" : "Login";
  const isUnder900 = useMediaQueryCore("(max-width: 900px)");
  const hasLessHeight = useMediaQueryCore("(max-height: 900px)");
  const { isOverMd } = useMediaQuery();

  return (
    <Box
      style={{
        // 100dvh tracks mobile browser toolbars; 100vh is the fallback
        height: "100dvh",
        width: "100%",
        maxWidth: 1920,
        overflow: "hidden",
      }}
      mx="auto"
      p={0}
    >
      <Flex
        sx={{
          flexDirection: isUnder900 ? "column" : "row",
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
          style={
            isUnder900
              ? {
                  // App-style bottom tab bar: fixed to the bottom edge, above content.
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  width: "100%",
                  zIndex: 200,
                }
              : {
                  height: "auto",
                  maxHeight: "100%",
                  overflowY: "auto",
                  width: hasLessHeight ? 120 : 150,
                }
          }
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
            // Clear the fixed bottom bar (bar height + home-indicator inset).
            paddingBottom: isUnder900 ? "calc(74px + env(safe-area-inset-bottom))" : undefined,
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
            <Box sx={{ width: "100%", height: "100%", overflowX: "hidden" }} id="app-layout-main">
              <Outlet />
            </Box>
          </Paper>
        </div>
        {/* {!isOverMd &&
          (user ? (
            <Flex align="center" mih={65} px={17} justify="space-between" bg="#1E1E1E" w="100%">
              <Title order={4} size={20} color="white">
                Welcome, {user?.displayName}
              </Title>
              <ActionIcon variant="transparent" size={35} h="auto">
                <Image src={Bell} w={35} />
              </ActionIcon>
            </Flex>
          ) : ( 
            <Flex align="center" mih={65} px={17} justify="space-between" bg="#1E1E1E" w="100%">
              <Group noWrap align="center" sx={{ gap: "0.25rem" }}>
                <Image src={TeamSnagemLogoSrc} alt="Team Snagem Logo" width="3.125rem" />
                <Title order={4} transform="uppercase" size="1rem" color="white">
                  SNAGEM HEADQUATERS
                </Title>
              </Group>
              <Button
                variant="subtle"
                sx={{ color: "#8C2595" }}
                color="#8C2595"
                rightIcon={<Image src={DirectRight} />}
              >
                Login
              </Button>
            </Flex>
          ))} */}
      </Flex>
    </Box>
  );
});
