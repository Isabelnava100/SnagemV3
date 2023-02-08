
import { Link, Outlet, useOutletContext,useNavigate  } from 'react-router-dom';
import {
  createStyles,
  ScrollArea,
  Header,
  Group,
  Autocomplete,
} from '@mantine/core';
import { useState } from 'react';
import { useToggle } from '@mantine/hooks';
import { HeaderTabsProps } from '../../../context/interfaces';


const useStyles = createStyles((theme) => ({
    header: {
        backgroundColor: '#5b21b6',     
        display:'flex', justifyContent:'center'
      },
      inner: {
          
        [theme.fn.smallerThan('md')]: {
          paddingLeft:20,
        },
        [theme.fn.smallerThan('sm')]: {
            width:730,
          },
  width: 930, display:'flex', justifyContent:'  ',gap:6
  
      },
        
      searchBar: {
        [theme.fn.smallerThan('sm')]: {
          display: 'none',
        },
        width:200
      },

  link: {
    display: 'block',
    lineHeight: 1,
    padding: '8px 12px',
    borderRadius: theme.radius.sm,
    textDecoration: 'none',
    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7],
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,

    '&:hover': {
        backgroundColor:
          theme.colorScheme === 'dark'
            ? theme.fn.rgba(theme.colors['violet'][9], 0.5)
            : theme.colors['violet'][0],
    },
  },
  linkActive: {
    '&, &:hover': {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
      color: theme.colors['violet'][1],
    },
  },


  
}));


type ContextType = { active:string | null };

export default function MiniNavForum({ links }: HeaderTabsProps) {
  const { classes, cx } = useStyles();
  const [active, setActive] = useState<string | null>(links[0].link);
  const [opened, toggleOpened] = useToggle([false, true]);
  let navigate = useNavigate();
  
  const items = links.map((link) => (
    <Link
      key={link.label}
      to={link.link}
      className={cx(classes.link, { [classes.linkActive]: active === link.link })}
      onClick={(event) => {
        event.preventDefault();
        (window.location.pathname==='/Forum'||window.location.pathname==='/Forum/')? event.preventDefault(): navigate('/Forum/1');
        //check where you are
        setActive(link.link);
        toggleOpened(false);
      }}
    >
      {link.label}
    </Link>
  ));
  return (
      <>
     <Header height={40} className={classes.header} >
     <ScrollArea style={{ height:46}} offsetScrollbars scrollbarSize={6}>
              <div  className={classes.inner}>
          <Group spacing={5}>
            {items}
          </Group>
          <Autocomplete style={{display:'none'}}
            className={classes.searchBar}
            placeholder="Search"
            icon={<img src="" height='22' width='22' alt="search" />}
            data={['React', 'Angular', 'Vue', 'Next.js', 'Riot.js', 'Svelte', 'Blitz.js']}
          />
      </div>
    </ScrollArea>
    </Header>
    
    <Outlet context={{active}}/>
    </>
  );
}


export function useForumLink() {
    return useOutletContext<ContextType>();
  }