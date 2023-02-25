import { useState } from 'react';
import { Link, Outlet, useOutletContext,useNavigate  } from 'react-router-dom';
import {
  createStyles,
  ScrollArea,
  Header,
  Group,
} from '@mantine/core';
import {NewForumInfo as links} from '../../../../components/types/typesUsed';


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

function MiniNavForum() {
  const { classes, cx } = useStyles();
  const [active, setActive] = useState<string | null>(links[0].link);
  const navigate = useNavigate();
  
  const items = links.map((link) => (
    <Link
      key={link.label}
      to={`/Forum/${link.link}`}
      className={cx(classes.link, { [classes.linkActive]: active === link.link })}
      onClick={(event) => {
        // event.preventDefault();
        // (window.location.pathname==='/Forum'||window.location.pathname==='/Forum/')?
        //  event.preventDefault(): navigate('/Forum/Main-Forum');
        setActive(link.link);
      }}
    >
      {link.label}
    </Link>
  ));
  return (
      <>
     <Header height={40} className={classes.header} >
     <ScrollArea style={{height:46}} offsetScrollbars scrollbarSize={6}>
              <div  className={classes.inner}>
          <Group spacing={5}>
            {items}
          </Group>
      </div>
    </ScrollArea>
    </Header>
    
    <Outlet context={{active}}/>
    </>
  );
}
export default (MiniNavForum);

export function useForumLink() {
    return useOutletContext<ContextType>();
  }