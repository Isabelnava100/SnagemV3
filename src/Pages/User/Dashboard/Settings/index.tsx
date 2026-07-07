import { Outlet } from "react-router-dom";
import SubTabsLayout from "../../../../components/Dashboard/SubTabsLayout";

export default function SettingsLayout() {
  const settingsTabLinks = [
    { path: "Notifications", label: "Notifications" },
    { path: "Collections", label: "Collections" },
    { path: "Signature", label: "Signature" },
    { path: "Accessibility", label: "Accessibility" },
  ];
  return (
    <SubTabsLayout links={settingsTabLinks} parentRoutePath="/Dashboard/Settings">
      <Outlet />
    </SubTabsLayout>
  );
}
