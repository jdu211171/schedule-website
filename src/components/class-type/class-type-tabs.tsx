"use client";

import { useState } from "react";
import { ClassTypeTable } from "@/components/class-type/class-type-table";
import { ClassTypeFormDialog } from "./class-type-form-dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";

export function ClassTypeTabs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsContent value="list" className="mt-0">
        <ClassTypeTable />
      </TabsContent>

      <TabsContent value="create" className="mt-0">
        {/* This tab just opens the dialog */}
      </TabsContent>

      <ClassTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
        }}
      />
    </Tabs>
  );
}
