import { memo, useCallback } from 'react'
import { HeaderMenuColored } from './components/navigation/NavigationTest'
import { HeaderSearchProps } from './components/types/typesUsed';
import { Outlet } from "react-router-dom";
import { Button, Container } from '@mantine/core';
import { UserAuth } from './context/AuthContext';
import { useWindowScroll } from '@mantine/hooks';
import useWindowDimensions from './components/navigation/Screen';


function App() {
  const [scroll, scrollTo] = useWindowScroll();
  const { height } = useWindowDimensions();
  
  const {user}=UserAuth();
  const loginName = user?"Profile":"Login";

  const headerLinks: HeaderSearchProps = {
    links: [
      {
        link: '/Forum/Main-Forum',
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

  const handleScrollToTop = useCallback(() => {
    scrollTo({ y: 0 });
  }, [scrollTo]); 

  return (    
    <Container style={{minHeight:'100vh'}} p={0} fluid={true}>
      {/* <HeaderTabsColored user={{
        name: '',
        image: ''
      }} tabs={[]} />  */}
      <HeaderMenuColored links={headerLinks.links} />
        <Outlet  />
        {scroll.y>height && 
        <Button onClick={handleScrollToTop} id="backtotop">
          Scroll Back Up
        {/* <img src='' width="16" height="16" alt='scroll back to the top'/> */}
        </Button>
        }      
    </Container>
  )
}

export default memo(App); 