// src/components/class-type-table.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import { useGenericExport } from "@/hooks/useGenericExport";
import {
  useClassTypeDelete,
  useClassTypeOrderUpdate,
  getResolvedClassTypeId,
} from "@/hooks/useClassTypeMutation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClassTypeFormDialog } from "./class-type-form-dialog";
import { ClassType, useClassTypes } from "@/hooks/useClassTypeQuery";
import { useSession } from "next-auth/react";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

// Helper function to calculate the level of nesting for a class type
function getClassTypeLevel(classType: ClassType, allClassTypes: ClassType[]): number {
  if (!classType.parentId) return 0;

  const parent = allClassTypes.find(type => type.classTypeId === classType.parentId);
  if (!parent) return 0;

  return 1 + getClassTypeLevel(parent, allClassTypes);
}

// Helper function to check if a class type is protected (root level types like 通常授業 and 特別授業)
function isProtectedClassType(classType: ClassType): boolean {
  // Protected class types are root level types (no parent) with specific names
  return !classType.parentId && (classType.name === "通常授業" || classType.name === "特別授業");
}

export function ClassTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localClassTypes, setLocalClassTypes] = useState<ClassType[]>([]);
  const pageSize = 10;

  const { data: classTypes, isLoading } = useClassTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const deleteClassTypeMutation = useClassTypeDelete();
  const updateOrderMutation = useClassTypeOrderUpdate();
  const { exportToCSV, isExporting } = useGenericExport("/api/class-types/export", "class_types");

  // Use local state during sort mode, otherwise use server data
  const typedClassTypes = isSortMode
    ? localClassTypes
    : classTypes?.data || [];

  // Update local state when server data changes
  React.useEffect(() => {
    if (classTypes?.data && !isSortMode) {
      setLocalClassTypes(classTypes.data);
    }
  }, [classTypes?.data, isSortMode]);

  const totalCount = classTypes?.pagination.total || 0;

  const [classTypeToEdit, setClassTypeToEdit] = useState<ClassType | null>(
    null
  );
  const [classTypeToDelete, setClassTypeToDelete] = useState<ClassType | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<ClassType>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => {
        const level = getClassTypeLevel(row.original, typedClassTypes);
        const indent = "　".repeat(level); // Japanese space for indentation
        return (
          <span className="font-medium">
            {indent}{row.original.name}
          </span>
        );
      },
    },
    {
      accessorKey: "parentId",
      header: "親クラスタイプ",
      cell: ({ row }) => {
        if (!row.original.parentId) return (
          <span className="text-muted-foreground">ルート</span>
        );
        const parent = typedClassTypes.find(
          (type) => type.classTypeId === row.original.parentId
        );
        return (
          <span className="text-muted-foreground">
            {parent?.name || "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "notes",
      header: "メモ",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.notes || "-"}
        </span>
      ),
    },
  ];

  const handleReorder = (items: ClassType[]) => {
    // Update local state immediately for visual feedback
    setLocalClassTypes(items);

    // Log the new order for debugging
    console.log(
      "New order:",
      items.map((item) => ({ id: item.classTypeId, name: item.name }))
    );

    // Resolve class type IDs (handle temp vs server IDs) and send update request
    const classTypeIds = items.map((item) =>
      getResolvedClassTypeId(item.classTypeId)
    );
    updateOrderMutation.mutate({ classTypeIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && classTypes?.data) {
      // When entering sort mode, sync local state with server data
      setLocalClassTypes(classTypes.data);
    }
    setIsSortMode(enabled);
  };

  const handleDeleteClassType = () => {
    if (classTypeToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedClassTypeId to resolve temp/server IDs
      const classTypeId = getResolvedClassTypeId(classTypeToDelete.classTypeId);
      setClassTypeToDelete(null);
      deleteClassTypeMutation.mutate(classTypeId);
    }
  };

  const renderActions = (classType: ClassType) => {
    // Type-safe check for _optimistic property
    const isOptimistic = (
      classType as ClassType & { _optimistic?: boolean }
    )._optimistic;

    // Check if this is a protected class type (通常授業 or 特別授業)
    const isProtected = isProtectedClassType(classType);

    return (
      <div className="flex justify-end gap-2">
        <Button
          disabled={isProtected}
          variant="ghost"
          size="icon"
          onClick={() => setClassTypeToEdit(classType)}
          title={isProtected ? "このクラスタイプは編集できません" : "編集"}
        >
          <Pencil className={`h-4 w-4 ${isOptimistic || isProtected ? "opacity-70" : ""}`} />
        </Button>
        <Button
          disabled={isProtected}
          variant="ghost"
          size="icon"
          onClick={() => setClassTypeToDelete(classType)}
          title={isProtected ? "このクラスタイプは削除できません" : "削除"}
        >
          <Trash2
            className={`h-4 w-4 text-destructive ${
              isOptimistic || isProtected ? "opacity-70" : ""
            }`}
          />
        </Button>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleExport = () => {
    // Get visible columns (all columns except actions)
    const visibleColumns = columns
      .map(col => (col as any).accessorKey)
      .filter(key => key) as string[];
    exportToCSV({ columns: visibleColumns });
  };

  return (
    <>
      <SortableDataTable
        data={typedClassTypes}
        columns={columns}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={handleReorder}
        getItemId={(classType) => classType.classTypeId}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="クラスタイプを検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={renderActions}
        isItemDisabled={(classType) => isProtectedClassType(classType)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Edit ClassType Dialog */}
      {classTypeToEdit && (
        <ClassTypeFormDialog
          open={!!classTypeToEdit}
          onOpenChange={(open: boolean) => !open && setClassTypeToEdit(null)}
          classType={classTypeToEdit}
        />
      )}

      {/* Create ClassType Dialog */}
      <ClassTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!classTypeToDelete}
        onOpenChange={(open) => !open && setClassTypeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。クラスタイプ「{classTypeToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClassType}
              disabled={deleteClassTypeMutation.isPending}
            >
              {deleteClassTypeMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
