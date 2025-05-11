"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StudentSubjectTable } from "@/components/student-subject/student-subject-table";
import { StudentSubjectFormDialog } from "@/components/student-subject/student-subject-form-dialog";

export function StudentSubjectTabs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsContent value="list" className="mt-0">
        <StudentSubjectTable />
      </TabsContent>

      <TabsContent value="create" className="mt-0">
        {/* This tab just opens the dialog */}
      </TabsContent>

      <StudentSubjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
        }}
      />
    </Tabs>
  );
}
