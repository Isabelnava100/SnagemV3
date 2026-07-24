import { Outlet } from "react-router-dom";
import SubTabsLayout from "../../../../components/Dashboard/SubTabsLayout";

export default function SettingsLayout() {
  // Order follows the redesign mockup; Navigation is a build-only extra tab
  // the mockup doesn't have, so it goes last.
  const settingsTabLinks = [
    { path: "Notifications", label: "Notifications" },
    { path: "Collections", label: "Collections" },
    { path: "Signature", label: "Signature" },
    { path: "Accessibility", label: "Accessibility" },
    { path: "Navigation", label: "Navigation" },
  ];
  return (
    <SubTabsLayout links={settingsTabLinks} parentRoutePath="/Dashboard/Settings">
      <Outlet />
    </SubTabsLayout>
  );
}
