"use client";

import Navbar from "@/components/dashboard/Navbar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-6 max-w-full mx-8">{children}</main>
    </div>
  );
}
