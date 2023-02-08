import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { AuthContextProvider } from './context/AuthContext';
import { ErrorPage } from './components/navigation/error-page';
import App, { loader as rootLoader }  from './App'
import './assets/styles/index.css';
import { LeadGrid, loader as newLoad } from './Pages/User/Dashboard';
// import { AuthenticationTitle } from './Pages/AuthTest/Login';
import { Login } from './Pages/auth/Login';
// import { getContacts, getLoginCheck } from './context/Data';
import Protect from './components/navigation/Protect';
import { NewRegister } from './Pages/auth/NewRegister';
import { ForgotPassword } from './Pages/auth/ForgotPW';
import { ResetPW } from './Pages/auth/ResetPW';
import MainForum from './Pages/forum/MainForum';
import MiniNavForum from './Pages/forum/components/MiniNavForum';
import { NewTopic } from './Pages/forum/NewTopic';
import Threads from './Pages/forum/MainThread';
import { NewPost } from './Pages/forum/NewPost';


const router = createBrowserRouter([
  {
    path: "/",
    element: <App/> ,
    errorElement: <ErrorPage />,
    loader: rootLoader,
    children: [
      { index: true, element: <>Welcome!</> },
      { path: "profile", element: <Protect><LeadGrid /></Protect>, },      
      { path: "Login",  element: <Login />, },
      { path: "Register",  element: <NewRegister />, },
      { path: "Forgot",  element: <ForgotPassword />, },
      { path: "Reset",  element: <ResetPW />, },
      { path: "Forum",  element: <MiniNavForum links={[
        {label:'MAIN FORUMS',link:'/forum/1'},
        {label:'SIDE RP',link:'/forum/2'},
        {label:'MASTER MISSIONS',link:'/forum/3'},
        {label:'QUESTS',link:'/forum/4'},
        {label:'EVENTS',link:'/forum/5'},
        {label:'PRIVATE',link:'/forum/6'},
        {label:'ARCHIVED',link:'/forum/7'},
      ]} />,
          children: [
            { path: ":id", element: <MainForum />},
            { path: ":id/new", element:<Protect><NewTopic /></Protect>}, //new thread
            { path: "new", element: <Protect><NewTopic /></Protect>}, //new thread
            { path: "thread/:id", element: <Threads/>},
            { path: "thread/:id/:page", element: <Threads/>},
            { path: "thread/:id/post", element: <Protect><NewPost /></Protect>}, //new post
          ]  
        },
        { path: "Marketplace",  element: <>Soon to come.</>, },
        { path: "Activities",  element: <>Soon to come.</>, },
    ],
  },
  // {
  //   path: "dashboard",
  //   element: <LeadGrid />,
  // },
]);


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthContextProvider>
      <MantineProvider theme={{ colorScheme: 'dark', colors:{
        brand: ['#ffffff', '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95']
      }, primaryColor:'brand' }} withGlobalStyles withNormalizeCSS>
        <RouterProvider router={router} />
      </MantineProvider>
    </AuthContextProvider>
  </React.StrictMode>
)

