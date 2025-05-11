import { MatchingTable } from "@/components/matching/table";

export default function MatchingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">マッチング</h1>
      <MatchingTable />
    </div>
  );
}
