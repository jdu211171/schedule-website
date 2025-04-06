"use client"

import {useState} from "react"
import {BoothTable} from "@/components/booth/booth-table"
import {BoothFormDialog} from "./booth-form-dialog"
import {Tabs, TabsContent} from "@/components/ui/tabs"

export function BoothTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="mt-0">
                <BoothTable/>
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
