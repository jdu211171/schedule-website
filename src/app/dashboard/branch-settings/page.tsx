import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BranchConflictSettings from "@/components/staff/branch-conflict-settings";

export default async function BranchSettingsPage() {
  const session = await auth();
  if (
    !session ||
    (session.user?.role !== "STAFF" && session.user?.role !== "ADMIN")
  ) {
    redirect("/dashboard/schedules");
  }
  return <BranchConflictSettings />;
}
