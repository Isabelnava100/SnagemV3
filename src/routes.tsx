import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./assets/styles/index.css";

const App = (await import("./App")).default;
const HomePage = (await import("./Pages/Homepage")).default;
const { LeadGrid } = await import("./Pages/User/Dashboard");
const { ForgotPassword } = await import("./Pages/auth/ForgotPW");
const { Login } = await import("./Pages/auth/Login");
const { NewRegister } = await import("./Pages/auth/NewRegister");
const { ResetPW } = await import("./Pages/auth/ResetPW");
const MainForum = (await import("./Pages/forum/mainForumLayout/MainForum")).default;
const MiniNavForum = (await import("./Pages/forum/mainForumLayout/components/MiniNavForum"))
  .default;
const Threads = (await import("./Pages/forum/mainThreadLayout/MainThread")).default;
const { NewPost } = await import("./Pages/forum/newPost/NewPost");
const { NewTopic } = await import("./Pages/forum/newTopics/NewTopic");
const { ForumProvider } = await import("./Pages/forum/reusable-components/Provider");
const { ErrorPage } = await import("./components/navigation/error-page");
const Protect = (await import("./components/navigation/Protect")).default;
const { AuthContextProvider } = await import("./context/AuthContext");

import { theme } from "./lib/mantine";

export default function AppRoutes() {
  return (
    <AuthContextProvider>
      <ForumProvider>
        <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
          <BrowserRouter>
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
          </BrowserRouter>
        </MantineProvider>
      </ForumProvider>
    </AuthContextProvider>
  );
}
