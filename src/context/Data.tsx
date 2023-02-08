import { useNavigate } from "react-router-dom";
import { UserAuth } from "./AuthContext";

interface ContactType {
    id: string;
    name: string;
    email: string;
  }

  

export function getContacts() {
    // const contacts = await getContacts();
    // const contacts = [1,2,3];

    return true;
  }

  
export function getLoginCheck() {
  //  const {user}=UserAuth();
// if (user){
//   return true;
// }
return true;
}

  

  export function updateContact(id:number, updates:any){
    //params.contactId, updates
  }