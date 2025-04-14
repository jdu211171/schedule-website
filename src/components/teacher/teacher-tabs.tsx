"use client";

import { useState } from "react";
import { TeacherTable } from "@/components/teacher/teacher-table";
import { TeacherFormDialog } from "@/components/teacher/teacher-form-dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";

export function TeacherTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="mt-0">
                <TeacherTable />
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <TeacherFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                }}
            />
        </Tabs>
    );
}