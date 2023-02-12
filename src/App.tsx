import { useState } from 'react'
import { HeaderMenuColored } from './components/navigation/NavigationTest'
import { Outlet, Link, useLoaderData, useNavigation } from "react-router-dom";
import { Button, Container, LoadingOverlay } from '@mantine/core';
import { getContacts } from "./context/Data";
import { LoaderData } from "./context/Loader";
import { UserAuth } from './context/AuthContext';
// import Navigation from './components/navigation/NavBase';
import SharedLayout from './components/navigation/SharedLayout';
import { useWindowScroll } from '@mantine/hooks';
import useWindowDimensions from './components/navigation/Screen';


interface HeaderSearchProps {
  all: { link: string; label: string; links?: { link: string; label: string }[] }[];
}



export async function loader() {
  const contacts = await getContacts();
  // console.log(contacts);
  return { contacts };
}

//<LoadingOverlay visible={true} loader={<img src="https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy_200x200.webp?alt=media&token=9348aff4-71b0-4d60-baf1-c28098f91f45" alt="mew loading" />} />

export default function App() {
  const [count, setCount] = useState(0);
  const data = useLoaderData() as LoaderData<typeof loader>;  
  const navigation = useNavigation();
  const [scroll, scrollTo] = useWindowScroll();
  const { height } = useWindowDimensions();
  
  const {user}=UserAuth();
  // console.log(user);
  const loginName = user?"Profile":"Login";

  const headerLinks: HeaderSearchProps = {
    all: [
      {
        link: '/Forum/1',
        label: 'Forum',
      },
      {
        link: '/'+loginName,
        label: loginName,
      },
      user?
      {
        link: '/',
        label: 'Logout',        
      }:{
        link: '',
        label: '',        
      },    
    ],
  };

  return (    
    <Container style={{minHeight:'100vh'}} fluid={true}>
      {/* <HeaderTabsColored user={{
        name: '',
        image: ''
      }} tabs={[]} />  */}
      <HeaderMenuColored links={headerLinks.all} />
      <LoadingOverlay visible={navigation.state === "loading"}
      loader={<img src="https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy_200x200.webp?alt=media&token=9348aff4-71b0-4d60-baf1-c28098f91f45" alt="mew loading" />}
        />

        <Outlet  />
        {scroll.y>height && 
        <Button onClick={() => scrollTo({ y: 0 })} id="backtotop">
          Scroll Back Up
        {/* <img src='' width="16" height="16" alt='scroll back to the top'/> */}
        </Button>
        }      
    </Container>
  )
}
