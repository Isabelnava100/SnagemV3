import { Navigate, Outlet } from "react-router";
import SubTabsLayout, {
  SimpleSectionWrapper,
} from "../../../../components/Dashboard/SubTabsLayout";
import { useAuth } from "../../../../context/AuthContext";

export default function AdminLayout() {
  const adminTabLinks = [
    { path: "Adjust-Lists", label: "Adjust Lists" },
    { path: "Donate", label: "Give Items to Users" },
  ];
  const { user } = useAuth();
  if (user?.otherinfo?.permissions !== "Admin") {
    return <Navigate to="/Dashboard" />;
  }
  return (
    <SubTabsLayout links={adminTabLinks} parentRoutePath="/Dashboard/Admin-Access">
      <SimpleSectionWrapper>
        <Outlet />
      </SimpleSectionWrapper>
    </SubTabsLayout>
  );
}
