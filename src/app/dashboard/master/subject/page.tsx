import TabsNav from "@/app/dashboard/master/tabs-nav"
import {SubjectTabs} from "@/components/subject/subject-tabs"

export default function SubjectTypesPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">科目</h1>
            <TabsNav />
            <SubjectTabs />
        </div>
    )
}
