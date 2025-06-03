import { ReactNode } from "react";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto w-full py-6 px-4">
        {children}
      </main>
    </div>
  );
}
