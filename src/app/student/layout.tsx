import Navbar from "@/components/Navbar";

export default function StudentPage({
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
