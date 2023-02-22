
import { doc, setDoc } from "firebase/firestore";
import {auth, db, firebase} from '../../../context/firebase';
import { createUserWithEmailAndPassword, updateProfile,sendEmailVerification } from 'firebase/auth';

export const registerUser= (
    email: string, 
    password: string, 
    application:string, 
    gaiaName:string, 
    username:string  
    ) => {
    createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const whereRef = doc(db, "users", userCredential.user.uid);
       await setDoc(whereRef, {
          app: application?application:null,
          email: userCredential.user.email,
          gaia: gaiaName,
          username: username,
          // uid: userCredential.user.uid,
          permissions: 'New',
          badges:[]
        }); 
        return userCredential.user;
      })
      .then(async(user) => {
        await updateProfile(user,{
          displayName:username
        });
        return;
      })
      .finally(()=>{
         return 'success';
      }) //sign in
    .catch((error: firebase.FirebaseError) => {    
      return error.code;
    });
    return 'success';
    }


  //https://docs.netlify.com/forms/setup/?_ga=2.101709441.1670044853.1675828635-1761029195.1675828635