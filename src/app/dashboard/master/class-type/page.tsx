import TabsNav from "@/app/dashboard/master/tabs-nav";
import { ClassTypeTabs } from "@/components/class-type/class-type-tabs";

export default function ClassTypePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">授業タイプ</h1>
      <TabsNav />
      <ClassTypeTabs />
    </div>
  );
}
