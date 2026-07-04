import {
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import { auth } from "../../context/firebase";
import { AuthCard, warmGradient } from "./components/AuthCard";

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
    <Container size={640} my={40}>
      <AuthCard title="Enter your email to get a reset link.">
        <form
          onSubmit={form.onSubmit((values) => {
            resetPassword(values.email);
          })}
        >
          <Stack maw={340} mx="auto" gap="lg">
            <TextInput
              label="Email Address"
              required
              {...form.getInputProps("email")}
            />
            <Button
              type="submit"
              size="lg"
              radius="md"
              variant="gradient"
              gradient={warmGradient}
            >
              Reset Password
            </Button>
          </Stack>
          <Anchor component={Link} to="/Login" c="dimmed" size="sm" mt="xl" display="inline-block">
            <Center inline>
              <IconArrowLeft size={14} />
              <Box ml={5}>Back to the Login page</Box>
            </Center>
          </Anchor>
        </form>
      </AuthCard>
    </Container>
  );
}
