import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../../../context/firebase';
import { FirebaseError } from '@firebase/util'
import { doc, getDoc } from 'firebase/firestore';
import { User } from "../../../components/types/typesUsed";

export const handleSignIn = async (
    email2: string, 
    password: string, 
    remember:boolean,
    setUser: (arg0: User) => void,
    ) => {
    try {             
      if(remember){
        //localStorage.setItem('token', token);
       await setPersistence(auth, browserLocalPersistence)
        .then(async ()=>{
          await signInWithEmailAndPassword(auth, email2, password)
          .then(async (result)=>{
            const {uid,email,displayName} = result.user;
              await getDoc(doc(db, "users", uid))
              .then((user) =>{
                setUser({ uid, email,displayName,
                otherinfo:{
                  permissions:user.data()?.permissions,
                  badges:user.data()?.badges
                  }
                }); //set user
                  
              }).finally(() => {
                return true;
              });
          
          }); //sign in
          
        });
      } else {
        await signInWithEmailAndPassword(auth, email2, password)
        .then(async (result)=>{
          const {uid,email,displayName} = result.user;
          await getDoc(doc(db, "users", uid))
              .then((user) =>{
                setUser({ uid, email,displayName,
                otherinfo:{
                  permissions:user.data()?.permissions,
                  badges:user.data()?.badges
                  }
                }); //set user
                  
          }).finally(() => {
            return true;
          });
        }); //sign in
      }
    } catch (error:unknown) {
      if (error instanceof FirebaseError) {
        return error.code;
     }
    }
  };//sign in form