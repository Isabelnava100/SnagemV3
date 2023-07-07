import {
  Anchor,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { handleSignIn } from "./components/LoginHandle"

export function Login() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [submitted, setSub] = useState(false);
  const { setUser, user } = useAuth();
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      remember: false,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email."),
    },
  });



  useEffect(() => {
    if (user) {
      navigate("/Dashboard");
    }
  }, [user]);

  return (
    <Container size={420} my={40}>
      <Title
        align="center"
        sx={(theme) => ({ fontFamily: `Greycliff CF, ${theme.fontFamily}`, fontWeight: 900 })}
      >
        Welcome back!
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Do not have an account yet?{" "}
        <Anchor<"a"> href="Register" size="sm">
          Apply to Join.
        </Anchor>
      </Text>
      <form
        onSubmit={form.onSubmit((values) => {
          setSub(true);
          handleSignIn(values.email, values.password, values.remember, setUser).then((results) => {
          // console.log(results);
              if (results === "auth/user-not-found") {
                form.setFieldError('email', 'Invalid email');
              } else if (results === "auth/wrong-password") {
                form.setFieldError('password', 'Invalid password');
              } else if (results === "auth/too-many-requests") {
                form.setFieldError('email', 'Too many attempts');
              } else {
                  navigate("/Dashboard");
                  return true;
              }
              setSub(false);
            
            return;
          });
        })}
      >
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ background: "#222125" }}>
          <TextInput
            label="Email"
            placeholder="Your@email.com"
            required
            {...form.getInputProps("email")}
          />
<PasswordInput
        mt="md"
        required
        {...form.getInputProps('password')}
        error={form.errors.password}
        label="Your password"
        placeholder="Your password"
        value={form.values.password}
        onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
      />
          <Group position="apart" mt="md">
            <Checkbox label="Remember me" {...form.getInputProps("remember")} />
            <div></div>
            <Anchor<"a"> href="Forgot" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          <Button type="submit" fullWidth mt="xl" disabled={submitted}>
            {submitted ? "Loading..." : "Sign in"}
          </Button>
        </Paper>
      </form>
    </Container>
  );
}
