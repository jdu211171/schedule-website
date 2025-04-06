"use client"

import {useState} from "react"
import {ClassTable} from "@/components/class/class-table"
import {ClassFormDialog} from "./class-form-dialog"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"

export function ClassTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    return (
        <Tabs defaultValue="list" className="w-full">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Class Types</h1>
                <TabsList>
                    <TabsTrigger value="list">List View</TabsTrigger>
                    <TabsTrigger value="create" onClick={() => setIsCreateDialogOpen(true)}>
                        Create New
                    </TabsTrigger>
                </TabsList>
            </div>

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
