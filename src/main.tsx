import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import {  BrowserRouter , Routes, Route, Navigate } from "react-router-dom";
import { AuthContextProvider } from './context/AuthContext';
import { ErrorPage } from './components/navigation/error-page';
import App  from './App'
import './assets/styles/index.css';
import { LeadGrid } from './Pages/User/Dashboard';
import { Login } from './Pages/auth/Login';
import Protect from './components/navigation/Protect';
import { NewRegister } from './Pages/auth/NewRegister';
import { ForgotPassword } from './Pages/auth/ForgotPW';
import { ResetPW } from './Pages/auth/ResetPW';
import MainForum from './Pages/forum/mainForumLayout/MainForum';
import MiniNavForum from './Pages/forum/mainForumLayout/components/MiniNavForum';
import { NewTopic } from './Pages/forum/newTopics/NewTopic';
import Threads from './Pages/forum/mainThreadLayout/MainThread';
import { NewPost } from './Pages/forum/newPost/NewPost';
import HomePage from './Pages/Homepage';
import { ForumProvider } from './Pages/forum/reusable-components/Provider';



ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthContextProvider>      
    <ForumProvider>
      <MantineProvider theme={{ colorScheme: 'dark', colors:{
        brand: ['#ffffff', '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95']
      }, primaryColor:'brand' }} withGlobalStyles withNormalizeCSS>
        {/* <RouterProvider router={router} /> */}
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<App/>}>
                    <Route index element={<HomePage/>} />
                    <Route path="/Profile" element={<Protect><LeadGrid /></Protect>} />
                    <Route path="/Login" element={<Login />} />
                    <Route path="/Register" element={<NewRegister />} />
                    <Route path="/Forgot" element={<ForgotPassword />} />
                    <Route path="/Reset" element={<ResetPW />} />
                    <Route path="/Forum?/:forum" element={
                    <MiniNavForum  />
                    } >
                          <Route index element={<MainForum />} />
                          <Route path=":forum/new" element={<Protect><NewTopic /></Protect>} />
                          <Route path=":forum/thread/:id/:page?" element={<Threads />} />
                          <Route path=":forum/thread/:id/post" element={<Protect><NewPost /></Protect>} />
                    </Route>
                    <Route path="*" element={<ErrorPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
      </MantineProvider>
      </ForumProvider>  
    </AuthContextProvider>
  </React.StrictMode>
)

