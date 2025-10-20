// src/components/subject-type/subject-type-table.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { useGenericExport } from "@/hooks/useGenericExport";
import {
  useSubjectTypeUpdate,
  useSubjectTypeDelete,
  getResolvedSubjectTypeId,
  useSubjectTypeOrderUpdate,
} from "@/hooks/useSubjectTypeMutation";
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
import { SubjectType } from "@/hooks/useSubjectTypeQuery";
import { SubjectTypeFormDialog } from "./subject-type-form-dialog";
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";

export function SubjectTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localSubjectTypes, setLocalSubjectTypes] = useState<SubjectType[]>([]);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const { data: subjectTypes, isLoading } = useSubjectTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const updateSubjectTypeMutation = useSubjectTypeUpdate();
  const deleteSubjectTypeMutation = useSubjectTypeDelete();
  const updateOrderMutation = useSubjectTypeOrderUpdate();
  const { exportToCSV, isExporting } = useGenericExport(
    "/api/subject-types/export",
    "subject_types"
  );

  // Use local state during sort mode, otherwise use server data
  const typedSubjectTypes = isSortMode
    ? localSubjectTypes
    : subjectTypes?.data || [];

  // Update local state when server data changes
  React.useEffect(() => {
    if (subjectTypes?.data && !isSortMode) {
      setLocalSubjectTypes(subjectTypes.data);
    }
  }, [subjectTypes?.data, isSortMode]);

  const [subjectTypeToEdit, setSubjectTypeToEdit] =
    useState<SubjectType | null>(null);
  const [subjectTypeToDelete, setSubjectTypeToDelete] =
    useState<SubjectType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const columns: ColumnDef<SubjectType>[] = [
    {
      accessorKey: "name",
      header: "科目タイプ名",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
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

  const handleReorder = (items: SubjectType[]) => {
    // Update local state immediately for visual feedback
    setLocalSubjectTypes(items);

    // Log the new order for debugging
    console.log(
      "New order:",
      items.map((item) => ({ id: item.subjectTypeId, name: item.name }))
    );

    // Resolve subject type IDs (handle temp vs server IDs) and send update request
    const subjectTypeIds = items.map((item) =>
      getResolvedSubjectTypeId(item.subjectTypeId)
    );
    updateOrderMutation.mutate({ subjectTypeIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && subjectTypes?.data) {
      // When entering sort mode, sync local state with server data
      setLocalSubjectTypes(subjectTypes.data);
    }
    setIsSortMode(enabled);
  };

  const handleDeleteSubjectType = () => {
    if (subjectTypeToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedSubjectTypeId to resolve temp/server IDs
      const subjectTypeId = getResolvedSubjectTypeId(
        subjectTypeToDelete.subjectTypeId
      );
      setSubjectTypeToDelete(null);
      deleteSubjectTypeMutation.mutate(subjectTypeId);
    }
  };

  const renderActions = (subjectType: SubjectType) => {
    // Type-safe check for _optimistic property
    const isOptimistic = (
      subjectType as SubjectType & { _optimistic?: boolean }
    )._optimistic;

    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSubjectTypeToEdit(subjectType)}
        >
          <Pencil className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSubjectTypeToDelete(subjectType)}
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
      .map((col) => (col as any).accessorKey)
      .filter((key) => key) as string[];
    exportToCSV({ columns: visibleColumns, query: { name: searchTerm || "" } });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    // Refresh the data after successful import
    queryClient.invalidateQueries({ queryKey: ["subject-types"] });
    setPage(1); // Reset to first page
  };

  return (
    <>
      <SortableDataTable
        data={typedSubjectTypes}
        columns={columns}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={handleReorder}
        getItemId={(subjectType) => subjectType.subjectTypeId}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="科目タイプを検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={Math.ceil((subjectTypes?.pagination.total || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={subjectTypes?.pagination.total}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={renderActions}
        onExport={handleExport}
        isExporting={isExporting}
        onImport={handleImport}
      />

      {/* Edit SubjectType Dialog */}
      {subjectTypeToEdit && (
        <SubjectTypeFormDialog
          open={!!subjectTypeToEdit}
          onOpenChange={(open) => !open && setSubjectTypeToEdit(null)}
          subjectType={subjectTypeToEdit}
        />
      )}

      {/* Create SubjectType Dialog */}
      <SubjectTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!subjectTypeToDelete}
        onOpenChange={(open) => !open && setSubjectTypeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。科目タイプ「{subjectTypeToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubjectType}
              disabled={deleteSubjectTypeMutation.isPending}
            >
              {deleteSubjectTypeMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="科目タイプをインポート"
        description="CSVファイルから科目タイプデータを一括インポートします"
        templateUrl="/api/import/subjectTypes/template"
        importUrl="/api/import/subjectTypes"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
