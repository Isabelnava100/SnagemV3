import { useState, useRef, useCallback } from "react";
import {
  TextInput,  PasswordInput,  Anchor,  Paper,  Title,  Text,  Container, 
  Button,  Grid,  Textarea,  Progress, Popover,   Radio, Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import {
  requirements,
  Gusers,
  PasswordRequirement,
  getStrength
} from "./components/Components";
import { registerUser } from "./components/RegisterHandle";

export function NewRegister() {
  const refRadio = useRef<HTMLInputElement>(null);
  const refTextarea = useRef<HTMLTextAreaElement>(null);
  const [popoverOpened, setPopoverOpened] = useState<boolean>(false);
  const [value, setValue] = useState<string>("");
  const [whensubmit, setwhensubmit] = useState<boolean>(false);
  const [gaia, setGaia] = useState<string>("No");
  const navigate = useNavigate();
  const strength = getStrength(value);
  const color = strength === 100 ? "teal" : strength > 50 ? "yellow" : "red";
  
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement
      key={index}
      label={requirement.label}
      meets={requirement.re.test(value)}
    />
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
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email."),
      username: (value) =>
        /^[a-zA-Z0-9-_]{3,23}$/.test(value) ? null : "Invalid username.",
      confirmPassword: (value, values) =>
        value !== values.password && gaia === "Yes"
          ? "Passwords did not match."
          : null,
      application: (value) =>
        value.length < 500 && gaia === "No"
          ? "Application must be at least 500 characters long."
          : null,
      gaiaName: (value) =>
        gaia === "Yes" &&
        Gusers.findIndex((element) => {
          return element.toLowerCase() === value.toLowerCase();
        }) < 0
          ? "Gaia username does not exist."
          : null,
    },
  });

  const handleSubmitReg = useCallback(
    async () => {
      setwhensubmit(true);
      const values = form.values;
      const results = await registerUser(
          values.email,
          values.password,
          values.application,
          values.gaiaName,
          values.username,
        );
      if (results === "success") {
        // navigate('/Login', { replace: true });
        // window.location.reload();
      } else {
        if (results === "auth/email-already-in-use") {
          form.setErrors({ email: "Email already in use." });
        }
        if (results === "auth/invalid-email") {
          form.setErrors({ email: "Badly formatted email." });
        }
      }
    },
    [form, navigate]
  );

  return (
    <Container size={840} my={40}>
      <Title
        align="center"
        sx={(theme) => ({
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          fontWeight: 900,
        })}
      >
        Apply to Join
      </Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Already have an account?{" "}
        <Anchor<"a"> href="Login" size="sm">
          Go to login.
        </Anchor>
      </Text>

      <Paper
        withBorder
        shadow="md"
        p={30}
        mt={30}
        radius="md"
        style={{ background: "#222125" }}
      >
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
          <Grid gutter="sm" style={{ width: "100%" }}>
            <Grid.Col xs={6}>
              <TextInput
                required
                label="Email"
                placeholder="Your@email.com"
                {...form.getInputProps("email")}
              />
              <TextInput
                required
                mt="md"
                label="Username"
                placeholder="Username"
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
                <Radio value="Yes" label="Yes" />
                <Radio value="No" label="No" />
              </Radio.Group>
              {gaia === "Yes" ? (
                ""
              ) : (
                <Text color="dimmed" size="sm" mt={5}>
                  Your registration will be accepted based on your application.{" "}
                  <Anchor<"a"> href="/Forum/1" size="sm" target="_blank">
                    {" "}
                    Learn more about Team Snagem here.{" "}
                  </Anchor>
                </Text>
              )}
            </Grid.Col>
            <Grid.Col xs={6}>
              {gaia === "Yes" ? (
                <>
                  <TextInput
                    required
                    label="Gaiaonline Username"
                    placeholder="Your gaiaonline username"
                    {...form.getInputProps("gaiaName")}
                  />

                  <Popover
                    opened={popoverOpened}
                    onChange={setPopoverOpened}
                    transition="pop"
                    position="bottom-start"
                  >
                    <Popover.Target>
                      <PasswordInput
                        mt="md"
                        required
                        {...form.getInputProps("password")}
                        label="Your password"
                        placeholder="Your password"
                        description="Should include letters in lower and uppercase, at least 1 number and at least 1 special symbol."
                        value={value}
                        onFocus={() => setPopoverOpened((o) => true)}
                        onBlur={() => setPopoverOpened((o) => false)}
                        onChange={(event) => {
                          setValue(event.currentTarget.value);
                          form.setFieldValue(
                            "password",
                            event.currentTarget.value
                          );
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
                    placeholder="Your Password again"
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
                    minRows={12}
                    required
                  />

                  <Group position="right">
                    <Text size="xs">
                      {refTextarea.current?.value.length
                        ? refTextarea.current?.value.length
                        : 0}{" "}
                      Characters
                    </Text>
                  </Group>
                </>
              )}

              <Group position="right" mt="md">
                <Button type="submit" disabled={whensubmit}>
                  Submit
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
