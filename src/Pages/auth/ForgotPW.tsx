import { useState } from 'react';
import {
  createStyles,  Paper,  Title,  Text,  TextInput,  Button,
  Container,  Group,  Anchor,  Center,  Box,
} from '@mantine/core';
import { ArrowLeft } from 'tabler-icons-react';
import { useForm } from '@mantine/form';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../context/firebase';
import { useNavigate } from 'react-router-dom';
import './components/stylesReset.css';

const useStyles = createStyles((theme) => ({
  title: {
    fontSize: 26,
    fontWeight: 900,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
  },

  controls: {
    [theme.fn.smallerThan('xs')]: {
      flexDirection: 'column-reverse',
    },
  },

  control: {
    [theme.fn.smallerThan('xs')]: {
      width: '100%',
      textAlign: 'center',
    },
  },
}));

export function ForgotPassword() {
	const navigate = useNavigate();
  const { classes } = useStyles();

  const form = useForm({
    initialValues: {
      email: ''   
    }
  });

  function resetPassword(email:string) {
    if (email === "") {
      form.setErrors({ email: 'Invalid email.' });
      return;
    }

   sendPasswordResetEmail(auth, email)
      .then(() => {
        alert("Reset email has been sent !");
        navigate('/Login');
      }).catch((error) => {    
        if (error.code === 'auth/invalid-email') {
         return form.setErrors({ email: 'Badly formatted email.' });
        }
        if (error.code === 'auth/user-not-found') {
        return form.setErrors({ email: 'Invalid email.' });
        }
      })
  }

  return (
    <Container size={460} my={30}>
       <form onSubmit={form.onSubmit((values) =>{
        resetPassword(values.email);
        })}
       >
      <Title className={classes.title} align="center">
        Forgot your password?
      </Title>
      <Text color="dimmed" size="sm" align="center">
        Enter your email to get a reset link.
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl" className='paperBG'>
       <TextInput label="Your email" placeholder="Your@email.com" required  {...form.getInputProps('email')} />
        <Group position="apart" mt="lg" className={classes.controls}>
          <Anchor<'a'> href="Login" color="dimmed" size="sm" className={classes.control}>
            <Center inline>
              <ArrowLeft size={12} />
              <Box ml={5}>Back to login page</Box>
            </Center>
            </Anchor>
          <Button className={classes.control} type='submit' >Reset password</Button>
        </Group>
      </Paper>
      </form>
    </Container>
  );
}