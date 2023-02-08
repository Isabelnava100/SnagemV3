import {
	createContext,
	Dispatch,
	ReactNode,
	SetStateAction,
	useContext,
	useEffect,
	useState,
} from 'react';
import {auth, db} from './firebase';
import { 
	createUserWithEmailAndPassword,
	browserLocalPersistence, 
	setPersistence, 
	signInWithEmailAndPassword, 
	getIdToken,
	onAuthStateChanged,
	signOut
 } from "firebase/auth";
import { addDoc, collection } from 'firebase/firestore';
import { LoadingOverlay } from '@mantine/core';

type User = {
	uid: string;
	email: string | null;
	displayName: string | null;
};


type AuthContext = {
	user: User | undefined;
	setUser: Dispatch<SetStateAction<User | undefined>>;
};


const login = async (email2: string, password: string, remember:boolean) => {
	const result = await signInWithEmailAndPassword(auth, email2, password);
}


const AuthContext = createContext({} as AuthContext);

function AuthContextProvider({children}: {children: ReactNode}) {
	//const [useLogin, setUserLogin] = useState<User>();
	const [user, setUser] = useState<User>();
	const [pending, setPending]=useState<Boolean>(true);
 
	useEffect(() => {
		const authConst = auth.onAuthStateChanged(user => {
			if (user) {
				const {uid, email,displayName} = user;
				setUser({
					uid,
					email,
					displayName,
				});
				setPending(false);
			}else {
				setTimeout(function () {
					setPending(false);
				}, 800);
			}
		});
		return () => authConst();
	}, [setUser]);

	if(pending){		
		return  <LoadingOverlay visible={true} loader={<img src=
			"https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy_200x200.webp?alt=media&token=9348aff4-71b0-4d60-baf1-c28098f91f45"
			alt="mew loading" />} />
	}

	return (
		<AuthContext.Provider value={{user, setUser}}>
			{children}
		</AuthContext.Provider>
	);
}

export {AuthContextProvider}; 
//export default AuthContext;
export const UserAuth=()=> {
	return useContext(AuthContext);
}