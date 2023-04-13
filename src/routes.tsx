import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./assets/styles/index.css";

import React from "react";
import { Loader } from "./components/navigation/loading";
import { theme } from "./lib/mantine";
import { lazyImport } from "./utils/lazyImport";

const { App } = lazyImport(() => import("./App"), "App");
const { HomePage } = lazyImport(() => import("./Pages/Homepage"), "HomePage");
const { LeadGrid } = lazyImport(() => import("./Pages/User/Dashboard"), "LeadGrid");
const { ForgotPassword } = lazyImport(() => import("./Pages/auth/ForgotPW"), "ForgotPassword");
const { Login } = lazyImport(() => import("./Pages/auth/Login"), "Login");
const { NewRegister } = lazyImport(() => import("./Pages/auth/NewRegister"), "NewRegister");
const { ResetPW } = lazyImport(() => import("./Pages/auth/ResetPW"), "ResetPW");
const { MainForum } = lazyImport(
  () => import("./Pages/forum/mainForumLayout/MainForum"),
  "MainForum"
);
const { MiniNavForum } = lazyImport(
  () => import("./Pages/forum/mainForumLayout/components/MiniNavForum"),
  "MiniNavForum"
);
const { Threads } = lazyImport(
  () => import("./Pages/forum/mainThreadLayout/MainThread"),
  "Threads"
);
const { NewPost } = lazyImport(() => import("./Pages/forum/newPost/NewPost"), "NewPost");
const { NewTopic } = lazyImport(() => import("./Pages/forum/newTopics/NewTopic"), "NewTopic");
const { ForumProvider } = lazyImport(
  () => import("./Pages/forum/reusable-components/Provider"),
  "ForumProvider"
);
const { ErrorPage } = lazyImport(() => import("./components/navigation/error-page"), "ErrorPage");
const { Protect } = lazyImport(() => import("./components/navigation/Protect"), "Protect");
const { AuthContextProvider } = lazyImport(
  () => import("./context/AuthContext"),
  "AuthContextProvider"
);

export default function AppRoutes() {
  return (
    <AuthContextProvider>
      <ForumProvider>
        <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
          <BrowserRouter>
            <React.Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<App />}>
                  <Route index element={<HomePage />} />
                  <Route
                    path="/Profile"
                    element={
                      <Protect>
                        <LeadGrid />
                      </Protect>
                    }
                  />
                  <Route path="/Login" element={<Login />} />
                  <Route path="/Register" element={<NewRegister />} />
                  <Route path="/Forgot" element={<ForgotPassword />} />
                  <Route path="/Reset" element={<ResetPW />} />
                  <Route path="/Forum?/:forum" element={<MiniNavForum />}>
                    <Route index element={<MainForum />} />
                    <Route
                      path=":forum/new"
                      element={
                        <Protect>
                          <NewTopic />
                        </Protect>
                      }
                    />
                    <Route path=":forum/thread/:id/:page?" element={<Threads />} />
                    <Route
                      path=":forum/thread/:id/post"
                      element={
                        <Protect>
                          <NewPost />
                        </Protect>
                      }
                    />
                  </Route>
                  <Route path="*" element={<ErrorPage />} />
                </Route>
              </Routes>
            </React.Suspense>
          </BrowserRouter>
        </MantineProvider>
      </ForumProvider>
    </AuthContextProvider>
  );
}
