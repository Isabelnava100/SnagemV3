import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { MantineEmotionProvider, emotionTransform } from "@mantine/emotion";
import { Notifications as MantineNotifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./assets/styles/index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ErrorBoundary } from "./components/navigation/ErrorBoundary";
import { Loader } from "./components/navigation/loading";
import { theme } from "./lib/mantine";
import { queryClient } from "./lib/react-query";
import { lazyImport } from "./utils/lazyImport";

const { App } = lazyImport(() => import("./App"), "App");
const { HomePage } = lazyImport(() => import("./Pages/Homepage"), "HomePage");
const { Dashboard } = lazyImport(() => import("./Pages/User/Dashboard"), "Dashboard");
const { ForgotPassword } = lazyImport(() => import("./Pages/auth/ForgotPW"), "ForgotPassword");
const { Login } = lazyImport(() => import("./Pages/auth/Login"), "Login");
const { NewRegister } = lazyImport(() => import("./Pages/auth/NewRegister"), "NewRegister");
const { ResetPW } = lazyImport(() => import("./Pages/auth/ResetPW"), "ResetPW");
const { default: ForumIndex } = lazyImport(
  () => import("./Pages/forum/pages/ForumIndex"),
  "default"
);
const { default: ThreadView } = lazyImport(
  () => import("./Pages/forum/pages/ThreadView"),
  "default"
);
const { default: NewThreadComposer } = lazyImport(
  () => import("./Pages/forum/pages/NewThreadComposer"),
  "default"
);
const { default: PostComposer } = lazyImport(
  () => import("./Pages/forum/pages/PostComposer"),
  "default"
);
const { default: HostMenu } = lazyImport(
  () => import("./Pages/forum/pages/HostMenu"),
  "default"
);
const { default: ThreadRewards } = lazyImport(
  () => import("./Pages/forum/pages/ThreadRewards"),
  "default"
);
const { default: PublicProfile } = lazyImport(
  () => import("./Pages/User/PublicProfile"),
  "default"
);
const { default: Users } = lazyImport(() => import("./Pages/User/Users"), "default");
const { default: Missions } = lazyImport(() => import("./Pages/Missions"), "default");
const { default: Mall } = lazyImport(() => import("./Pages/Mall"), "default");
const { default: Research } = lazyImport(() => import("./Pages/Research"), "default");
const { default: Colosseum } = lazyImport(() => import("./Pages/Colosseum"), "default");
const { default: Challenges } = lazyImport(() => import("./Pages/Challenges"), "default");
const { default: Casino } = lazyImport(() => import("./Pages/Casino"), "default");
const { default: MissionDetail } = lazyImport(() => import("./Pages/Missions/MissionDetail"), "default");
const { ErrorPage } = lazyImport(() => import("./components/navigation/error-page"), "ErrorPage");
const { default: Activities } = lazyImport(() => import("./Pages/Activities"), "default");
const { Protect } = lazyImport(() => import("./components/navigation/Protect"), "Protect");
const { AuthContextProvider } = lazyImport(
  () => import("./context/AuthContext"),
  "AuthContextProvider"
);
const { default: Bookmarks } = lazyImport(
  () => import("./Pages/User/Dashboard/Bookmarks"),
  "default"
);
const { default: Characters } = lazyImport(
  () => import("./Pages/User/Dashboard/Characters"),
  "default"
);
const { default: Drafts } = lazyImport(() => import("./Pages/User/Dashboard/Drafts"), "default");
const { default: History } = lazyImport(() => import("./Pages/User/Dashboard/History"), "default");
const { default: Items } = lazyImport(() => import("./Pages/User/Dashboard/Items"), "default");
const { default: Pokemons } = lazyImport(
  () => import("./Pages/User/Dashboard/Pokemons"),
  "default"
);
const { default: Profile } = lazyImport(() => import("./Pages/User/Dashboard/Profile"), "default");
const { default: PokemonTeam } = lazyImport(
  () => import("./Pages/User/Dashboard/PokemonTeam"),
  "default"
);

// Admin routes. All admin tools now live under the top-level /Admin page; the
// individual tool components are imported directly there, not routed here.
const { default: AdminPage } = lazyImport(() => import("./Pages/Admin"), "default");
const { default: SiteSettings } = lazyImport(
  () => import("./Pages/User/Dashboard/SiteSettings"),
  "default"
);
const { default: Onboarding } = lazyImport(() => import("./Pages/User/Onboarding"), "default");
const { default: Policies } = lazyImport(() => import("./Pages/Policies"), "default");
const { default: Library } = lazyImport(() => import("./Pages/Library"), "default");
const { default: About } = lazyImport(() => import("./Pages/About"), "default");
const { default: Announcements } = lazyImport(() => import("./Pages/Announcements"), "default");
const { default: SnagAgent } = lazyImport(() => import("./Pages/SnagAgent"), "default");

