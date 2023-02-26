import { collection, doc, getCountFromServer, setDoc, runTransaction, writeBatch } from "firebase/firestore";
import { User, NewForumInfo } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";

//Submits a new Topic 
export const handleSubmit = async (
    title: string,
    forum2: string,
    postas: string,
    firstpost: string,
    user: User | undefined = undefined,
    ) => {
      const dataRef = db.collection('threads');
      const dataRef2 = db.collection('posts');
      const checkBadges=user?.otherinfo?.badges;
      const timePosted=new Date();

      const forum = NewForumInfo.find(info => info.value === forum2)?.link;

      const batch = writeBatch(db);
        
      const colRefCount = collection(db, 'forum', `${forum}`, 'threads');
      const snapshot = await getCountFromServer(colRefCount);
      const valueNewThread=snapshot.data().count + 1;


      const colRef = doc(colRefCount, `${valueNewThread}`);
      const colPost = collection(colRef, 'posts');

      batch.set(colRef, {
        closed: false,
        createdBy: user?.displayName,
        private: false,
        timePosted,
        title,
        }, { merge: true });

        
      batch.set(doc(colPost), {
            badges:checkBadges?user?.otherinfo?.badges:null,
            character: postas,
            owner: user?.displayName,
            text: firstpost,
            timePosted,
        });
        
    await batch.commit();

        return true;

  };