"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StudentTypeTable } from "@/components/student-type/student-type-table";
import { StudentTypeFormDialog } from "@/components/student-type/student-type-form-dialog";

export function StudentTypeTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="mt-0">
                <StudentTypeTable />
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <StudentTypeFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                }}
            />
        </Tabs>
    );
}