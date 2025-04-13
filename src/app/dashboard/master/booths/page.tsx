import TabsNav from "@/app/dashboard/master/tabs-nav";
import { BoothTabs } from "@/components/booth/booth-tabs";

export default function BoothsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">ブース</h1>
      <TabsNav />
      <BoothTabs />
    </div>
  );
}
