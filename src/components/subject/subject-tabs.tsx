"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SubjectTable } from "@/components/subject/subject-table";
import { SubjectFormDialog } from "@/components/subject/subject-form-dialog";

export function SubjectTabs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsContent value="list" className="mt-0">
        <SubjectTable />
      </TabsContent>

      <TabsContent value="create" className="mt-0">
        {/* This tab just opens the dialog */}
      </TabsContent>

      <SubjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
        }}
      />
    </Tabs>
  );
}
