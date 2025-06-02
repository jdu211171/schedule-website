// src/components/teacher/teacher-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherDelete,
  getResolvedTeacherId,
} from "@/hooks/useTeacherMutation";
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
import { TeacherFormDialog } from "./teacher-form-dialog";
import { Teacher, useTeachers } from "@/hooks/useTeacherQuery";
import { useAllSubjects } from "@/hooks/useSubjectQuery";
import { useAllSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userStatusLabels } from "@/schemas/teacher.schema";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function TeacherTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [passwordVisibility, setPasswordVisibility] = useState<
    Record<string, boolean>
  >({});
  const pageSize = 10;
  const { data: teachers, isLoading } = useTeachers({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });

  // Fetch subjects and subject types for displaying names
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();

  // Ensure the data type returned by useTeachers matches the expected type
  const typedTeachers = teachers?.data || [];

  const totalCount = teachers?.pagination.total || 0;
  const deleteTeacherMutation = useTeacherDelete();

  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Teacher, unknown>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => row.original.name || "-",
    },
    {
      accessorKey: "kanaName",
      header: "カナ",
      cell: ({ row }) => row.original.kanaName || "-",
    },
    {
      accessorKey: "status",
      header: "ステータス",
      cell: ({ row }) => {
        const status = row.original.status || "ACTIVE";
        const label = userStatusLabels[status as keyof typeof userStatusLabels] || status;
        const variant = status === "ACTIVE" ? "default" : "destructive";
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      accessorKey: "username",
      header: "ユーザー名",
      cell: ({ row }) => row.original.username || "-",
    },
    {
      accessorKey: "email",
      header: "メールアドレス",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "password",
      header: "パスワード",
      cell: ({ row }) => {
        const teacherId = row.original.teacherId;
        const password = row.original.password;
        const isVisible = passwordVisibility[teacherId] || false;

        if (!password) return "-";

        const toggleVisibility = () => {
          setPasswordVisibility((prev) => ({
            ...prev,
            [teacherId]: !prev[teacherId],
          }));
        };

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {isVisible ? password : "•".repeat(Math.min(password.length, 8))}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleVisibility}
            >
              {isVisible ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "lineId",
      header: "LINE ID",
      cell: ({ row }) => row.original.lineId || "-",
    },
    {
      accessorKey: "branches",
      header: "支店",
      cell: ({ row }) => {
        const branches = row.original.branches || [];
        if (branches.length === 0) return "-";

        return (
          <div className="flex flex-wrap gap-1">
            {branches.map((branch) => (
              <Badge key={branch.branchId} variant="outline">
                {branch.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "subjectPreferences",
      header: "担当科目",
      cell: ({ row }) => {
        const subjectPreferences = row.original.subjectPreferences || [];
        if (subjectPreferences.length === 0) return "-";

        return (
          <div className="space-y-1">
            {subjectPreferences.map((preference) => {
              const subject = subjects.find(
                (s) => s.subjectId === preference.subjectId
              );
              const types = subjectTypes.filter((t) =>
                preference.subjectTypeIds.includes(t.subjectTypeId)
              );

              return (
                <div
                  key={preference.subjectId}
                  className="flex flex-wrap gap-1"
                >
                  <Badge variant="secondary" className="text-xs">
                    {subject?.name || preference.subjectId}
                  </Badge>
                  {types.map((type) => (
                    <Badge
                      key={type.subjectTypeId}
                      variant="outline"
                      className="text-xs"
                    >
                      {type.name}
                    </Badge>
                  ))}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as Teacher & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTeacherToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTeacherToDelete(row.original)}
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

  const handleDeleteTeacher = () => {
    if (teacherToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedTeacherId to resolve temp/server IDs
      const teacherId = getResolvedTeacherId(teacherToDelete.teacherId);
      setTeacherToDelete(null);
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Custom filter component for status
  const CustomFilter = () => {
    return (
      <div className="flex items-center space-x-2">
        <Select
          value={selectedStatus}
          onValueChange={setSelectedStatus}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ステータスで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {Object.entries(userStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={typedTeachers}
        isLoading={isLoading && !typedTeachers.length} // Only show loading state on initial load
        searchPlaceholder="教師を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
        filterComponent={<CustomFilter />}
      />

      {/* Edit Teacher Dialog */}
      {teacherToEdit && (
        <TeacherFormDialog
          open={!!teacherToEdit}
          onOpenChange={(open) => !open && setTeacherToEdit(null)}
          teacher={teacherToEdit}
        />
      )}

      {/* Create Teacher Dialog */}
      <TeacherFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!teacherToDelete}
        onOpenChange={(open) => !open && setTeacherToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。教師「
              {teacherToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeacher}
              disabled={deleteTeacherMutation.isPending}
            >
              {deleteTeacherMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
