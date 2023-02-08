import { useState, useRef } from 'react';
import {
     PasswordInput,    Paper,    Title,    createStyles,    
    Text,    Container,    Group,    Button,  Progress,  Popover,  Box, 
  } from '@mantine/core';
  import { useForm } from '@mantine/form';
//import { ArrowLeft } from 'tabler-icons-react';

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


function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
  return (
    <Text
      color={meets ? 'teal' : 'red'}
      sx={{ display: 'flex', alignItems: 'center' }}
      mt={7}
      size="sm"
    >
      {meets ? 'A' : 'X'} <Box ml={10}>{label}</Box>
    </Text>
  );
}

const requirements = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

function getStrength(password: string) {
  let multiplier = password.length > 5 ? 0 : 1;

  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}


export function ResetPW() {
  const { classes } = useStyles();

  

  const [popoverOpened, setPopoverOpened] = useState(false);
  const [value, setValue] = useState('');
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(value)} />
  ));

  const strength = getStrength(value);
  const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';
  //above is pw check

  
    // const refRadio=useRef<HTMLInputElement>(null);
    // const refTextarea=useRef<HTMLTextAreaElement>(null);
    const form = useForm({
      initialValues: {
        password:'',
        confirmPassword:'',
      },
  
      validate: {
        confirmPassword: (value, values) =>
        value !== values.password ? 'Passwords did not match' : null,
      },
    });


    

  return (
    <Container size={460} my={30}>
      <Title className={classes.title} align="center">
        Reset Your Password
      </Title>
      <Text color="dimmed" size="sm" align="center">
        Enter your new password.
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md" mt="xl" style={{background:'#222125'}}>
       
      <form onSubmit={form.onSubmit((values) =>{
        console.log(values);
        })}
        >
       
     <PasswordInput
        mt="md"
          required
          {...form.getInputProps('password')}
          label="Your password"
          placeholder="Your password"
          description="Should include letters in lower and uppercase, at least 1 number and at least 1 special symbol."
          value={value}          
        onFocus={() => setPopoverOpened((o) =>true)}
        onBlur={() => setPopoverOpened((o) => false)}
          onChange={(event) => {setValue(event.currentTarget.value);form.setFieldValue("password",event.currentTarget.value);}}
        />
 <Popover opened={popoverOpened} onChange={setPopoverOpened}>
     <Popover.Dropdown>
     <Progress color={color} value={strength} size={5} style={{ marginBottom: 10 }} />
      <PasswordRequirement label="Includes at least 6 characters" meets={value.length > 5} />
      {checks}
     </Popover.Dropdown>
    </Popover>
      <PasswordInput
       {...form.getInputProps('confirmPassword')}
      placeholder="Your New Password again"
      mt="md"
      label="Confirm new password"
      required
    />
    </form>


        <Group position="apart" mt="lg" className={classes.controls}>
          <Button className={classes.control}>Reset password</Button>
        </Group>
      </Paper>
    </Container>
  );
}