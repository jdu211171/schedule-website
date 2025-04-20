"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TeacherSubjectTable } from "@/components/teacher-subject/teacher-subject-table";
import { TeacherSubjectFormDialog } from "@/components/teacher-subject/teacher-subject-form-dialog";

export function TeacherTabs() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    return (
        <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="mt-0">
                <TeacherSubjectTable />
            </TabsContent>

            <TabsContent value="create" className="mt-0">
                {/* This tab just opens the dialog */}
            </TabsContent>

            <TeacherSubjectFormDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                }}
            />
        </Tabs>
    );
}