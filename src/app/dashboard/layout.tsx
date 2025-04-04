import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/dashboard/Navbar";
import { auth } from "@/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/auth/login");
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full py-6 px-4">
        {children}
      </main>
    </div>
  );
}