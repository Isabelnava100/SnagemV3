import { Outlet } from "react-router";
import SubTabsLayout from "../../../../components/Dashboard/SubTabsLayout";

export default function SettingsLayout() {
  const settingsTabLinks = [
    { path: "Notifications", label: "Notifications" },
    { path: "Collections", label: "Collections" },
  ];
  return (
    <SubTabsLayout links={settingsTabLinks} parentRoutePath="/Dashboard/Settings">
      <Outlet />
    </SubTabsLayout>
  );
}
