import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "tabler-icons-react";
import { auth } from "../../context/firebase";
import "/src/assets/styles/authentication.css";

export function ForgotPassword() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: "",
    },
  });

  function resetPassword(email: string) {
    if (email === "") {
      form.setErrors({ email: "Invalid email." });
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        alert("Reset email has been sent !");
        navigate("/Login");
      })
      .catch((error) => {
        if (error.code === "auth/invalid-email") {
          return form.setErrors({ email: "Badly formatted email." });
        }
        if (error.code === "auth/user-not-found") {
          return form.setErrors({ email: "Invalid email." });
        }
      });
  }

  return (
    <Container size={460} my={30}>
      <form
        onSubmit={form.onSubmit((values) => {
          resetPassword(values.email);
        })}
      >
        <Title className="titleAuth" align="center">
          Forgot your password?
        </Title>
        <Text color="dimmed" size="sm" align="center">
          Enter your email to get a reset link.
        </Text>

        <Paper withBorder shadow="md" p={30} radius="md" mt="xl" className="paperBGAuth">
          <TextInput
            label="Your email"
            placeholder="Your@email.com"
            required
            {...form.getInputProps("email")}
          />
          <Group position="apart" mt="lg" className="controlsAuth">
            <Anchor<"a"> href="Login" color="dimmed" size="sm" className="controlAuth">
              <Center inline>
                <ArrowLeft size={12} />
                <Box ml={5}>Back to login page</Box>
              </Center>
            </Anchor>
            <Button className="controlAuth" type="submit">
              Reset password
            </Button>
          </Group>
        </Paper>
      </form>
    </Container>
  );
}
