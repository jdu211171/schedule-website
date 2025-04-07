"use client"

import {useState} from "react"
import {ClassTable} from "@/components/class/class-table"
import {ClassFormDialog} from "./class-form-dialog"
import {Tabs, TabsContent} from "@/components/ui/tabs"

export function ClassTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="mt-0">
                <ClassTable/>
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <ClassFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open)
                }}
            />
        </Tabs>
    )
}
