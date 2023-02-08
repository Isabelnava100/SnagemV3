
import { createStyles, Title, Text, Button, Container, useMantineTheme } from '@mantine/core';
import { Link} from 'react-router-dom';
import { UserAuth } from '../../../context/AuthContext';


const useStyles = createStyles((theme) => ({
  wrapper: {
    position: 'relative',
    paddingTop: 40,
    paddingBottom: 60,

    '@media (max-width: 755px)': {
      paddingTop: 10,
      paddingBottom: 30,
    },
  },

  inner: {
    position: 'relative',
  },

  dots: {
    position: 'absolute',
    color: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],

    '@media (max-width: 755px)': {
      display: 'none',
    },
  },

  dotsLeft: {
    left: 0,
    top: 0,
  },

  title: {
    textAlign: 'center',
    fontWeight: 800,
    fontSize: 40,
    letterSpacing: -1,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    marginBottom: theme.spacing.xs,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    '@media (max-width: 520px)': {
      fontSize: 28,
      textAlign: 'left',
    },
  },

  description: {
    textAlign: 'center',

    '@media (max-width: 520px)': {
      textAlign: 'left',
      fontSize: theme.fontSizes.md,
    },
  },

  controls: {
    marginTop: theme.spacing.lg,
    display: 'flex',
    justifyContent: 'center',

    '@media (max-width: 520px)': {
      flexDirection: 'column',
    },
  },

  control: {
    marginLeft: theme.spacing.md,marginTop: theme.spacing.md,
    '@media (max-width: 520px)': {
      height: 42,
      fontSize: theme.fontSizes.md,

      '&:not(:first-of-type)': {
        marginLeft: 0,
      },
    },
  },
}));

export function HeroText({send}:{send:string|null}) {
  const {user}=UserAuth();
    const { classes } = useStyles();
  const theme = useMantineTheme();

  return (
    <Container className={classes.wrapper} size={1400}>

      <div className={classes.inner}>
        <Title className={classes.title}>
          Welcome to the{' '}
          <Text component="span" color={theme.primaryColor} inherit>
            Snagem Forums
          </Text>
        </Title>

        <Container p={0} size={600}>
          <Text size="lg" color="dimmed" className={classes.description}>
            This is where the roleplay happens. 
          </Text>
        </Container>

        {
            user&&
            <div className={classes.controls}>
          <Button className={classes.control} size="lg" variant="default" color="gray">
            Check Your Bookmarks
          </Button>
          <Button className={classes.control} size="lg"
            component={Link} to={`${send}/new`}>
            Create a New Topic
          </Button>
        </div>
          }
        
      </div>
    </Container>
  );
}