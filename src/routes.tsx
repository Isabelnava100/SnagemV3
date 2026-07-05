import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { MantineEmotionProvider, emotionTransform } from "@mantine/emotion";
import "@mantine/tiptap/styles.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
const { ErrorPage } = lazyImport(() => import("./components/navigation/error-page"), "ErrorPage");
const { default: ComingSoon } = lazyImport(() => import("./Pages/ComingSoon"), "default");
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

// Admin routes
const { default: Admin } = lazyImport(() => import("./Pages/User/Dashboard/Admin"), "default");
const { default: AdjustLists } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/AdjustLists"),
  "default"
);
const { default: Donate } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/Donate"),
  "default"
);
const { default: AdminAnnouncements } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/Announcements"),
  "default"
);
const { default: AdminPermissions } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/Permissions"),
  "default"
);
const { default: AdminMysteryBoxes } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/MysteryBoxes"),
  "default"
);
const { default: AdminBadges } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/Badges"),
  "default"
);
const { default: AdminSEO } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/SEO"),
  "default"
);
const { default: AdminImports } = lazyImport(
  () => import("./Pages/User/Dashboard/Admin/Imports"),
  "default"
);
const { default: Onboarding } = lazyImport(() => import("./Pages/User/Onboarding"), "default");
const { default: Policies } = lazyImport(() => import("./Pages/Policies"), "default");

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

export default function AppRoutes() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark" stylesTransform={emotionTransform}>
      <MantineEmotionProvider>
    <AuthContextProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
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
                      <Route path="Items" element={<Items />} />
                      <Route path="Characters" element={<Characters />} />
                      <Route path="Pokemon/:teamId" element={<PokemonTeam />} />
                      <Route path="Pokemon" element={<Pokemons />} />
                      <Route path="Profile" element={<Profile />} />
                      <Route path="Admin-Access" element={<Admin />}>
                        <Route index element={<Navigate to="Adjust-Lists" />} />
                        <Route path="Adjust-Lists" element={<AdjustLists />} />
                        <Route path="Donate" element={<Donate />} />
                        <Route path="Announcements" element={<AdminAnnouncements />} />
                        <Route path="Permissions" element={<AdminPermissions />} />
                        <Route path="Mystery-Boxes" element={<AdminMysteryBoxes />} />
                        <Route path="Badges" element={<AdminBadges />} />
                        <Route path="SEO" element={<AdminSEO />} />
                        <Route path="Imports" element={<AdminImports />} />
                      </Route>
                      <Route path="Settings" element={<Settings />}>
                        <Route index element={<Navigate to="Notifications" />} />
                        <Route path="Notifications" element={<Notifications />} />
                        <Route path="Collections" element={<Collections />} />
                        <Route path="Signature" element={<Signature />} />
                        <Route path="Accessibility" element={<Accessibility />} />
                      </Route>
                      <Route path="*" element={<Navigate to="" />} />
                    </Route>
                    {/* Designed-but-unbuilt sidebar modules get a friendly placeholder. */}
                    <Route path="/Shop" element={<ComingSoon module="The Marketplace" />} />
                    <Route path="/Users" element={<ComingSoon module="The Users directory" />} />
                    <Route path="/Users/:username" element={<PublicProfile />} />
                    <Route path="/Activities" element={<ComingSoon module="Activities" />} />
                    <Route path="/Missions" element={<ComingSoon module="Missions" />} />
                    <Route
                      path="/Onboarding"
                      element={
                        <Protect>
                          <Onboarding />
                        </Protect>
                      }
                    />
                    <Route path="/Policies" element={<Policies />} />
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
