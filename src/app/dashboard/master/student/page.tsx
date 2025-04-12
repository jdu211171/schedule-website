import TabsNav from "@/app/dashboard/master/tabs-nav";
import { StudentTabs } from "@/components/student/student-tabs";

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">学生</h1>
      <TabsNav />
      <StudentTabs />
    </div>
  );
}
