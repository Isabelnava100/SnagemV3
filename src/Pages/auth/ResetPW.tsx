import { useState,useCallback } from "react";
import {
  PasswordInput,  Paper,  Title,   Text,
  Container,  Group,  Button,  Progress,  Popover,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  requirements,
  PasswordRequirement,
  getStrength,
} from "./components/Components";
import '/src/assets/styles/authentication.css';

export function ResetPW() {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [value, setValue] = useState("");
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
      password: "",
      confirmPassword: "",
    },

    validate: {
      confirmPassword: (value, values) =>
        value !== values.password ? "Passwords did not match" : null,
    },
  });


  const handleValueChange = useCallback((event: { currentTarget: { value: string; }; }) => {
    const newValue = event.currentTarget.value;
    setValue(newValue);
    form.setFieldValue("password", newValue);
  }, [form]);

  const handlePopoverChange = useCallback((opened:boolean) => {
    setPopoverOpened(opened);
  }, []);

  return (
    <Container size={460} my={30}>
      <Title className='titleAuth' align="center">
        Reset Your Password
      </Title>
      <Text color="dimmed" size="sm" align="center">
        Enter your new password.
      </Text>

      <Paper
        withBorder
        shadow="md"
        p={30}
        radius="md"
        mt="xl"
        className='paperBGAuth'
      >
        <form
          onSubmit={form.onSubmit((values) => {
            console.log(values);
          })}
        >
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
          <Popover opened={popoverOpened} onChange={setPopoverOpened}>
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
        </form>

        <Group position="apart" mt="lg" className='controlsAuth'>
          <Button className='controlAuth'>Reset password</Button>
        </Group>
      </Paper>
    </Container>
  );
}
