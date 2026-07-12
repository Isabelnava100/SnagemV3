import { useQuery } from "@tanstack/react-query";
import { Capability } from "../components/types/typesUsed";
import { useAuth } from "../context/AuthContext";
import { hasCapability, isAdmin } from "../lib/permissions";
import { getUnseenAnnouncement } from "../queries/announcements";
import { getNotifications } from "../queries/game";

/**
 * Drives the red dot on the nav Alerts button. Lights up for:
 * - unread in-app notifications (thread pings, bookmark activity, rewards),
 * - an active announcement the member has not read yet,
 * - and, for staff, anything waiting in the admin inbox (applications,
 *   imports, mission grading, master requests, challenge requests).
 * Queries share keys with the dashboard bell and the admin inbox so the cache
 * is reused; react-query's default staleTime keeps the read cost low.
 */
export function useAlertsBadge(): { show: boolean; staffPending: number; target: string } {
  const { user } = useAuth();
  const uid = user?.uid;

  const admin = isAdmin(user);
  const canApps = admin;
  const canImports = admin || hasCapability(user, Capability.ApproveImports);
  const canGrade = admin || hasCapability(user, Capability.ReviewRewards);
  const canChallenges =
    admin ||
    hasCapability(user, Capability.HostMainForum) ||
    hasCapability(user, Capability.ReviewRewards);

  const notifications = useQuery({
    queryKey: ["notifications", uid],
    queryFn: () => getNotifications(uid as string),
    enabled: !!uid,
  });
  const unreadNotifications = (notifications.data ?? []).filter((n) => !n.read).length;

  const unseenAnnouncement = useQuery({
    queryKey: ["announcement-unseen", uid],
    queryFn: () => getUnseenAnnouncement(uid as string),
    enabled: !!uid,
  });

  const apps = useQuery({
    queryKey: ["new-users"],
    queryFn: async () => (await import("../queries/applicants")).getNewUsers(),
    enabled: canApps,
  });
  const imports = useQuery({
    queryKey: ["pending-imports"],
    queryFn: async () => (await import("../queries/imports")).getPendingImports(),
    enabled: canImports,
  });
  const missions = useQuery({
    queryKey: ["pending-submissions"],
    queryFn: async () => (await import("../queries/grading")).getPendingMissionSubmissions(),
    enabled: canGrade,
  });
  const master = useQuery({
    queryKey: ["pending-mm-requests"],
    queryFn: async () => (await import("../queries/grading")).getPendingMasterMissionRequests(),
    enabled: canGrade,
  });
  const challenges = useQuery({
    queryKey: ["pending-challenge-requests"],
    queryFn: async () => (await import("../queries/challenges")).getPendingChallengeRequests(),
    enabled: canChallenges,
  });
  const clearances = useQuery({
    queryKey: ["pending-clearance-requests"],
    queryFn: async () => (await import("../queries/research")).getPendingClearanceRequests(),
    enabled: canGrade,
  });

  const staffPending =
    (canApps ? apps.data?.length ?? 0 : 0) +
    (canImports ? imports.data?.length ?? 0 : 0) +
    (canGrade
      ? (missions.data?.length ?? 0) + (master.data?.length ?? 0) + (clearances.data?.length ?? 0)
      : 0) +
    (canChallenges ? challenges.data?.length ?? 0 : 0);

  const show = !!uid && (unreadNotifications > 0 || !!unseenAnnouncement.data || staffPending > 0);

  // Staff work first, then the personal inbox, then the dashboard announcement.
  const target =
    staffPending > 0
      ? "/Admin"
      : unreadNotifications > 0 || !unseenAnnouncement.data
        ? "/Dashboard/Settings/Notifications"
        : "/Dashboard";

  return { show, staffPending, target };
}
