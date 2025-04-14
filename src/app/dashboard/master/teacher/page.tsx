import TabsNav from "@/app/dashboard/master/tabs-nav";
import { TeacherTabs } from "@/components/teacher/teacher-tabs";

export default function TeachersPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">講師</h1>
            <TabsNav />
            <TeacherTabs />
        </div>
    );
}