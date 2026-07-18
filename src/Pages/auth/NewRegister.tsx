import {
  Alert,
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  PasswordInput,
  Popover,
  Progress,
  Radio,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard, warmGradient } from "./components/AuthCard";
import { Gusers, PasswordRequirement, getStrength, requirements } from "./components/Components";
import { registerUser } from "./components/RegisterHandle";

/** Per-email local key for an in-progress application draft. */
const draftKey = (email: string) => "snagem:appdraft:" + email.trim().toLowerCase();

export function NewRegister() {
  const refRadio = useRef<HTMLInputElement>(null);
  const refTextarea = useRef<HTMLTextAreaElement>(null);
  const [popoverOpened, setPopoverOpened] = useState<boolean>(false);
  const [value, setValue] = useState<string>("");
  const [whensubmit, setWhenSubmit] = useState<boolean>(false);
  const [gaia, setGaia] = useState<string>("No");
  const [emailExists, setEmailExists] = useState<boolean>(false);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const strength = getStrength(value);
  const color = strength === 100 ? "teal" : strength > 50 ? "gold.1" : "red";

  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(value)} />
  ));

  const form = useForm({
    initialValues: {
      email: "",
      username: "",
      isGaia: gaia,
      gaiaName: "",
      application: "",
      password: "",
      confirmPassword: "",
    },

    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : "Invalid email."),
      username: (value: string) => (/^[a-zA-Z0-9-_]{3,23}$/.test(value) ? null : "Invalid username."),
      password: (value: string) => {
        if (gaia === "No") return null;
        if (value.length < 6) return "Password must include at least 6 characters.";
        const isValid = requirements.every((req) => req.re.test(value));
        return isValid ? null : "Password does not meet all requirements.";
      },
      confirmPassword: (value: string, values: any) =>
        value !== values.password && gaia === "Yes" ? "Passwords did not match." : null,
      application: (value: string) =>
        value.length < 500 && gaia === "No"
          ? "Application must be at least 500 characters long."
          : null,
      gaiaName: (value: string) =>
        gaia === "Yes" &&
        Gusers.findIndex((element) => {
          return element.toLowerCase() === value.toLowerCase();
        }) < 0
          ? "Gaia username does not exist."
          : null,
    },
  });

  const email = form.values.email;
  const application = form.values.application;
  const emailValid = /^\S+@\S+$/.test(email);
  const canDraft = gaia === "No" && emailValid && !emailExists;

  // A non-Gaia applicant's essay is long; auto-save it in this browser keyed by
  // email so they can leave and come back. Skipped when an account already
  // exists for the email (they should log in, not re-apply).
  useEffect(() => {
    if (gaia === "No" && emailValid) {
      let active = true;
      const t = setTimeout(async () => {
        try {
          const { fetchSignInMethodsForEmail } = await import("firebase/auth");
          const { auth } = await import("../../context/firebase");
          const methods = await fetchSignInMethodsForEmail(auth, email.trim());
          if (active) setEmailExists(methods.length > 0);
        } catch {
          if (active) setEmailExists(false);
        }
      }, 500);
      return () => {
        active = false;
        clearTimeout(t);
      };
    }
    setEmailExists(false);
  }, [email, emailValid, gaia]);

  // Restore a saved draft when a fresh email is entered and the box is empty.
  useEffect(() => {
    if (!canDraft || application) return;
    const saved = localStorage.getItem(draftKey(email));
    if (saved) form.setFieldValue("application", saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, canDraft]);

  // Persist the draft as they type.
  useEffect(() => {
    if (!canDraft || !application) return;
    const t = setTimeout(() => {
      localStorage.setItem(draftKey(email), application);
      setDraftSaved(true);
    }, 600);
    return () => clearTimeout(t);
  }, [application, email, canDraft]);

  const handleSubmitReg = useCallback(async (values: typeof form.values) => {
    setWhenSubmit(true);
    try {
      const results = await registerUser(
        values.email,
        values.password,
        values.application,
        values.gaiaName,
        values.username
      );

      if (results === "success") {
        localStorage.removeItem(draftKey(values.email));
        setSubmitted(true);
      } else {
        if (results === "auth/email-already-in-use") {
          form.setErrors({ email: "Email already in use." });
        } else if (results === "auth/invalid-email") {
          form.setErrors({ email: "Badly formatted email." });
        } else if (results === "gaia-name-taken") {
          form.setErrors({
            gaiaName: "This Gaia username is already registered to another account.",
          });
        } else {
          form.setErrors({ email: "An unexpected error occurred. Please try again." });
        }
        setWhenSubmit(false);
      }
    } catch (err) {
      console.error(err);
      form.setErrors({ email: "A network error occurred." });
      setWhenSubmit(false);
    }
  }, [form]);

  if (submitted) {
    return (
      <Container size={560} my={40}>
        <AuthCard title="Check your email">
          <Stack gap={10}>
            <Alert color="teal" title="Application received">
              We sent a verification link to <b>{form.values.email}</b>. Open it to confirm your
              email address. {gaia === "No" ? "Our team will review your application" : "Our team will review your account"}{" "}
              once your email is verified.
            </Alert>
            <Text c="dimmed" size="sm">
              Did not get it? Check your spam folder. You can close this page.
            </Text>
            <Anchor component={Link} to="/Login" size="sm">
              Go to login
            </Anchor>
          </Stack>
        </AuthCard>
      </Container>
    );
  }

  return (
    <Container size={680} my={40}>
      <AuthCard title="Apply to Join">
        <form
          data-netlify="true"
          name="newRegister"
          onSubmit={form.onSubmit(handleSubmitReg)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Grid gap="xl" style={{ width: "100%" }}>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                required
                label="Email Address"
                {...form.getInputProps("email")}
              />
              {emailExists && (
                <Text c="gold.1" size="xs" mt={4}>
                  An account already exists for this email.{" "}
                  <Anchor component={Link} to="/Login" size="xs">
                    Log in instead
                  </Anchor>
                  .
                </Text>
              )}
              <TextInput
                required
                mt="md"
                label="Username"
                {...form.getInputProps("username")}
              />

              <Radio.Group
                size="sm"
                mt="md"
                ref={refRadio}
                value={form.values.isGaia}
                onChange={(val) => {
                  setGaia(val);
                  form.setFieldValue("isGaia", val);
                }}
                label="Are you in the gaiaonline Snagem guild?"
                required
              >
                <Group mt={6} gap="md">
                  <Radio value="Yes" label="Yes" />
                  <Radio value="No" label="No" />
                </Group>
              </Radio.Group>
              {gaia === "Yes" ? (
                ""
              ) : (
                <Text c="dimmed" size="sm" mt={5}>
                  Your registration will be accepted based on your application.{" "}
                  <Anchor<"a"> href="/About" size="sm" target="_blank">
                    {" "}
                    Learn more about Team Snagem here.{" "}
                  </Anchor>
                </Text>
              )}
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              {gaia === "Yes" ? (
                <>
                  <TextInput
                    required
                    label="Gaiaonline Username"
                    {...form.getInputProps("gaiaName")}
                  />

                  <Popover
                    opened={popoverOpened}
                    onChange={setPopoverOpened}
                    transitionProps={{ transition: "pop" }}
                    position="bottom-start"
                    width="target"
                  >
                    <Popover.Target>
                      <PasswordInput
                        mt="md"
                        required
                        {...form.getInputProps("password")}
                        label="Password"
                        description="Should include letters in lower and uppercase, at least 1 number and at least 1 special symbol."
                        value={value}
                        onFocus={() => setPopoverOpened((o) => true)}
                        onBlur={() => setPopoverOpened((o) => false)}
                        onChange={(event) => {
                          setValue(event.currentTarget.value);
                          form.setFieldValue("password", event.currentTarget.value);
                        }}
                      />
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Progress
                        color={color}
                        value={strength}
                        size={5}
                        style={{ marginBottom: 10 }}
                      />
                      <PasswordRequirement
                        label="Includes at least 6 characters"
                        meets={value.length > 5}
                      />
                      {checks}
                    </Popover.Dropdown>
                  </Popover>
                  <PasswordInput
                    {...form.getInputProps("confirmPassword")}
                    mt="md"
                    label="Confirm Password"
                    required
                  />
                </>
              ) : (
                <>
                  <Textarea
                    {...form.getInputProps("application")}
                    ref={refTextarea}
                    placeholder="Write your answer here."
                    description="With a character in mind write out a brief Roleplaying example based on a moment in your character's life. It can be a short story about where the grew up, why the decided to join Team Snagem or whatever you want. Just have it ending with them joining Team Snagem, or deciding to. Furthermore in this scenario reveal your character's starter Pokemon and a battle scene. The pokemon can be any first stage non-legendary Pokemon that still evolves."
                    label="Application"
                    autosize
                    minRows={12}
                    maxRows={18}
                    required
                  />

                  <Group justify="space-between">
                    {canDraft && draftSaved ? (
                      <Text size="xs" c="teal">
                        Draft saved to this browser
                      </Text>
                    ) : (
                      <span />
                    )}
                    <Text size="xs" c="dimmed">
                      {refTextarea.current?.value.length ? refTextarea.current?.value.length : 0}{" "}
                      Characters
                    </Text>
                  </Group>
                </>
              )}

              <Group justify="right" mt="xl">
                <Button
                  type="submit"
                  size="lg"
                  radius="md"
                  variant="gradient"
                  gradient={warmGradient}
                  disabled={whensubmit}
                >
                  Submit
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </form>
      </AuthCard>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{" "}
        <Anchor component={Link} to="/Login" size="sm">
          Go to login.
        </Anchor>
      </Text>
    </Container>
  );
}
