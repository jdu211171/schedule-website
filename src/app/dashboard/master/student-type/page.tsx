import TabsNav from "@/app/dashboard/master/tabs-nav";
import { StudentTypeTabs } from "@/components/student-type/student-type-tabs";

export default function StudentTypesPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">学生タイプ</h1>
            <TabsNav />
            <StudentTypeTabs />
        </div>
    );
}