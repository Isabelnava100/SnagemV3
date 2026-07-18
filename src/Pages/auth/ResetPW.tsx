import { useState, useCallback } from "react";
import {
  PasswordInput,
  Container, Group, Button, Progress, Popover,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  requirements,
  PasswordRequirement,
  getStrength,
} from "./components/Components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../../context/firebase";
import { AuthCard, warmGradient } from "./components/AuthCard";

export function ResetPW() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const navigate = useNavigate();

  const [popoverOpened, setPopoverOpened] = useState(false);
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const strength = getStrength(value);
  const color = strength === 100 ? "teal" : strength > 50 ? "gold.1" : "red";

  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement
      key={index}
      label={requirement.label}
      meets={requirement.re.test(value)}
    />
  ));

  const form = useForm({
    initialValues: {
      password: "",
      confirmPassword: "",
    },

    validate: {
      password: (val) => {
        if (val.length < 6) return "Password must include at least 6 characters.";
        const isValid = requirements.every((req) => req.re.test(val));
        return isValid ? null : "Password does not meet all requirements.";
      },
      confirmPassword: (val, values) =>
        val !== values.password ? "Passwords did not match" : null,
    },
  });

  const handleValueChange = useCallback(
    (event: { currentTarget: { value: string } }) => {
      const newValue = event.currentTarget.value;
      setValue(newValue);
      form.setFieldValue("password", newValue);
    },
    [form]
  );

  const handlePopoverChange = useCallback((opened: boolean) => {
    setPopoverOpened(opened);
  }, []);

  const handlePasswordReset = (values: typeof form.values) => {
    if (!oobCode) {
      alert("Invalid or missing password reset link. Please request a new email from the Forgot Password screen.");
      return;
    }
    setSubmitted(true);
    confirmPasswordReset(auth, oobCode, values.password)
      .then(() => {
        alert("Your password has been successfully reset! You can now log in.");
        navigate("/Login");
      })
      .catch((error) => {
        if (error.code === "auth/invalid-action-code") {
          alert("The reset link has expired or has already been used. Please request a new one.");
        } else {
           alert("Something went wrong changing your password. " + error.message);
        }
      })
      .finally(() => {
        setSubmitted(false);
      });
  };

  return (
    <Container size={640} my={40}>
      <AuthCard title="Reset Your Password">
        <form onSubmit={form.onSubmit(handlePasswordReset)}>
          <Popover
            opened={popoverOpened}
            onChange={setPopoverOpened}
            position="bottom-start"
            width="target"
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
                onFocus={() => handlePopoverChange(true)}
                onBlur={() => handlePopoverChange(false)}
                onChange={handleValueChange}
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
            placeholder="Your New Password again"
            mt="md"
            label="Confirm new password"
            required
          />

          <Group justify="right" mt="xl">
            <Button
              type="submit"
              size="lg"
              radius="md"
              variant="gradient"
              gradient={warmGradient}
              disabled={submitted}
            >
              {submitted ? "Updating..." : "Reset Password"}
            </Button>
          </Group>
        </form>
      </AuthCard>
    </Container>
  );
}
