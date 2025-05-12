import TabsNav from "@/app/dashboard/master/tabs-nav";
import { EventTabs } from "@/components/event/event-tabs";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">イベント</h1>
      <TabsNav />
      <EventTabs />
    </div>
  );
}
