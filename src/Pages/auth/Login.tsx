import {  TextInput,  PasswordInput,  Anchor,  Paper,  Title,  Text,  Container,  Group,  Button,  Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, firebase } from '../../context/firebase';
import { UserAuth } from '../../context/AuthContext';
import { LoaderData } from "../../context/Loader";
import { getLoginCheck } from '../../context/Data';
import { FirebaseError } from '@firebase/util'
import { IconChevronsDownLeft } from '@tabler/icons';
import { doc, getDoc } from 'firebase/firestore';



// export async function loader() {
//   const loginCheck = await getLoginCheck();
//   return { loginCheck };
// }

export function Login() {   
  
const navigate=useNavigate();
  const [value, setValue] = useState('');
  const [submitted, setSub]=useState(false);
  const {setUser,user}=UserAuth();
  
  // const data = useLoaderData() as LoaderData<typeof loader>;  
  // console.log(data+"1");

  useEffect(() =>{
    if(user){
      navigate('/Profile');
    }
  }) 

  const form = useForm({
    initialValues: {
      email: '',
      password:'',
      remember: false,
    }
  });  
  
  const handleSignIn = async (email2: string, password: string, remember:boolean) => {
    setSub(true);
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
                navigate('/Profile');
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
            navigate('/Profile');
          });
        }); //sign in
      }
    } catch (error:unknown) {
      if (error instanceof FirebaseError) {
        console.log(error.code=== 'auth/wrong-password');
        console.log(error.code);
             if (error.code === 'auth/user-not-found') {
                form.setErrors({ email: 'Invalid email.' });
              } else if (error.code === 'auth/wrong-password') {
                form.setErrors({ password: 'Invalid password.' });
              } else if (error.code === 'auth/too-many-requests'){
                form.setErrors({ email: 'Try again later.' });
              }
     }
    }
    setSub(false);
  };//sign in form

  return (
    <Container size={420} my={40}>
      <Title
        align="center"
        sx={(theme) => ({ fontFamily: `Greycliff CF, ${theme.fontFamily}`, fontWeight: 900 })}
      >
        Welcome back!
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor<'a'> href="Register" size="sm">
          Apply to Join.
        </Anchor>
      </Text>
      <form onSubmit={form.onSubmit((values) =>{
        handleSignIn(values.email, values.password,values.remember);
        })}
       >
      <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{background:'#222125'}}>
      
        <TextInput label="Email" placeholder="Your@email.com" required    
            {...form.getInputProps('email')}/>
        <PasswordInput  mt="md"
          required
          // {...form.getInputProps('password')}
          label="Your password"
          placeholder="Your password"
          value={value}
          onChange={(event) => {setValue(event.currentTarget.value);form.setFieldValue("password",event.currentTarget.value);}} />
       <Group position="apart" mt="md">         
        <Checkbox label="Remember me" 
            {...form.getInputProps('remember')} /> 
            <div></div>
          <Anchor<'a'> href="Forgot" size="sm">
            Forgot password?
          </Anchor> 
        </Group>
        <Button type="submit" fullWidth mt="xl"
        disabled={submitted}>
          Sign in
        </Button>  
      </Paper>
      </form>
    </Container>
  );
}