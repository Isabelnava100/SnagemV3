
import { createStyles, Title, Text, Button, Grid, Col } from '@mantine/core';
import { Link, useParams } from 'react-router-dom';
import { InfoOnThreadVisual } from '../../../../components/types/typesUsed';
import { UserAuth } from '../../../../context/AuthContext';
import { BookmarkButton } from './BookmarkButton';

const useStyles = createStyles((theme) => ({
  wrapper: {
    padding: `${theme.spacing.sm * 2}px ${theme.spacing.sm}px`,
    
    [theme.fn.smallerThan('sm')]: {
        textAlign:'center',
      },
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontSize: 36,
    fontWeight: 900,
    lineHeight: 1.1,
    marginBottom: theme.spacing.md,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
  },
  buttonArea:{
display:'flex',
justifyContent:'end',
alignItems:'flex-end',
  },
}));


export function FeaturesTitle({info,threadID}: InfoOnThreadVisual) {
  const { classes } = useStyles();
  const { id } = useParams();
  const { user } = UserAuth();


  return (
    <div className={classes.wrapper}>
      <Grid gutter={20} >
        <Col span={12} sm={9}>
          <Title className={classes.title} order={2}>
         {info[0]['title']}
          </Title>
          <BookmarkButton user={user}/>          

          {/* <Text color="dimmed">
          Description here...</Text> */}
          
        </Col>
        <Col span={12} sm={3} className={classes.buttonArea}>
       
       {user && 
        <Button
        variant="gradient"
        gradient={{ deg: 133, from: 'violet', to: 'grape' }}
        size="lg"
        radius="md"
        mt="xl"
        component={Link} to={`/Forum/thread/${id}/post`}
        state={{newlocation: threadID}}
      >
        Make a New Post
      </Button>
       }
       

          
        </Col>
      </Grid>
    </div>
  );
}