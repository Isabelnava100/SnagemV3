import { Title } from "@mantine/core";
import {
    doc,
    getDoc,
  } from "firebase/firestore"; 
import { useEffect, useState } from "react";
  import { User } from "../../../components/types/typesUsed";
import { UserAuth } from "../../../context/AuthContext";
  import { db } from "../../../context/firebase";
  import Duskball from'../../../assets/images/defaultAvatars/Duskball.png';
  import Friendball from'../../../assets/images/defaultAvatars/Friendball.png';
import Greatball from'../../../assets/images/defaultAvatars/Greatball.png';
import GSBall from'../../../assets/images/defaultAvatars/GSBall.png';
import Healball from'../../../assets/images/defaultAvatars/Healball.png';
import Levelball from'../../../assets/images/defaultAvatars/Levelball.png';
import Loveball from'../../../assets/images/defaultAvatars/Loveball.png';
import Lureball from'../../../assets/images/defaultAvatars/Lureball.png';
import Masterball from'../../../assets/images/defaultAvatars/Masterball.png';
import Moonball from'../../../assets/images/defaultAvatars/Moonball.png';
import Pokeball from'../../../assets/images/defaultAvatars/Pokeball.png';
import Quickball from'../../../assets/images/defaultAvatars/Quickball.png';
import Safariball from'../../../assets/images/defaultAvatars/Safariball.png';
import TeamRocketsball from'../../../assets/images/defaultAvatars/TeamRocketsball.png';
import Timerball from'../../../assets/images/defaultAvatars/Timerball.png';
import Ultraball from'../../../assets/images/defaultAvatars/Ultraball.png';
  
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
  const [myAvatar, setMyAvatar] = useState<string>(Pokeball);

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
        <img src={Duskball} alt='Duskball' height='50' width='50'/>
        <img src={Friendball} alt='Friendball' height='50' width='50'/>
        <img src={Greatball} alt='Greatball' height='50' width='50'/>
        <img src={GSBall} alt='GSBall' height='50' width='50'/>
        <img src={Healball} alt='Healball' height='50' width='50'/>
        <img src={Levelball} alt='Levelball' height='50' width='50'/>
        <img src={Loveball} alt='Loveball' height='50' width='50'/>
        <img src={Lureball} alt='Lureball' height='50' width='50'/>
        <img src={Masterball} alt='Masterball' height='50' width='50'/>
        <img src={Moonball} alt='Moonball' height='50' width='50'/>
        <img src={Pokeball} alt='Pokeball' height='50' width='50'/>
        <img src={Quickball} alt='Quickball' height='50' width='50'/>
        <img src={Safariball} alt='Safariball' height='50' width='50'/>
        <img src={TeamRocketsball} alt='TeamRocketsball' height='50' width='50'/>
        <img src={Timerball} alt='Timerball' height='50' width='50'/>
        <img src={Ultraball} alt='Ultraball' height='50' width='50'/>
        </div>
    </div>
  );
  
};

export default BookmarkModule;
