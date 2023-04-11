import * as Core from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { handleSignIn } from "./components/LoginHandle";

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
  });

  useEffect(() => {
    if (user) {
      navigate("/Profile");
    }
  }, [user]);

  return (
    <Core.Container size={420} my={40}>
      <Core.Title
        align="center"
        sx={(theme) => ({ fontFamily: `Greycliff CF, ${theme.fontFamily}`, fontWeight: 900 })}
      >
        Welcome back!
      </Core.Title>
      <Core.Text color="dimmed" size="sm" align="center" mt={5}>
        Do not have an account yet?{" "}
        <Core.Anchor<"a"> href="Register" size="sm">
          Apply to Join.
        </Core.Anchor>
      </Core.Text>
      <form
        onSubmit={form.onSubmit((values) => {
          setSub(true);
          handleSignIn(values.email, values.password, values.remember, setUser).then((results) => {
            if (results) {
              navigate("/Profile");
              return true;
            } else {
              if (results === "auth/user-not-found") {
                form.setErrors({ email: "Invalid email." });
              } else if (results === "auth/wrong-password") {
                form.setErrors({ password: "Invalid password." });
              } else if (results === "auth/too-many-requests") {
                form.setErrors({ email: "Try again later." });
              }
              setSub(false);
            }
            return;
          });
        })}
      >
        <Core.Paper
          withBorder
          shadow="md"
          p={30}
          mt={30}
          radius="md"
          style={{ background: "#222125" }}
        >
          <Core.TextInput
            label="Email"
            placeholder="Your@email.com"
            required
            {...form.getInputProps("email")}
          />
          <Core.PasswordInput
            mt="md"
            required
            // {...form.getInputProps('password')}
            label="Your password"
            placeholder="Your password"
            value={value}
            onChange={(event) => {
              setValue(event.currentTarget.value);
              form.setFieldValue("password", event.currentTarget.value);
            }}
          />
          <Core.Group position="apart" mt="md">
            <Core.Checkbox label="Remember me" {...form.getInputProps("remember")} />
            <div></div>
            <Core.Anchor<"a"> href="Forgot" size="sm">
              Forgot password?
            </Core.Anchor>
          </Core.Group>
          <Core.Button type="submit" fullWidth mt="xl" disabled={submitted}>
            {submitted ? "Loading..." : "Sign in"}
          </Core.Button>
        </Core.Paper>
      </form>
    </Core.Container>
  );
}
