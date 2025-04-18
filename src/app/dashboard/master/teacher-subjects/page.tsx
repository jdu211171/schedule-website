import TabsNav from "@/app/dashboard/master/tabs-nav"
import { TeacherSubjectTable } from "@/components/teacher-subject/teacher-subject-table"

export default function TeacherSubjectsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">講師科目</h1>
            <TabsNav />
            <TeacherSubjectTable />
        </div>
    )
}