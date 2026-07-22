import {
  Anchor,
  Box,
  Button,
  Center,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import Seo from "../../components/common/Seo";
import { MarketingTopBar } from "../../components/redesign/Marketing";
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
    <>
    <MarketingTopBar context="auth" />
    <div className="authShell">
      <Seo noindex title="Forgot Password | Snagem Guild" />
      <AuthCard title="Forgot Password" maw={540}>
        <form
          onSubmit={form.onSubmit((values) => {
            resetPassword(values.email);
          })}
        >
          <Stack gap="lg">
            <Text fz={15} c="#b6b1bc" lh={1.6}>
              Enter your email to get a reset link.
            </Text>
            <TextInput
              label="Email Address"
              required
              {...form.getInputProps("email")}
            />
            <Button
              type="submit"
              size="lg"
              radius={0}
              className="authBtnPrimary"
              fullWidth
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
    </div>
    </>
  );
}
