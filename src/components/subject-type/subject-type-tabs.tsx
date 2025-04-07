"use client"

import {useState} from "react"
import {Tabs, TabsContent} from "@/components/ui/tabs"
import {SubjectTypeTable} from "@/components/subject-type/subject-type-table"
import {SubjectTypeFormDialog} from "@/components/subject-type/subject-type-form-dialog"

export function SubjectTypeTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="mt-0">
                <SubjectTypeTable/>
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <SubjectTypeFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open)
                }}
            />
        </Tabs>
    )
}
