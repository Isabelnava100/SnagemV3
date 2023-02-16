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
import { addDoc, collection, doc, DocumentData, DocumentSnapshot, getDoc } from 'firebase/firestore';
import { LoadingOverlay } from '@mantine/core';

type User = {
	uid: string;
	email: string | null;
	displayName: string | null;
	otherinfo?: SpecificUser,
};
type SpecificUser = {
	permissions: string; 
	badges: string[]; 
};


type AuthContext = {
	user: User | undefined;
	setUser: Dispatch<SetStateAction<User | undefined>>;
};

const getInfo = async (uid: string):Promise<SpecificUser> => {
	const user = await getDoc(doc(db, "users", uid));
	const userData = user.data();
	return {
		permissions: userData ? userData.permissions : '',
		badges: userData ? userData.badges : []
	};
}


const AuthContext = createContext({} as AuthContext);

function AuthContextProvider({children}: {children: ReactNode}) {
	//const [useLogin, setUserLogin] = useState<User>();
	const [user, setUser] = useState<User>();
	const [pending, setPending]=useState<Boolean>(true);
// console.log(user);
	useEffect(() => {
		const authConst = auth.onAuthStateChanged(async user => {
			if (user) {
				const {uid, email,displayName} = user;
				const otherinfo = await getInfo(uid);
				setUser({
					uid,
					email,
					displayName,
					otherinfo,
				});
				setPending(false);
			}else {
				setTimeout(function () {
					setPending(false);
				// }, 800);
			});
			}
		});
		return () => authConst();
	}, [setUser]);

	if(pending){		
		return  <LoadingOverlay visible={true} loader={
			<>
		<img src=
			"https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy_200x200.webp?alt=media&token=9348aff4-71b0-4d60-baf1-c28098f91f45"
			alt="mew loading" />
			</>
		} />
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