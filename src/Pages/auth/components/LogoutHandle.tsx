import { auth } from "../../../context/firebase";

export const handleLogout = () => {
  auth.signOut().then(() => {
    console.log('User signed out');
    window.location.reload();
  });
}; 