import TabsNav from "@/app/dashboard/master/tabs-nav";
import { StudentSubjectTable } from "@/components/student-subject/student-subject-table";

export default function StudentSubjectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">生徒希望科目</h1>
      <TabsNav />
      <StudentSubjectTable />
    </div>
  );
}