const { default: Settings } = lazyImport(
  () => import("./Pages/User/Dashboard/Settings"),
  "default"
);
const { default: Notifications } = lazyImport(
  () => import("./Pages/User/Dashboard/Settings/Notifications"),
  "default"
);
const { default: Collections } = lazyImport(
  () => import("./Pages/User/Dashboard/Settings/Collections"),
  "default"
);
const { default: Signature } = lazyImport(
  () => import("./Pages/User/Dashboard/Settings/Signature"),
  "default"
);
const { default: Accessibility } = lazyImport(
  () => import("./Pages/User/Dashboard/Settings/Accessibility"),
  "default"
);

/** Scroll to the top whenever the route changes (browser SPA default is to keep the old position). */
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function AppRoutes() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark" stylesTransform={emotionTransform}>
      <MantineEmotionProvider>
        <MantineNotifications position="top-right" />
    <AuthContextProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <ScrollToTop />
              <ErrorBoundary>
              <React.Suspense fallback={<Loader />}>
                <Routes>
                  <Route path="/" element={<App />}>
                    <Route index element={<HomePage />} />
                    <Route
                      path="/Dashboard"
                      element={
                        <Protect>
                          <Dashboard />
                        </Protect>
                      }
                    >
                      <Route index element={<Navigate to="Bookmarks" />} />
                      <Route path="Bookmarks" element={<Bookmarks />} />
                      <Route path="Drafts" element={<Drafts />} />
                      <Route path="History" element={<History />} />
                      <Route path="Items" element={<Items />} />
                      <Route path="Characters" element={<Characters />} />
                      <Route path="Pokemon/:teamId" element={<PokemonTeam />} />
                      <Route path="Pokemon" element={<Pokemons />} />
                      <Route path="Profile" element={<Profile />} />
                      {/* Admin moved to the top-level /Admin page; old links redirect. */}
                      <Route path="Admin-Access/*" element={<Navigate to="/Admin" replace />} />
                      <Route path="Settings" element={<Settings />}>
                        <Route index element={<Navigate to="Notifications" />} />
                        <Route path="Notifications" element={<Notifications />} />
                        <Route path="Collections" element={<Collections />} />
                        <Route path="Signature" element={<Signature />} />
                        <Route path="Accessibility" element={<Accessibility />} />
                      </Route>
                      <Route path="*" element={<Navigate to="" />} />
                    </Route>
                    {/* Standalone (outside the Dashboard shell) so it reads as its
                        own admin page, not another dashboard tab. Same URL, so the
                        SideBar link keeps working. */}
                    <Route
                      path="/Dashboard/Site-Settings"
                      element={
                        <Protect>
                          <SiteSettings />
                        </Protect>
                      }
                    />
                    {/* Designed-but-unbuilt sidebar modules get a friendly placeholder. */}
                    <Route path="/Shop" element={<Mall />} />
                    <Route
                      path="/Admin"
                      element={
                        <Protect>
                          <AdminPage />
                        </Protect>
                      }
                    />
                    <Route path="/Users" element={<Users />} />
                    <Route path="/Users/:username" element={<PublicProfile />} />
                    <Route path="/Activities" element={<Activities />} />
                    <Route path="/Missions" element={<Missions />} />
                    <Route path="/Missions/:id" element={<MissionDetail />} />
                    <Route path="/Research" element={<Research />} />
                    <Route path="/Colosseum" element={<Colosseum />} />
                    <Route path="/Challenges" element={<Challenges />} />
                    <Route path="/Casino" element={<Casino />} />
                    <Route
                      path="/Onboarding"
                      element={
                        <Protect>
                          <Onboarding />
                        </Protect>
                      }
                    />
                    <Route path="/About" element={<About />} />
                    <Route path="/Announcements" element={<Announcements />} />
                    <Route path="/SNAG" element={<SnagAgent />} />
                    <Route path="/Policies" element={<Policies />} />
                    <Route path="/Library" element={<Library />} />
                    <Route path="/Login" element={<Login />} />
                    <Route path="/Register" element={<NewRegister />} />
                    <Route path="/Forgot" element={<ForgotPassword />} />
                    <Route path="/Reset" element={<ResetPW />} />
                    <Route path="/Forum">
                      <Route index element={<Navigate to="Main-Forum" replace />} />
                      <Route path=":forum" element={<ForumIndex />} />
                      <Route
                        path=":forum/new"
                        element={
                          <Protect>
                            <NewThreadComposer />
                          </Protect>
                        }
                      />
                      <Route path=":forum/thread/:id/:page?" element={<ThreadView />} />
                      <Route
                        path=":forum/thread/:id/post"
                        element={
                          <Protect>
                            <PostComposer mode="new" />
                          </Protect>
                        }
                      />
                      <Route
                        path=":forum/thread/:id/edit/:postId"
                        element={
                          <Protect>
                            <PostComposer mode="edit" />
                          </Protect>
                        }
                      />
                      <Route
                        path=":forum/thread/:id/host"
                        element={
                          <Protect>
                            <HostMenu />
                          </Protect>
                        }
                      />
                      <Route
                        path=":forum/thread/:id/rewards"
                        element={
                          <Protect>
                            <ThreadRewards />
                          </Protect>
                        }
                      />
                    </Route>
                    <Route path="*" element={<ErrorPage />} />
                  </Route>
                </Routes>
              </React.Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </QueryClientProvider>
    </AuthContextProvider>
      </MantineEmotionProvider>
    </MantineProvider>
  );
}
