"use client"

import {useState} from "react"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {SubjectTable} from "@/components/subject/subject-table"
import {SubjectFormDialog} from "@/components/subject/subject-form-dialog"

export function SubjectTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    return (
        <Tabs defaultValue="list" className="w-full">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Subjects</h1>
                <TabsList>
                    <TabsTrigger value="list">List View</TabsTrigger>
                    <TabsTrigger value="create" onClick={() => setIsCreateDialogOpen(true)}>
                        Create New
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
                <SubjectTable/>
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <SubjectFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open)
                }}
            />
        </Tabs>
    )
}
