import {  TextInput,  PasswordInput,  Anchor,  Paper,  Title,  Text,  Container,  
  Group,  Button,  Checkbox } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAuth } from '../../context/AuthContext';
import {handleSignIn} from "./components/LoginHandle";

export function Login() {   
  
const navigate=useNavigate();
  const [value, setValue] = useState('');
  const [submitted, setSub]=useState(false);
  const {setUser,user}=UserAuth();
  const form = useForm({
    initialValues: {
      email: '',
      password:'',
      remember: false, 
    }
  });    

  useEffect(() =>{
    if(user){
      navigate('/Profile');
    }
  }),[];

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
        setSub(true);
        handleSignIn(values.email, values.password,values.remember,setUser)
        .then((results)=>{
          if(results){
            navigate('/Profile');
            return true;
          }else {
        // console.log(error.code=== 'auth/wrong-password');
        // console.log(error.code);
             if (results === 'auth/user-not-found') {
                form.setErrors({ email: 'Invalid email.' });
              } else if (results === 'auth/wrong-password') {
                form.setErrors({ password: 'Invalid password.' });
              } else if (results === 'auth/too-many-requests'){
                form.setErrors({ email: 'Try again later.' });
              }
          setSub(false);
          }
          return;
        });        

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
       {submitted?'Loading...':'Sign in'}
        </Button>  
      </Paper>
      </form>
    </Container>
  );
}