import { Header, Group, Burger, Container, Transition, Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { handleLogout } from '../../Pages/auth/components/LogoutHandle';
import {HeaderSearchProps} from '../types/typesUsed';
import '/src/assets/styles/navigation.css';


export const HeaderMenuColored=memo(({ links }: HeaderSearchProps) => {
  const [opened, { toggle, close }] = useDisclosure(false);
  
  
    const items = links.map((link) => (
      <div key={link.label}>
        {link.label.length===0?''
        :
      <Link
        key={link.label} 
        to={link.link}
        className='link' //[classes.linkActive]: active === link.link }
        onClick={(event) => {
          
          if(link.label==='Logout'){
            event.preventDefault();
            handleLogout();
          }
          close();
        }}
      >
        {link.label}
      </Link>
      }
        </div>
    ));
  
    return (
      <Header height={60} className='root'>
        <Container className='header'>
        <h1 className="text-lg m-0 uppercase font-bold underline-offset-2 hover:underline">
      <Link to="/" className='logo'>
      SNAGEM<span className="font-extralight"> HEADQUARTERS</span>
      </Link>
      </h1> 
          <Group spacing={5} className='links'>
            {items}
          </Group>
  
          <Burger opened={opened} onClick={toggle} className='burger' size="sm" />
  
          <Transition transition="fade" duration={200} mounted={opened}>
            {(styles) => (
              <Paper className='dropdown' withBorder style={styles}>
                {items}
              </Paper>
            )}
          </Transition>
        </Container>
      </Header>
  );
}, (prevProps, nextProps) => Object.is(prevProps.links, nextProps.links)); 
