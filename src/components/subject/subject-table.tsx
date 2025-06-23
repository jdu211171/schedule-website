// src/components/subject/subject-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  useSubjectDelete,
  getResolvedSubjectId,
} from "@/hooks/useSubjectMutation";
import { useGenericExport } from "@/hooks/useGenericExport";
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
import { SubjectFormDialog } from "./subject-form-dialog";
import { Subject, useSubjects } from "@/hooks/useSubjectQuery";
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

export function SubjectTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { data: subjects, isLoading } = useSubjects({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  // Ensure the data type returned by useSubjects matches the expected type
  const typedSubjects = subjects?.data || [];

  const totalCount = subjects?.pagination.total || 0;
  const deleteSubjectMutation = useSubjectDelete();
  const { exportToCSV, isExporting } = useGenericExport("/api/subjects/export", "subjects");

  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const columns: ColumnDef<Subject, unknown>[] = [
    {
      accessorKey: "name",
      header: "科目名",
    },
    {
      accessorKey: "notes",
      header: "メモ",
      cell: ({ row }) => row.original.notes || "-",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as Subject & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubjectToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubjectToDelete(row.original)}
            >
              <Trash2
                className={`h-4 w-4 text-destructive ${
                  isOptimistic ? "opacity-70" : ""
                }`}
              />
            </Button>
          </div>
        );
      },
      meta: {
        align: "right",
        headerClassName: "pr-8", // Add padding-right to ONLY the header
      },
    },
  ];

  // Filter out the branch column if user is not admin
  const visibleColumns = columns;

  const handleDeleteSubject = () => {
    if (subjectToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedSubjectId to resolve temp/server IDs
      const subjectId = getResolvedSubjectId(subjectToDelete.subjectId);
      setSubjectToDelete(null);
      deleteSubjectMutation.mutate(subjectId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleExport = () => {
    // Get visible columns (all columns except actions)
    const visibleColumns = columns
      .filter(col => col.id !== "actions")
      .map(col => (col as any).accessorKey)
      .filter(key => key) as string[];
    exportToCSV({ columns: visibleColumns });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    // Refresh the data after successful import
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
    setPage(1); // Reset to first page
  };

  return (
    <>
      <DataTable
        columns={visibleColumns}
        data={typedSubjects}
        isLoading={isLoading && !typedSubjects.length} // Only show loading state on initial load
        searchPlaceholder="科目を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
        onExport={handleExport}
        isExporting={isExporting}
        onImport={handleImport}
      />

      {/* Edit Subject Dialog */}
      {subjectToEdit && (
        <SubjectFormDialog
          open={!!subjectToEdit}
          onOpenChange={(open) => !open && setSubjectToEdit(null)}
          subject={subjectToEdit}
        />
      )}

      {/* Create Subject Dialog */}
      <SubjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。科目「{subjectToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubject}
              disabled={deleteSubjectMutation.isPending}
            >
              {deleteSubjectMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="科目をインポート"
        description="CSVファイルから科目データを一括インポートします"
        templateUrl="/api/import/subjects/template"
        importUrl="/api/import/subjects"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
