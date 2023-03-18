
import { createStyles, Card, Image, Avatar, Text, Group, Badge } from '@mantine/core';
import { EachPostVisual } from '../../../../components/types/typesUsed'
import { getColor1,getColor2 } from '../../../../components/dashboard-user/getColorBadges';
import React from 'react';

const useStyles = createStyles((theme) => ({
  all: {
    display: 'flex',

    [theme.fn.smallerThan('sm')]: {
      flexDirection: 'column-reverse',
    },
  },
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    margin:'0',
  },
  adjustmnets:{
    width:'100%',
    h1:{fontSize:'26px',fontWeight:'bold',},
    h2:{fontSize:'20px',fontWeight:'bold',},
    h3:{fontSize:'16px',fontWeight:'bold',},
    h4:{fontSize:'14px',fontWeight:'bold',},
    a:{textDecoration:'underline',}
  },

  textArea: {
    gap:0,
    display: 'flex',
    flexDirection:'column',
    alignItems: 'flex-start'
  },
  body: {
    display:'flex',
    flexDirection:'column',
    alignSelf: 'flex-start',
    padding: 4,
    width:170,
    
    [theme.fn.smallerThan('sm')]: {
      justifyContent:'end',
      width:'100%',
    },
  },
  avatarimg:{    
    [theme.fn.smallerThan('sm')]: {
     display:'none',
    },
  },
  badgesGroup:{
    display:'flex',
    gap:4,
    flexWrap:'wrap',
    
  },
  minitext:{
    [theme.fn.smallerThan('sm')]: {
      flexDirection:'column',      
      justifyContent:'end',
      width:'100%',
    },
  },
  pokemon:{
marginTop:'-8px',
  },
  badge: {
letterSpacing:'0.4px',
fontWeight:500,
  },
  longText:{
    maxWidth: '100%',
    wordWrap: 'break-word',
  },

}));
    
export function ArticleCardVertical({
  newkey, image,  bigText,  chara,  author, 
}: EachPostVisual) {
  const { classes } = useStyles();
  return (
    <Card withBorder radius="md" pb={24} className={classes.card} mt={12} mb={12}
    key={newkey}>
      <div className={classes.all}>
        
        <div className={classes.body} >
        <Image src={image} height={140} width={140} mb="xs" className={classes.avatarimg} />
        <Group spacing="xs"className={classes.minitext}>
            <Group spacing="xs" noWrap> 
              {/* <Avatar size={20} src={author.avatar} /> */}
              <Text size="xs" className={classes.longText}>{author.name} </Text>
            </Group>
            <div className={classes.badgesGroup}>
              
              { author.badges&&(author.badges).map((oneBadge,index)=>
                <React.Fragment key={newkey+index}>
                {oneBadge&&
                <Badge key={newkey+author.name} variant="gradient" 
              gradient={{ from: getColor1(oneBadge), to: getColor2(oneBadge) }} 
              className={classes.badge}>
              {oneBadge}
              </Badge>}
                </React.Fragment>
              ) }
              </div>
          </Group>
          </div>

        <div className={classes.textArea}>

            <Text color="dimmed" weight={700} size="xs"
            className={classes.adjustmnets}
            dangerouslySetInnerHTML={{ __html: bigText }}
            >
          </Text>

         
         <Group spacing="xs" noWrap mt="md" style={{alignSelf:'flex-end'}}>
         <Text size="lg" color="dimmed">
              [ {chara} ]
            </Text>
            {/* <div className={classes.pokemon}>
          <img src="http://localhost/snagem2/assets/pokemon/sprite/mewtwo.png" alt="pokeicon" />
          <img src="http://localhost/snagem2/assets/pokemon/sprite/bulbasaur.png" alt="pokeicon" />
          <img src="http://localhost/snagem2/assets/pokemon/sprite/charmander.png" alt="pokeicon" />
          <img src="http://localhost/snagem2/assets/pokemon/sprite/squirtle.png" alt="pokeicon" />
          <img src="http://localhost/snagem2/assets/pokemon/sprite/charizard.png" alt="pokeicon" />
            </div> */}
            </Group>
         

        </div>
      </div>
    </Card>
  );
}