import TabsNav from "@/app/dashboard/master/tabs-nav";
import { ClassTabs } from "@/components/class/class-tabs";

export default function ClassPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">クラス</h1>
      <TabsNav />
      <ClassTabs />
    </div>
  );
}
