import {
  Alert,
  Anchor,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconBrandGoogle } from "@tabler/icons-react";
import Seo from "../../components/common/Seo";
import { useAuth } from "../../context/AuthContext";
import { AuthCard, coolGradient, warmGradient } from "./components/AuthCard";
import { handleGoogleSignIn } from "./components/GoogleHandle";
import { handleSignIn } from "./components/LoginHandle";

const EEVEE_IMG =
  "https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/site%2Fsleepingeevee.png?alt=media&token=72f49c9d-9479-441f-bae3-4191b18ba42f";

export function Login() {
  const navigate = useNavigate();
  const [submitted, setSub] = useState(false);
  const [googleError, setGoogleError] = useState("");
  // Application still in the NewUsers queue: show a clear notice instead of a
  // field error so applicants know a human is on it.
  const [pendingNotice, setPendingNotice] = useState(false);
  const { setUser, user } = useAuth();
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
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

  const onGoogle = async () => {
    setSub(true);
    setGoogleError("");
    const result = await handleGoogleSignIn(setUser);
    if (result === "success") {
      navigate("/Dashboard");
    } else if (result === "pending") {
      setPendingNotice(true);
    } else if (result === "no-account") {
      setGoogleError("No account matches that Google email. Apply to join first.");
    } else if (result !== "auth/popup-closed-by-user" && result !== "auth/cancelled-popup-request") {
      setGoogleError("Google sign-in failed. Please try again.");
    }
    setSub(false);
  };

  return (
    <Container size={680} my={40}>
      <Seo noindex title="Log In | Snagem Guild" />
      <AuthCard title="Access the Dashboard">
        {pendingNotice && (
          <Alert
            color="yellow"
            variant="light"
            mb={16}
            title="Application received"
            role="status"
            aria-live="polite"
          >
            Your registration is being checked manually by an admin. This usually takes a day or
            two. You will be able to log in as soon as it is approved, and returning Gaia members
            can then import their collection from the dashboard.
          </Alert>
        )}
        <form
          onSubmit={form.onSubmit(async (values) => {
            setSub(true);
            const results = await handleSignIn(values.email, values.password, setUser);
            if (results === "auth/user-not-found" || results === "auth/invalid-credential" || results === "auth/invalid-email") {
              form.setFieldError("email", "Invalid email or password");
              form.setFieldError("password", "Invalid email or password");
            } else if (results === "auth/wrong-password") {
              form.setFieldError("password", "Invalid password");
            } else if (results === "auth/too-many-requests") {
              form.setFieldError("email", "Too many attempts");
            } else if (results === "pending") {
              setPendingNotice(true);
            } else if (results === "unlinked") {
              form.setFieldError(
                "email",
                "This login isn't linked to a member profile yet. Contact an admin to finish setting up your account."
              );
            } else if (results === "success") {
              form.reset();
              navigate("/Dashboard");
            } else {
              form.setFieldError("email", "An unexpected error occurred");
            }
            setSub(false);
          })}
        >
          <Grid gap="xl" align="center">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <TextInput
                label="Email Address"
                required
                {...form.getInputProps("email")}
              />
              <PasswordInput
                mt="md"
                required
                label="Password"
                {...form.getInputProps("password")}
              />
              <Group justify="right" mt={6}>
                <Anchor component={Link} to="/Forgot" size="sm" c="dimmed">
                  Forgot your password?
                </Anchor>
              </Group>
              <Button
                type="submit"
                fullWidth
                mt="xl"
                size="lg"
                radius="md"
                variant="gradient"
                gradient={warmGradient}
                disabled={submitted}
              >
                {submitted ? "Loading..." : "LOG IN"}
              </Button>
              <Divider label="or" labelPosition="center" my="md" />
              <Button
                fullWidth
                variant="default"
                radius="md"
                leftSection={<IconBrandGoogle size={18} />}
                onClick={onGoogle}
                disabled={submitted}
              >
                Continue with Google
              </Button>
              {googleError && (
                <Text c="red" size="sm" mt="xs" ta="center">
                  {googleError}
                </Text>
              )}
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Stack align="center" gap="sm">
                <img src={EEVEE_IMG} alt="Sleeping Eevee" className="authEevee" />
                <Text size="sm" c="dimmed">
                  Don&apos;t have an account yet?
                </Text>
                <Button
                  component={Link}
                  to="/Register"
                  radius="xl"
                  variant="gradient"
                  gradient={coolGradient}
                >
                  Apply to Join
                </Button>
              </Stack>
            </Grid.Col>
          </Grid>
        </form>
      </AuthCard>
    </Container>
  );
}
