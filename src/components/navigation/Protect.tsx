import { Navigate } from "react-router-dom";
import { UserAuth } from "../../context/AuthContext";

type Props ={
    children:JSX.Element; 
}

const Protect = ({children}:Props) => {
    const {user}=UserAuth();

    if (!user) {
        return <>"You must be logged in to see this page."</>;
    }
    return children;
}

export default Protect;