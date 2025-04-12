import TabsNav from "@/app/dashboard/master/tabs-nav";
import { GradeTabs } from "@/components/grade/grade-tabs";

export default function GradesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">成績</h1>
      <TabsNav />
      <GradeTabs />
    </div>
  );
}
