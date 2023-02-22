import { createStyles, Header, Group, Burger, Container, Transition, Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { handleLogout } from '../../Pages/auth/components/LogoutHandle';
import {HeaderSearchProps} from '../types/typesUsed';

const HEADER_HEIGHT = 60;

const useStyles = createStyles((theme) => ({
  root: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: theme.fn.variant({ variant: 'filled', color: theme.primaryColor }).background,
    border:'none',
  },

  dropdown: {
    position: 'absolute',
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 9999,
    overflow: 'hidden',
    border:'none',
    borderRadius:0,
    backgroundColor: theme.fn.variant({ variant: 'filled', color: theme.primaryColor }).background,
    [theme.fn.largerThan('sm')]: {
      display: 'none',
    },
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },

  links: {
    [theme.fn.smallerThan('sm')]: {
      display: 'none',
    },
  },

  burger: {
    [theme.fn.largerThan('sm')]: {
      display: 'none',
    },
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
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    },

    [theme.fn.smallerThan('sm')]: {
      borderRadius: 0,
      padding: theme.spacing.md,
    },
  },

  linkActive: {
    '&, &:hover': {
      // backgroundColor: theme.fn.variant({ variant: 'default', color: theme.primaryColor }).background,
      // color: theme.fn.variant({ variant: 'default', color: theme.primaryColor }).color,
      textDecoration: 'underline',
    },
  },
}));

export const HeaderMenuColored=memo(({ links }: HeaderSearchProps) => {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { classes, cx } = useStyles();
  
  
    const items = links.map((link) => (
      <div key={link.label}>
        {link.label.length===0?''
        :
      <Link
        key={link.label}
        to={link.link}
        className={cx(classes.link/*, { [classes.linkActive]: active === link.link }*/)}
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
      <Header height={HEADER_HEIGHT} className={classes.root}>
        <Container className={classes.header}>
        <h1 className="text-lg m-0 uppercase font-bold underline-offset-2 hover:underline">
      <Link to="/" className='logo'>
      SNAGEM<span className="font-extralight"> HEADQUARTERS</span>
      </Link>
      </h1> 
          <Group spacing={5} className={classes.links}>
            {items}
          </Group>
  
          <Burger opened={opened} onClick={toggle} className={classes.burger} size="sm" />
  
          <Transition transition="fade" duration={200} mounted={opened}>
            {(styles) => (
              <Paper className={classes.dropdown} withBorder style={styles}>
                {items}
              </Paper>
            )}
          </Transition>
        </Container>
      </Header>
  );
}, (prevProps, nextProps) => Object.is(prevProps.links, nextProps.links)); 
