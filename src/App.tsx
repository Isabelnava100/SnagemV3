import { Box, Flex, Paper } from "@mantine/core";
import { useMediaQuery as useMediaQueryCore } from "@mantine/hooks";
import { Suspense, lazy, memo, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SignedInAccessGate, useAccessGate } from "./components/auth/AccessGate";

// The sidebar (and its query/firebase import chain) is lazy: marketing
// routes render without it, keeping the public boot graph small.
const SideBar = lazy(() =>
  import("./components/navigation/SideBar").then((m) => ({ default: m.SideBar }))
);

// Full-bleed routes rendered outside the app shell (no sidebar / bottom tabs /
// gradient frame): the marketing pages and the logged-out auth screens, which
// carry the marketing top bar instead. Matched case-insensitively.
const MARKETING_ROUTES = ["/", "/about", "/login", "/register", "/forgot", "/reset"];

// While an account is waiting on email verification or admin approval it sees
// the access gate on every route but these: the public marketing and auth
// screens (so "back to the site" and signing out still work) and the Library,
// which the gate links to for reading while they wait.
const GATE_EXEMPT_ROUTES = [...MARKETING_ROUTES, "/library"];

export const App = memo(() => {
  const isUnder900 = useMediaQueryCore("(max-width: 900px)");
  const hasLessHeight = useMediaQueryCore("(max-height: 900px)");
  const { pathname } = useLocation();
  const { gated } = useAccessGate();
  const route = pathname.toLowerCase().replace(/\/$/, "") || "/";

  // The static hero shell in index.html is permanent (React never re-renders
  // it, so the LCP paint is never replaced): show it on the marketing
  // homepage only, hide it everywhere else.
  useEffect(() => {
    const shell = document.getElementById("boot-shell");
    if (shell) shell.style.display = pathname === "/" ? "" : "none";
  }, [pathname]);

  // Site-wide gate: a logged-in but unverified or unapproved account sees the
  // two-step gate in place of whatever it navigated to. Rendered full bleed
  // (no sidebar) because none of the member navigation is open to them yet.
  if (gated && !GATE_EXEMPT_ROUTES.includes(route)) {
    return (
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        style={{ minHeight: "100dvh", background: "#0e0d11", outline: "none", paddingTop: 24 }}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SignedInAccessGate />
      </Box>
    );
  }

  if (MARKETING_ROUTES.includes(route)) {
    return (
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        style={{ minHeight: "100dvh", background: "#0e0d11", outline: "none" }}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Outlet />
      </Box>
    );
  }

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
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Flex
        sx={{
          flexDirection: isUnder900 ? "column" : "row",
          justifyContent: "center",
          alignItems: isUnder900 ? "center" : "start",
          width: "100%",
          height: "100%",
          // Redesign: flat near-black page, no colorful gradient frame.
          background: "#0e0d11",
          paddingTop: isUnder900 ? 0 : 16,
          paddingBottom: isUnder900 ? 0 : 16,
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
          <Suspense fallback={null}>
            <SideBar />
          </Suspense>
        </nav>
        <div
          style={{
            height: "100%",
            width: "100%",
            padding: isUnder900 ? 10 : undefined,
            paddingLeft: isUnder900 ? 10 : 24,
            paddingRight: isUnder900 ? 10 : 24,
            // Clear the fixed bottom bar (bar height + home-indicator inset).
            paddingBottom: isUnder900 ? "calc(74px + env(safe-area-inset-bottom))" : undefined,
            overflowX: "hidden",
          }}
        >
          <Paper
            sx={{
              height: "100%",
              width: "100%",
              // Flat, seamless content surface (no floating rounded frame).
              background: "#0e0d11",
              borderRadius: 0,
              overflowX: "hidden",
            }}
          >
            <Box
              component="main"
              id="main-content"
              tabIndex={-1}
              sx={{ width: "100%", height: "100%", overflowX: "hidden", outline: "none" }}
            >
              <Outlet />
            </Box>
          </Paper>
        </div>
        {/* {!isOverMd &&
          (user ? (
            <Flex align="center" mih={65} px={17} justify="space-between" bg="#1E1E1E" w="100%">
              <Title order={4} size={24} color="white">
                Welcome, {user?.displayName}
              </Title>
              <ActionIcon variant="transparent" size={35} h="auto">
                <Image src={Bell} alt="Notifications" w={35} />
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
                rightIcon={<Image src={DirectRight} alt="Login" />}
              >
                Login
              </Button>
            </Flex>
          ))} */}
      </Flex>
    </Box>
  );
});
