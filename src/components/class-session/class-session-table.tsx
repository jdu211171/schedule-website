"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, CalendarIcon, MoreHorizontal } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { useClassSessions } from "@/hooks/useClassSessionQuery";
import {
  useClassSessionDelete,
  getResolvedClassSessionId,
} from "@/hooks/useClassSessionMutation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClassSessionFormDialog } from "./class-session-form-dialog";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useBooths } from "@/hooks/useBoothQuery";
import { useClassTypes } from "@/hooks/useClassTypeQuery";
import { useSession } from "next-auth/react";
import type { ClassSession } from "@prisma/client";
import { ClassSessionFilter } from "./class-session-filter";

// Define column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function ClassSessionTable() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [filters, setFilters] = useState({
    teacherId: undefined as string | undefined,
    studentId: undefined as string | undefined,
    subjectId: undefined as string | undefined,
    classTypeId: undefined as string | undefined,
    boothId: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  // Fetch class sessions with filters
  const { data: classSessions, isLoading } = useClassSessions({
    page,
    limit: pageSize,
    teacherId: filters.teacherId,
    studentId: filters.studentId,
    subjectId: filters.subjectId,
    classTypeId: filters.classTypeId,
    boothId: filters.boothId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // Fetch reference data for filters
  const { data: teachersData } = useTeachers({ limit: 100 });
  const { data: studentsData } = useStudents({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });
  const { data: classTypesData } = useClassTypes({ limit: 100 });
  const { data: boothsData } = useBooths({ limit: 100 });

  const totalCount = classSessions?.pagination.total || 0;
  const deleteClassSessionMutation = useClassSessionDelete();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [sessionToEdit, setSessionToEdit] = useState<ClassSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleFilterChange = (
    field: keyof typeof filters,
    value: string | undefined
  ) => {
    setFilters({ ...filters, [field]: value });
    setPage(1); // Reset to first page when filter changes
  };

  const resetFilters = () => {
    setFilters({
      teacherId: undefined,
      studentId: undefined,
      subjectId: undefined,
      classTypeId: undefined,
      boothId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    setPage(1);
  };

  const columns: ColumnDef<ClassSession, unknown>[] = [
    {
      accessorKey: "date",
      header: "日付",
      cell: ({ row }) =>
        format(parseISO(row.original.date), "yyyy/MM/dd", { locale: ja }),
    },
    {
      accessorKey: "timeSlot",
      header: "時間",
      cell: ({ row }) => `${row.original.startTime} - ${row.original.endTime}`,
    },
    {
      accessorKey: "teacherName",
      header: "講師",
      cell: ({ row }) =>
        row.original.teacherName ? (
          <Badge variant="outline">{row.original.teacherName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "studentName",
      header: "生徒",
      cell: ({ row }) =>
        row.original.studentName ? (
          <Badge variant="outline">{row.original.studentName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "subjectName",
      header: "科目",
      cell: ({ row }) => row.original.subjectName || "-",
    },
    {
      accessorKey: "classTypeName",
      header: "授業タイプ",
      cell: ({ row }) =>
        row.original.classTypeName ? (
          <Badge variant="secondary">{row.original.classTypeName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "boothName",
      header: "ブース",
      cell: ({ row }) => row.original.boothName || "-",
    },
    {
      accessorKey: "duration",
      header: "時間",
      cell: ({ row }) => `${row.original.duration || "-"}分`,
    },
    {
      accessorKey: "branchName",
      header: "支店",
      cell: ({ row }) =>
        row.original.branchName ? (
          <Badge variant="outline">{row.original.branchName}</Badge>
        ) : (
          "-"
        ),
      // Only show for admins
      meta: {
        hidden: !isAdmin,
      } as ColumnMetaType,
    },
    {
      accessorKey: "notes",
      header: "メモ",
      cell: ({ row }) => {
        const notes = row.original.notes || "";
        return notes.length > 20
          ? `${notes.substring(0, 20)}...`
          : notes || "-";
      },
    },
    {
      accessorKey: "seriesId",
      header: "繰返し",
      cell: ({ row }) =>
        row.original.seriesId ? <Badge variant="default">繰返し</Badge> : "-",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = row.original._optimistic;
        const session = row.original;

        return (
          <div className="flex justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>アクション</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSessionToEdit(session)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setSessionToDelete(session)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
                {session.seriesId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        // Navigate to series view or open series modal
                        // Implementation depends on your UI flow
                        window.location.href = `/class-sessions/series/${session.seriesId}`;
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      シリーズを表示
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: {
        align: "right",
        headerClassName: "pr-8", // Add padding-right to ONLY the header
      } as ColumnMetaType,
    },
  ];

  // Filter out hidden columns if necessary (like branch for non-admin)
  const visibleColumns = columns.filter((col) => {
    const meta = col.meta as ColumnMetaType | undefined;
    return !meta?.hidden;
  });

  const handleDeleteClassSession = () => {
    if (sessionToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedClassSessionId to resolve temp/server IDs
      const classId = getResolvedClassSessionId(sessionToDelete.classId);
      setSessionToDelete(null);
      deleteClassSessionMutation.mutate(classId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Create filter component for the DataTable
  const filterComponent = (
    <ClassSessionFilter
      teachers={teachersData?.data || []}
      students={studentsData?.data || []}
      subjects={subjectsData?.data || []}
      classTypes={classTypesData?.data || []}
      booths={boothsData?.data || []}
      filters={filters}
      onFilterChange={handleFilterChange}
      onResetFilters={resetFilters}
    />
  );

  return (
    <>
      <DataTable
        columns={visibleColumns}
        data={classSessions?.data || []}
        isLoading={isLoading}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規授業作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
        filterComponent={filterComponent}
      />

      {/* Edit Session Dialog */}
      {sessionToEdit && (
        <ClassSessionFormDialog
          open={!!sessionToEdit}
          onOpenChange={(open) => !open && setSessionToEdit(null)}
          classSession={sessionToEdit}
          filters={filters}
        />
      )}

      {/* Create Session Dialog */}
      <ClassSessionFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        filters={filters}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。{sessionToDelete?.date}{" "}
              {sessionToDelete?.startTime}の
              {sessionToDelete?.teacherName
                ? `${sessionToDelete.teacherName}先生の`
                : ""}
              授業を完全に削除します。
              {sessionToDelete?.seriesId && (
                <strong className="block mt-2">
                  注意:
                  これは繰り返しシリーズの一部です。この操作は現在の授業のみを削除します。
                </strong>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClassSession}
              disabled={deleteClassSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClassSessionMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
