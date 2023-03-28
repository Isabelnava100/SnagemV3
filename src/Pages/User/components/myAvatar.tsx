import { Title } from "@mantine/core";
import {
    doc,
    getDoc,
  } from "firebase/firestore"; 
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
  import { User } from "../../../components/types/typesUsed";
import { UserAuth } from "../../../context/AuthContext";
  import { db } from "../../../context/firebase";
  
async function fetchMyAvatar(user: User | undefined = undefined): Promise<string> {
 
    const colRef = doc(db, 'users', `${user?.uid}`);
    const docSnap = await getDoc(colRef);
  
    if (docSnap.exists()) {      
      const str=docSnap.data().myAvatar;
      // console.log(str);
      if(typeof str !== "undefined"){ // it exists
      if (str.some((str1: string) => str1.trim().length > 0)) { // there's data
        return str;
      }      
    } 
    }
      return '';    
  
  }


const BookmarkModule: React.FC = () => {
    const {user}=UserAuth();
  const [myAvatar, setMyAvatar] = useState<string>('/src/assets/images/defaultAvatars/Pokeball.png');

  useEffect(() => {
    async function fetchData() {
        try{ 
            const avatar = await fetchMyAvatar(user);
            avatar!==''&&setMyAvatar(avatar);
        }catch (err){console.error(err)}finally{return Promise.resolve()} //add to all promises
    }
    fetchData();
  }, []);
  return (
    <div style={{display:'flex',gap:12,flexDirection:'column',alignItems:'center'}}>
      
      <img src={myAvatar} alt='myavatarimage' height='100' width='100'/>
      <div style={{textAlign:'center',width:'50%'}}>
        <Title order={5}>Select Your Avatar:</Title>
        <p style={{margin:0}}>(Pending function)</p>
        <img src='/src/assets/images/defaultAvatars/Duskball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Friendball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Greatball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/GSBall.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Healball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Levelball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Loveball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Lureball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Masterball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Moonball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Pokeball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Quickball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Safariball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/TeamRocketsball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Timerball.png' alt='pokeball' height='50' width='50'/>
        <img src='/src/assets/images/defaultAvatars/Ultraball.png' alt='pokeball' height='50' width='50'/>
        </div>
    </div>
  );
  
};

export default BookmarkModule;
