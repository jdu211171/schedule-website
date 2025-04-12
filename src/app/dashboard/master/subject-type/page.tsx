import TabsNav from "@/app/dashboard/master/tabs-nav";
import { SubjectTypeTabs } from "@/components/subject-type/subject-type-tabs";

export default function SubjectTypesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">科目タイプ</h1>
      <TabsNav />
      <SubjectTypeTabs />
    </div>
  );
}
