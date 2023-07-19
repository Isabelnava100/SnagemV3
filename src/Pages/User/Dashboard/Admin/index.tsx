import { Outlet } from "react-router";
import SubTabsLayout from "../../../../components/Dashboard/SubTabsLayout";

export default function AdminLayout() {
  const adminTabLinks = [
    { path: "Adjust-Lists", label: "Adjust Lists" },
    { path: "Donate", label: "Donate" },
  ];
  return (
    <SubTabsLayout links={adminTabLinks} parentRoutePath="/Dashboard/Admin-Access">
      <Outlet />
    </SubTabsLayout>
  );
}
