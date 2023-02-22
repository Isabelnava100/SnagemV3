
import { Button } from '@mantine/core';
import { Bookmark, BookmarkOff } from 'tabler-icons-react';
import { User } from '../../../../components/types/typesUsed';


export function BookmarkButton({ user }: { user: User | undefined }) {
  return (
    //if clicked on, check if user is logged in...
    //move all this to CSS
          <Button 
      leftIcon={<Bookmark/>}
      sx={(theme) => ({
        backgroundColor: 'color-primary', marginBottom: 12,
        color: '#fff',
        '&:hover': {
          opacity:0.7,
        },
      })}>
        Bookmark this Thread

        
    {/* <Button 
      leftIcon={<BookmarkOff/>}
      sx={(theme) => ({
        backgroundColor: 'color-primary', marginBottom: 12,
        color: '#fff',
        '&:hover': {
          opacity:0.7,
        },
      })}>
        Delete Bookmark
    </Button> */}

    </Button>

  );
}