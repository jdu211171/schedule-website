// src/components/teacher-qualifications/teacher-qualification-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";

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
  useTeacherQualificationDelete,
  getResolvedTeacherQualificationId,
} from "@/hooks/useTeacherQualificationMutation";
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
import { TeacherQualificationFormDialog } from "./teacher-qualification-form-dialog";
import {
  TeacherQualification,
  useTeacherQualifications,
} from "@/hooks/useTeacherQualificationQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useActiveSubjectOfferings } from "@/hooks/useSubjectOfferingQuery";
import { useSession } from "next-auth/react";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function TeacherQualificationTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("all");
  const [selectedVerifiedStatus, setSelectedVerifiedStatus] =
    useState<string>("all");
  const pageSize = 10;

  const { data: session } = useSession();
  const currentBranchId = session?.user?.selectedBranchId;

  const { data: teacherQualifications, isLoading } = useTeacherQualifications({
    page,
    limit: pageSize,
    teacherId: selectedTeacherId === "all" ? undefined : selectedTeacherId,
    subjectOfferingId:
      selectedOfferingId === "all" ? undefined : selectedOfferingId,
    verified:
      selectedVerifiedStatus === "all"
        ? undefined
        : selectedVerifiedStatus === "verified",
    branchId: currentBranchId || undefined,
  });

  // Load teachers and subject offerings for filtering
  const { data: teachersResponse } = useTeachers({ limit: 100 });
  const { data: subjectOfferings } = useActiveSubjectOfferings({
    branchId: currentBranchId || undefined,
  });

  // Ensure the data type returned by useTeacherQualifications matches the expected type
  const typedTeacherQualifications = teacherQualifications?.data || [];

  const totalCount = teacherQualifications?.pagination.total || 0;
  const deleteTeacherQualificationMutation = useTeacherQualificationDelete();

  const [qualificationToEdit, setQualificationToEdit] =
    useState<TeacherQualification | null>(null);
  const [qualificationToDelete, setQualificationToDelete] =
    useState<TeacherQualification | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<TeacherQualification, unknown>[] = [
    {
      accessorKey: "teacherName",
      header: "教師",
      cell: ({ row }) => row.original.teacherName || "-",
    },
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
      accessorKey: "verified",
      header: "認証状態",
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.verified ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <Badge variant="default">認証済み</Badge>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500 mr-2" />
              <Badge variant="secondary">未認証</Badge>
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: "branchName",
      header: "支店",
      cell: ({ row }) => row.original.branchName || "-",
    },
    {
      accessorKey: "notes",
      header: "備考",
      cell: ({ row }) => {
        const notes = row.original.notes;
        if (!notes) return "-";
        return notes.length > 30 ? `${notes.substring(0, 30)}...` : notes;
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as TeacherQualification & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQualificationToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQualificationToDelete(row.original)}
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

  const handleDeleteTeacherQualification = () => {
    if (qualificationToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedTeacherQualificationId to resolve temp/server IDs
      const qualificationId = getResolvedTeacherQualificationId(
        qualificationToDelete.qualificationId
      );
      setQualificationToDelete(null);
      deleteTeacherQualificationMutation.mutate(qualificationId);
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
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="教師で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {teachersResponse?.data.map((teacher) => (
              <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedOfferingId}
          onValueChange={setSelectedOfferingId}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="科目提供で絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {subjectOfferings?.map((offering) => (
              <SelectItem
                key={offering.subjectOfferingId}
                value={offering.subjectOfferingId}
              >
                {offering.subjectName} - {offering.subjectTypeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedVerifiedStatus}
          onValueChange={setSelectedVerifiedStatus}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="認証状態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="verified">認証済み</SelectItem>
            <SelectItem value="unverified">未認証</SelectItem>
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
        data={typedTeacherQualifications}
        isLoading={isLoading && !typedTeacherQualifications.length} // Only show loading state on initial load
        searchPlaceholder="教師資格を検索..."
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

      {/* Edit TeacherQualification Dialog */}
      {qualificationToEdit && (
        <TeacherQualificationFormDialog
          open={!!qualificationToEdit}
          onOpenChange={(open) => !open && setQualificationToEdit(null)}
          teacherQualification={qualificationToEdit}
        />
      )}

      {/* Create TeacherQualification Dialog */}
      <TeacherQualificationFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!qualificationToDelete}
        onOpenChange={(open) => !open && setQualificationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。教師資格「
              {qualificationToDelete?.teacherName} -{" "}
              {qualificationToDelete?.subjectName} -{" "}
              {qualificationToDelete?.subjectTypeName}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeacherQualification}
              disabled={deleteTeacherQualificationMutation.isPending}
            >
              {deleteTeacherQualificationMutation.isPending
                ? "削除中..."
                : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
