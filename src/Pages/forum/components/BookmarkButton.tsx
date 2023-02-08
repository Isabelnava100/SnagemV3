
import { Button } from '@mantine/core';
import { Bookmark, BookmarkOff } from 'tabler-icons-react';


export function BookmarkButton() {

  return (
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