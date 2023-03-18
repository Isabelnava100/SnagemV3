
import { Button } from '@mantine/core';
import { useState } from 'react';
import { Bookmark, BookmarkOff } from 'tabler-icons-react';
import { User } from '../../../../components/types/typesUsed';


export function BookmarkButton({ user,listofnotify }
  : { user: User | undefined;listofnotify:Array<string> }) {
  
  const selfDiscord=user?.otherinfo?.discordUID||'empty';
  const [isBookmarked, resetBookmark] = useState<boolean>(
    listofnotify.includes(selfDiscord));
    const handleBookmarkClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      console.log(selfDiscord);
      resetBookmark(!isBookmarked);
    };
 
  return (
    //if clicked on, check if user is logged in...
    //move all this to CSS
          <Button 
          leftIcon={isBookmarked?<BookmarkOff/>:<Bookmark/>}
          onClick={handleBookmarkClick}
          sx={(theme) => ({
            backgroundColor: 'color-primary', marginBottom: 12,
            color: '#fff',
            '&:hover': {
              opacity:0.7,
            },
          })}>
            {isBookmarked?
          'Delete Your Bookmark':'Bookmark this Thread'  
          }
          
    </Button>

  );
}