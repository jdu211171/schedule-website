// src/components/subject-offerings/subject-offering-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSubjectOfferingDelete,
  getResolvedSubjectOfferingId,
} from "@/hooks/useSubjectOfferingMutation";
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
import { SubjectOfferingFormDialog } from "./subject-offering-form-dialog";
import {
  SubjectOffering,
  useSubjectOfferings,
} from "@/hooks/useSubjectOfferingQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { useSession } from "next-auth/react";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function SubjectOfferingTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedSubjectTypeId, setSelectedSubjectTypeId] =
    useState<string>("all");
  const [selectedActiveStatus, setSelectedActiveStatus] =
    useState<string>("all");
  const pageSize = 10;

  const { data: session } = useSession();
  const currentBranchId = session?.user?.selectedBranchId;

  const { data: subjectOfferings, isLoading } = useSubjectOfferings({
    page,
    limit: pageSize,
    search: searchTerm || undefined,
    subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
    subjectTypeId:
      selectedSubjectTypeId === "all" ? undefined : selectedSubjectTypeId,
    isActive:
      selectedActiveStatus === "all"
        ? undefined
        : selectedActiveStatus === "active",
    branchId: currentBranchId || undefined,
  });

  // Load subjects and subject types for filtering
  const { data: subjectsResponse } = useSubjects({
    limit: 100,
    branchId: currentBranchId || undefined,
  });
  const { data: subjectTypesResponse } = useSubjectTypes({ limit: 100 });

  // Ensure the data type returned by useSubjectOfferings matches the expected type
  const typedSubjectOfferings = subjectOfferings?.data || [];

  const totalCount = subjectOfferings?.pagination.total || 0;
  const deleteSubjectOfferingMutation = useSubjectOfferingDelete();

  const [subjectOfferingToEdit, setSubjectOfferingToEdit] =
    useState<SubjectOffering | null>(null);
  const [subjectOfferingToDelete, setSubjectOfferingToDelete] =
    useState<SubjectOffering | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<SubjectOffering, unknown>[] = [
    {
      accessorKey: "subjectName",
      header: "科目",
      cell: ({ row }) => row.original.subjectName || "-",
    },
    {
      accessorKey: "subjectTypeName",
      header: "科目タイプ",
      cell: ({ row }) =>
        row.original.subjectTypeName ? (
          <Badge variant="outline">{row.original.subjectTypeName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "isActive",
      header: "ステータス",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "アクティブ" : "非アクティブ"}
        </Badge>
      ),
    },
    {
      accessorKey: "branchName",
      header: "支店",
      cell: ({ row }) => row.original.branchName || "-",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as SubjectOffering & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubjectOfferingToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubjectOfferingToDelete(row.original)}
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
      } as ColumnMetaType,
    },
  ];

  const handleDeleteSubjectOffering = () => {
    if (subjectOfferingToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedSubjectOfferingId to resolve temp/server IDs
      const subjectOfferingId = getResolvedSubjectOfferingId(
        subjectOfferingToDelete.subjectOfferingId
      );
      setSubjectOfferingToDelete(null);
      deleteSubjectOfferingMutation.mutate(subjectOfferingId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Custom filter component
  const CustomFilter = () => {
    return (
      <div className="flex items-center space-x-2 mb-4">
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="科目で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {subjectsResponse?.data.map((subject) => (
              <SelectItem key={subject.subjectId} value={subject.subjectId}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubjectTypeId}
          onValueChange={setSelectedSubjectTypeId}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="科目タイプで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {subjectTypesResponse?.data.map((type) => (
              <SelectItem key={type.subjectTypeId} value={type.subjectTypeId}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedActiveStatus}
          onValueChange={setSelectedActiveStatus}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="active">アクティブ</SelectItem>
            <SelectItem value="inactive">非アクティブ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <>
      <CustomFilter />
      <DataTable
        columns={columns}
        data={typedSubjectOfferings}
        isLoading={isLoading && !typedSubjectOfferings.length} // Only show loading state on initial load
        searchPlaceholder="科目提供を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {/* Edit SubjectOffering Dialog */}
      {subjectOfferingToEdit && (
        <SubjectOfferingFormDialog
          open={!!subjectOfferingToEdit}
          onOpenChange={(open) => !open && setSubjectOfferingToEdit(null)}
          subjectOffering={subjectOfferingToEdit}
        />
      )}

      {/* Create SubjectOffering Dialog */}
      <SubjectOfferingFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!subjectOfferingToDelete}
        onOpenChange={(open) => !open && setSubjectOfferingToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。科目提供「
              {subjectOfferingToDelete?.subjectName} -{" "}
              {subjectOfferingToDelete?.subjectTypeName}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubjectOffering}
              disabled={deleteSubjectOfferingMutation.isPending}
            >
              {deleteSubjectOfferingMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
