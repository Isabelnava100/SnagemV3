
import { Button } from '@mantine/core';
import { arrayRemove, arrayUnion, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bookmark, BookmarkOff } from 'tabler-icons-react';
import { User } from '../../../../components/types/typesUsed';
import { db } from '../../../../context/firebase';


export function BookmarkButton({ user,listofnotify,name}
  : { user: User | undefined;listofnotify:Array<string>;name:string;}) {
  
    const { id,forum } = useParams();
  const selfDiscord=user?.otherinfo?.discordUID||'empty';
  const [isBookmarked, resetBookmark] = useState<boolean>( 
    listofnotify?listofnotify.includes(selfDiscord):false);
    const docRef = doc(db, 'forum', `${forum}`, 'threads',`${id}`);
    const docRefUser = doc(db, 'users', `${user?.uid}`);


    const handleBookmarkClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      try{
      if(id!=undefined){
         const batch = writeBatch(db);
        if(isBookmarked){
          batch.update(docRef, {
            notifyviaDiscord: arrayRemove(selfDiscord)
          });
          batch.update(docRefUser, {
            myBookmarks: arrayRemove(`where[Forum/${forum}/thread/${id}]name[${name}]`)
          });
          await batch.commit();
      }else{
        batch.update(docRef, {
          notifyviaDiscord: arrayUnion(selfDiscord)
        });
        batch.update(docRefUser, {
          myBookmarks: arrayUnion(`where[Forum/${forum}/thread/${id}]name[${name}]`)
        });
        await batch.commit();
      }
      resetBookmark(!isBookmarked);
      }      
    }catch (err){console.error(err)}finally{return Promise.resolve()}
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