import { auth } from "../../../context/firebase";

export const handleLogout = () => {
  auth.signOut().then(() => {
    window.location.reload();
  });
}; 