import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/dashboard/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full py-6 px-4">
        {children}
      </main>
    </div>
  );
}
