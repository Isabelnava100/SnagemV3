import { Flex, Stack, Switch, TextInput, type SwitchProps } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { v4 as uuid } from "uuid";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";
import { SectionLoader } from "../../../../components/navigation/loading";
import { Settings } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { getSettings } from "../../../../queries/settings";

interface CustomSwitchProps extends SwitchProps {}

const CustomSwitch = React.forwardRef<HTMLInputElement, CustomSwitchProps>((props, ref) => {
  const { label, ...restProps } = props;
  return (
    <Switch
      label={label}
      size="md"
      color="cyan.1"
      styles={{ label: { color: "white" } }}
      {...restProps}
    />
  );
});

function CreateNewDiscordTicket() {
  const [input, setInput] = React.useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation({
    mutationKey: ["create-new-discord-ticket"],
    mutationFn: async () => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      const docRef = doc(db, "tickets", "discord");
      await setDoc(
        docRef,
        {
          [uuid()]: {
            approved: false,
            discord_name: input,
            user_id: user?.uid,
            username: user?.username,
          },
        },
        { merge: true }
      );
    },
  });

  const handleClick = async () => {
    if (!input.trim().length) return;
    try {
      await mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["get-settings"] });
      setInput("");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Flex gap="md">
      <TextInput
        onChange={(e) => setInput(e.target.value)}
        value={input}
        placeholder="Enter Your Discord Name Tag"
        sx={{ flex: 1 }}
      />
      <GradientButtonSecondary loading={isLoading} onClick={handleClick}>
        Submit for Review
      </GradientButtonSecondary>
    </Flex>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const [isFirstTime, setFirstTime] = React.useState(true);
  const { isLoading, isError, data, isSuccess } = useQuery({
    queryKey: ["get-settings"],
    queryFn: () => getSettings(user?.uid as string),
  });
  const { getInputProps, setValues, values } = useForm<Settings>({
    initialValues: {
      directPingNotifications: false,
      discordNotifications: false,
      postsAndBookmarkedThreadsNotification: false,
      siteNotifications: false,
    },
  });
  const [debouncedValue] = useDebouncedValue(values, 100);

  const { mutateAsync, isLoading: isProcessing } = useMutation({
    mutationKey: ["update-settings"],
    mutationFn: async ({ settingsInput }: { settingsInput: Settings }) => {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../../../../context/firebase");
      const docRef = doc(db, "users", user?.uid as string);
      await setDoc(docRef, { settings: { ...settingsInput } }, { merge: true });
    },
  });

  const queryClient = useQueryClient();

  const handleSaveChanges = async (values: Settings) => {
    try {
      await mutateAsync({ settingsInput: values });
      await queryClient.invalidateQueries({ queryKey: ["get-settings"] });
    } catch (err) {
      console.log(err);
    }
  };

  // Once the data is loaded, place that data in the form
  React.useEffect(() => {
    if (!isLoading && isSuccess) {
      setValues({ ...data });
    }
  }, [isLoading]);

  /**
   * * Autosave the changes
   * Don't save the document initially
   * Avoid it the first time, once the data is placed in the form,
   * Then allow saving it
   */
  React.useEffect(() => {
    if (!isFirstTime) {
      handleSaveChanges(debouncedValue);
    }
    setFirstTime(false);
  }, [debouncedValue]);

  if (isLoading) return <SectionLoader />;
  if (isError) return <></>;

  return (
    <Stack>
      <CustomSwitch
        disabled={isProcessing}
        {...getInputProps("siteNotifications", { type: "checkbox" })}
        label="Enable on-site notifications"
      />
      <Stack>
        <CustomSwitch
          disabled={isProcessing}
          {...getInputProps("discordNotifications", { type: "checkbox" })}
          label="Enable Discord notifications"
        />
        {values.discordNotifications && <CreateNewDiscordTicket />}
      </Stack>
      <CustomSwitch
        disabled={isProcessing}
        {...getInputProps("postsAndBookmarkedThreadsNotification", { type: "checkbox" })}
        label="Receive notifications for new posts on your bookmarked threads"
      />
      <CustomSwitch
        disabled={isProcessing}
        {...getInputProps("directPingNotifications", { type: "checkbox" })}
        label="Receive notifications for direct pings"
      />
    </Stack>
  );
}
