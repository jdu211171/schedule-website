import TabsNav from "@/app/dashboard/master/tabs-nav";
import { EvaluationTabs } from "@/components/evaluation/evaluation-tabs";

export default function EvaluationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">評価</h1>
      <TabsNav />
      <EvaluationTabs />
    </div>
  );
}
