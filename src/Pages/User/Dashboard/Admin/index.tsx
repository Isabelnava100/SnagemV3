import { Outlet } from "react-router";
import SubTabsLayout, {
  SimpleSectionWrapper,
} from "../../../../components/Dashboard/SubTabsLayout";

export default function AdminLayout() {
  const adminTabLinks = [
    { path: "Adjust-Lists", label: "Adjust Lists" },
    { path: "Donate", label: "Give Items to Users" },
  ];
  return (
    <SubTabsLayout links={adminTabLinks} parentRoutePath="/Dashboard/Admin-Access">
      <SimpleSectionWrapper>
        <Outlet />
      </SimpleSectionWrapper>
    </SubTabsLayout>
  );
}
