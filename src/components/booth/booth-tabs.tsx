"use client"

import { useState } from "react"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "../tabs"
import {BoothFormDialog} from "@/components/booth/booth-form-dialog";
import {BoothTable} from "@/components/booth/booth-table";

export function BoothTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    return (
        <Tabs defaultValue="list" className="w-full">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Booths</h1>
                <TabsList>
                    <TabsTrigger value="list">List View</TabsTrigger>
                    <TabsTrigger value="create" onClick={() => setIsCreateDialogOpen(true)}>
                        Create New
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
                <BoothTable />
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <BoothFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open)
                }}
            />
        </Tabs>
    )
}

