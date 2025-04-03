"use client"

import {Tabs, TabsContent} from "../tabs"
import {BoothTable} from "@/components/booth/booth-table";

export function BoothTabs() {
    return (
        <Tabs defaultValue="list" className="w-full">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Booths</h1>
            </div>

            <TabsContent value="list" className="mt-0">
                <BoothTable />
            </TabsContent>
        </Tabs>
    )
}

