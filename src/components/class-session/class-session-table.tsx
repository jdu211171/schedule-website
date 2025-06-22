"use client";

import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, CalendarIcon, MoreHorizontal } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { useClassSessions } from "@/hooks/useClassSessionQuery";
import {
  useClassSessionDelete,
  useClassSessionSeriesDelete,
  useClassSessionBulkDelete,
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
import type { ClassSession, UserStatus } from "@prisma/client";
import { ClassSessionFilter } from "./class-session-filter";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

// Define type for class session with additional fields from API
interface ExtendedClassSession extends ClassSession {
  teacherName?: string;
  studentName?: string;
  subjectName?: string;
  classTypeName?: string;
  boothName?: string;
  branchName?: string | null;
  _optimistic?: boolean;
}

interface ClassSessionTableProps {
  selectedBranchId?: string;
}

export function ClassSessionTable({ selectedBranchId }: ClassSessionTableProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Storage key for filter persistence
  const FILTERS_STORAGE_KEY = "classsession_filters";

  // Initialize filters with localStorage values or defaults
  const [filters, setFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        try {
          return JSON.parse(savedFilters);
        } catch (error) {
          console.error('Error parsing saved filters:', error);
        }
      }
    }
    return {
      teacherId: undefined as string | undefined,
      studentId: undefined as string | undefined,
      subjectId: undefined as string | undefined,
      classTypeId: undefined as string | undefined,
      boothId: undefined as string | undefined,
      startDate: undefined as string | undefined,
      endDate: undefined as string | undefined,
    };
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  // Row selection state for multiselect
  const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState<ExtendedClassSession[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  // Fetch class sessions with filters
  const { data: classSessions, isLoading } = useClassSessions({
    page,
    limit: pageSize,
    teacherId: filters.teacherId,
    studentId: filters.studentId,
    subjectId: filters.subjectId,
    classTypeId: filters.classTypeId,
    boothId: filters.boothId,
    branchId: selectedBranchId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // Fetch reference data for filters
  const { data: teachersData } = useTeachers({ limit: 100 });
  const { data: studentsData } = useStudents({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });
  const { data: classTypesData } = useClassTypes({ limit: 100 });
  const { data: boothsData } = useBooths({ limit: 100 });  const totalCount = classSessions?.pagination.total || 0;
  const deleteClassSessionMutation = useClassSessionDelete();
  const deleteClassSessionSeriesMutation = useClassSessionSeriesDelete();
  const bulkDeleteClassSessionMutation = useClassSessionBulkDelete();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [sessionToEdit, setSessionToEdit] = useState<ExtendedClassSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ExtendedClassSession | null>(
    null
  );
  const [seriesToDelete, setSeriesToDelete] = useState<{
    seriesId: string;
    sessionInfo: ExtendedClassSession;
  } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleFilterChange = (
    field: keyof typeof filters,
    value: string | undefined
  ) => {
    setFilters({ ...filters, [field]: value });
    setPage(1); // Reset to first page when filter changes
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters({
      ...filters,
      startDate: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
      endDate: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
    });
    setPage(1); // Reset to first page when filter changes
  };

  const resetFilters = () => {
    const defaultFilters = {
      teacherId: undefined,
      studentId: undefined,
      subjectId: undefined,
      classTypeId: undefined,
      boothId: undefined,
      startDate: undefined,
      endDate: undefined,
    };
    setFilters(defaultFilters);
    setPage(1);
    // Clear localStorage when resetting
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  };

  const columns: ColumnDef<ExtendedClassSession, unknown>[] = [
    {
      accessorKey: "date",
      header: "日付",
      cell: ({ row }) =>
        format(typeof row.original.date === 'string' ? parseISO(row.original.date) : row.original.date, "yyyy/MM/dd", { locale: ja }),
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
        (row.original as ExtendedClassSession).teacherName ? (
          <Badge variant="outline">{(row.original as ExtendedClassSession).teacherName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "studentName",
      header: "生徒",
      cell: ({ row }) =>
        (row.original as ExtendedClassSession).studentName ? (
          <Badge variant="outline">{(row.original as ExtendedClassSession).studentName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "subjectName",
      header: "科目",
      cell: ({ row }) => (row.original as ExtendedClassSession).subjectName || "-",
    },
    {
      accessorKey: "classTypeName",
      header: "授業タイプ",
      cell: ({ row }) =>
        (row.original as ExtendedClassSession).classTypeName ? (
          <Badge variant="secondary">{(row.original as ExtendedClassSession).classTypeName}</Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "boothName",
      header: "ブース",
      cell: ({ row }) => (row.original as ExtendedClassSession).boothName || "-",
    },
    {
      accessorKey: "duration",
      header: "時間",
      cell: ({ row }) => `${row.original.duration || "-"}分`,
    },
    {
      accessorKey: "branchName",
      header: "校舎",
      cell: ({ row }) =>
        (row.original as ExtendedClassSession).branchName ? (
          <Badge variant="outline">{(row.original as ExtendedClassSession).branchName}</Badge>
        ) : (
          "-"
        ),
      // Only show for admins
      meta: {
        hidden: !isAdmin,
      },
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
        const session = row.original as ExtendedClassSession;

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
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (session.seriesId) {
                          setSeriesToDelete({
                            seriesId: session.seriesId,
                            sessionInfo: session
                          });
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      シリーズ全体を削除
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
      },
    },
  ];

  // Filter out hidden columns if necessary (like branch for non-admin)
  const visibleColumns = columns.filter((col) => {
    const meta = col.meta;
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

  const handleDeleteSeries = () => {
    if (seriesToDelete) {
      const { seriesId } = seriesToDelete;
      setSeriesToDelete(null);
      deleteClassSessionSeriesMutation.mutate(seriesId);
    }
  };

  const handleBulkDelete = (selectedRowData: ExtendedClassSession[]) => {
    if (selectedRowData.length === 0) return;
    setSelectedRowsForDeletion(selectedRowData);
    setIsConfirmingBulkDelete(true);
  };

  const confirmBulkDelete = () => {
    if (selectedRowsForDeletion.length === 0) return;

    const classIds = selectedRowsForDeletion.map(session => session.classId);
    bulkDeleteClassSessionMutation.mutate({ classIds });

    // Clear selection and close dialog
    setSelectedRowsForDeletion([]);
    setIsConfirmingBulkDelete(false);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Create filter component for the DataTable
  const filterComponent = (
    <ClassSessionFilter
      teachers={
        teachersData?.data
          ?.filter(
            (teacher): teacher is typeof teacher & { status: string } =>
              teacher.status !== undefined
          )
          .map((teacher) => ({
            ...teacher,
            status: teacher.status as UserStatus,
          })) || []
      }
      students={
        studentsData?.data
          ?.filter(
            (student): student is typeof student & { status: string } =>
              student.status !== undefined
          )
          .map((student) => ({
            ...student,
            status: student.status as UserStatus,
          })) || []
      }
      subjects={subjectsData?.data || []}
      classTypes={classTypesData?.data || []}
      booths={boothsData?.data || []}
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
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
        enableRowSelection={true}
        onBatchDelete={handleBulkDelete}
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
              この操作は元に戻せません。
              {sessionToDelete?.date &&
                (typeof sessionToDelete.date === 'string'
                  ? sessionToDelete.date
                  : format(sessionToDelete.date, "yyyy/MM/dd"))}{" "}
              {sessionToDelete?.startTime &&
                (typeof sessionToDelete.startTime === 'string'
                  ? sessionToDelete.startTime
                  : format(sessionToDelete.startTime, "HH:mm"))}の
              {(sessionToDelete as ExtendedClassSession)?.teacherName
                ? `${(sessionToDelete as ExtendedClassSession).teacherName}先生の`
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

      {/* Series Delete Confirmation Dialog */}
      <AlertDialog
        open={!!seriesToDelete}
        onOpenChange={(open) => !open && setSeriesToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>シリーズ全体を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。
              {seriesToDelete?.sessionInfo?.teacherName && (
                <span>
                  {seriesToDelete.sessionInfo.teacherName}先生の
                </span>
              )}
              {seriesToDelete?.sessionInfo?.subjectName && (
                <span>
                  {seriesToDelete.sessionInfo.subjectName}の
                </span>
              )}
              シリーズの<strong>本日以降のすべての授業</strong>を削除します。
              <strong className="block mt-2 text-destructive">
                警告: 過去の授業は削除されませんが、今日以降の未来の授業はすべて削除されます。
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeries}
              disabled={deleteClassSessionSeriesMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClassSessionSeriesMutation.isPending ? "削除中..." : "シリーズを削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={isConfirmingBulkDelete}
        onOpenChange={(open) => !open && setIsConfirmingBulkDelete(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>選択した授業を一括削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。
              選択された<strong>{selectedRowsForDeletion.length}件</strong>の授業を完全に削除します。
              {selectedRowsForDeletion.some((session: ExtendedClassSession) => session.seriesId) && (
                <strong className="block mt-2 text-destructive">
                  注意: 選択した授業の中に繰り返しシリーズの一部が含まれています。
                  この操作は選択した授業のみを削除し、シリーズ全体は削除されません。
                </strong>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteClassSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteClassSessionMutation.isPending ? "削除中..." : `${selectedRowsForDeletion.length}件を削除`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
