import { Navigate, Outlet, useLocation } from "react-router";
import SubTabsLayout, {
  SimpleSectionWrapper,
} from "../../../../components/Dashboard/SubTabsLayout";
import { Capability } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { hasCapability, isAdmin } from "../../../../lib/permissions";

// Each tool maps to the capability that unlocks it (null = admin-only, e.g.
// Permissions, which grants capabilities and must stay admin-only). Admins see
// every tab; a director sees only the tabs their capabilities cover.
const ADMIN_TABS: { path: string; label: string; cap: Capability | null }[] = [
  { path: "Adjust-Lists", label: "Adjust Lists", cap: Capability.ManageLists },
  { path: "Donate", label: "Give Items to Users", cap: Capability.GiveItems },
  { path: "Announcements", label: "Announcements", cap: Capability.ManageLists },
  { path: "Applicants", label: "Member Approvals", cap: null },
  { path: "Grading", label: "Grading", cap: Capability.ReviewRewards },
  { path: "Permissions", label: "Permissions & XP", cap: null },
  { path: "Mystery-Boxes", label: "Mystery Boxes", cap: Capability.ManageLists },
  { path: "Badges", label: "Badges", cap: Capability.ManageBadges },
  { path: "Imports", label: "Import Approvals", cap: Capability.ApproveImports },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const admin = isAdmin(user);

  const visible = ADMIN_TABS.filter(
    (t) => admin || (t.cap !== null && hasCapability(user, t.cap))
  );

  // No tools at all → not staff; bounce out.
  if (!visible.length) return <Navigate to="/Dashboard" replace />;

  // If they're on a tab they can't access (typed URL or the default redirect
  // landing on an admin-only tab), send them to their first available tool.
  const segment = location.pathname.split("/Dashboard/Admin-Access/")[1]?.split("/")[0] ?? "";
  if (segment && !visible.some((t) => t.path === segment)) {
    return <Navigate to={`/Dashboard/Admin-Access/${visible[0].path}`} replace />;
  }

  return (
    <SubTabsLayout
      links={visible.map(({ path, label }) => ({ path, label }))}
      parentRoutePath="/Dashboard/Admin-Access"
    >
      <SimpleSectionWrapper>
        <Outlet />
      </SimpleSectionWrapper>
    </SubTabsLayout>
  );
}
