import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SettingsLayout } from "@/components/admin/settings/settings-layout";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user?.role === "STAFF") {
    redirect("/dashboard/schedules");
  }
  return <SettingsLayout />;
}
