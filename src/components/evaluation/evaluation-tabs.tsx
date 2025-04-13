"use client";

import { useState } from "react";
import { EvaluationTable } from "@/components/evaluation/evaluation-table";
import { EvaluationFormDialog } from "@/components/evaluation/evaluation-form-dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";

export function EvaluationTabs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsContent value="list" className="mt-0">
        <EvaluationTable />
      </TabsContent>

      <TabsContent value="create" className="mt-0">
        {/* This tab just opens the dialog */}
      </TabsContent>

      <EvaluationFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
        }}
      />
    </Tabs>
  );
}
