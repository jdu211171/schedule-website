// src/components/student-type-table.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import { useGenericExport } from "@/hooks/useGenericExport";
import {
  useStudentTypeDelete,
  useStudentTypeOrderUpdate,
  getResolvedStudentTypeId,
} from "@/hooks/useStudentTypeMutation";
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
import { StudentTypeFormDialog } from "./student-type-form-dialog";
import { StudentType } from "@/hooks/useStudentTypeQuery";
import { useSession } from "next-auth/react";

export function StudentTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localStudentTypes, setLocalStudentTypes] = useState<StudentType[]>([]);
  const pageSize = 10;

  const { data: studentTypes, isLoading } = useStudentTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const deleteStudentTypeMutation = useStudentTypeDelete();
  const updateOrderMutation = useStudentTypeOrderUpdate();
  const { exportToCSV, isExporting } = useGenericExport("/api/student-types/export", "student_types");

  // Use local state during sort mode, otherwise use server data
  const typedStudentTypes = isSortMode
    ? localStudentTypes
    : studentTypes?.data || [];

  // Update local state when server data changes
  React.useEffect(() => {
    if (studentTypes?.data && !isSortMode) {
      setLocalStudentTypes(studentTypes.data);
    }
  }, [studentTypes?.data, isSortMode]);

  const [studentTypeToEdit, setStudentTypeToEdit] =
    useState<StudentType | null>(null);
  const [studentTypeToDelete, setStudentTypeToDelete] =
    useState<StudentType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<StudentType>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "maxYears",
      header: "最大学年数",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.maxYears ? `${row.original.maxYears}年` : "-"}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "説明",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description || "-"}
        </span>
      ),
    },
  ];

  const handleReorder = (items: StudentType[]) => {
    // Update local state immediately for visual feedback
    setLocalStudentTypes(items);

    // Log the new order for debugging
    console.log(
      "New order:",
      items.map((item) => ({ id: item.studentTypeId, name: item.name }))
    );

    // Resolve student type IDs (handle temp vs server IDs) and send update request
    const studentTypeIds = items.map((item) =>
      getResolvedStudentTypeId(item.studentTypeId)
    );
    updateOrderMutation.mutate({ studentTypeIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && studentTypes?.data) {
      // When entering sort mode, sync local state with server data
      setLocalStudentTypes(studentTypes.data);
    }
    setIsSortMode(enabled);
  };

  const handleDeleteStudentType = () => {
    if (studentTypeToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedStudentTypeId to resolve temp/server IDs
      const studentTypeId = getResolvedStudentTypeId(
        studentTypeToDelete.studentTypeId
      );
      setStudentTypeToDelete(null);
      deleteStudentTypeMutation.mutate(studentTypeId);
    }
  };

  const renderActions = (studentType: StudentType) => {
    // Type-safe check for _optimistic property
    const isOptimistic = (
      studentType as StudentType & { _optimistic?: boolean }
    )._optimistic;

    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStudentTypeToEdit(studentType)}
        >
          <Pencil className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStudentTypeToDelete(studentType)}
        >
          <Trash2
            className={`h-4 w-4 text-destructive ${
              isOptimistic ? "opacity-70" : ""
            }`}
          />
        </Button>
      </div>
    );
  };

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
        data={typedStudentTypes}
        columns={columns}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={handleReorder}
        getItemId={(studentType) => studentType.studentTypeId}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="生徒タイプを検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={Math.ceil((studentTypes?.pagination.total || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={studentTypes?.pagination.total}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={renderActions}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Edit StudentType Dialog */}
      {studentTypeToEdit && (
        <StudentTypeFormDialog
          open={!!studentTypeToEdit}
          onOpenChange={(open) => !open && setStudentTypeToEdit(null)}
          studentType={studentTypeToEdit}
        />
      )}

      {/* Create StudentType Dialog */}
      <StudentTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!studentTypeToDelete}
        onOpenChange={(open) => !open && setStudentTypeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。生徒タイプ「{studentTypeToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudentType}
              disabled={deleteStudentTypeMutation.isPending}
            >
              {deleteStudentTypeMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
