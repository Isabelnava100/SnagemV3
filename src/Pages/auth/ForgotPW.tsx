import React, { useState } from 'react';
import {
  createStyles,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Container,
  Group,
  Anchor,
  Center,
  Box,
  LoadingOverlay,
} from '@mantine/core';
import { ArrowLeft } from 'tabler-icons-react';
import { useForm } from '@mantine/form';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../context/firebase';
import { useNavigate } from 'react-router-dom';

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
  
  const [visible, setVisible] = useState(false);

  const form = useForm({
    initialValues: {
      email: ''   
    }
  });

  function resetPassword(email:string) {
    if (email === "") {
      form.setErrors({ email: 'Invalid email.' });
      return
    }

    setVisible(true);
   return sendPasswordResetEmail(auth, email)
      .then(() => {
        alert("Reset email has been sent !");
        navigate('/Login');
      }).catch((error) => {        
        setVisible(false);
        if (error.code === 'auth/invalid-email') {
          form.setErrors({ email: 'Badly formatted email.' });
        }
        if (error.code === 'auth/user-not-found') {
          form.setErrors({ email: 'Invalid email.' });
        }
      })
  }

  return (
    <Container size={460} my={30}>
       <form onSubmit={form.onSubmit((values) =>{
        // console.log(values);
        resetPassword(values.email);
        })}
       >
      <Title className={classes.title} align="center">
        Forgot your password?
      </Title>
      <Text color="dimmed" size="sm" align="center">
        Enter your email to get a reset link.
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl" style={{background:'#222125'}}>
       <TextInput label="Your email" placeholder="Your@email.com" required  {...form.getInputProps('email')} />
        <Group position="apart" mt="lg" className={classes.controls}>
          <Anchor<'a'> href="login" color="dimmed" size="sm" className={classes.control}>
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