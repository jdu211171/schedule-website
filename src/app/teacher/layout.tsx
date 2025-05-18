"use client";

import Navbar from "@/components/dashboard/Navbar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-6 mx-auto">{children}</main>
    </div>
  );
}
