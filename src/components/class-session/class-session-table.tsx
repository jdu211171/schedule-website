"use client";

import { useState, useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, MoreHorizontal, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { useClassSessions } from "@/hooks/useClassSessionQuery";
import { useQueryClient } from "@tanstack/react-query";
import {
  useClassSessionSeriesDelete,
  useClassSessionBulkDelete,
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
import { LessonDialog } from "@/components/admin-schedule/DayCalendar/lesson-dialog";
import { useClassSession } from "@/hooks/useClassSessionQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useBooths } from "@/hooks/useBoothQuery";
import { useClassTypes } from "@/hooks/useClassTypeQuery";
import { useSession } from "next-auth/react";
import type { ClassSession, UserStatus } from "@prisma/client";
import { ClassSessionFilter } from "./class-session-filter";
import {
  classTypeColorClasses,
  isValidClassTypeColor,
  isHexColor,
  rgba,
  getContrastText,
  ClassTypeColor,
} from "@/lib/class-type-colors";
import { CANCELLED_CLASS_COLOR_CLASSES } from "@/lib/cancelled-class-constants";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

// Define type for class session with additional fields from API
interface ExtendedClassSession extends ClassSession {
  teacherName?: string;
  studentName?: string;
  studentGradeYear?: number | null;
  studentTypeName?: string | null;
  subjectName?: string;
  classTypeName?: string;
  classTypeColor?: string | null;
  boothName?: string;
  branchName?: string | null;
  _optimistic?: boolean;
}

interface ClassSessionTableProps {
  selectedBranchId?: string;
}

export function ClassSessionTable({
  selectedBranchId,
}: ClassSessionTableProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Initialize filters with defaults
  const [filters, setFilters] = useState({
    teacherId: undefined as string | undefined,
    studentId: undefined as string | undefined,
    subjectId: undefined as string | undefined,
    classTypeId: undefined as string | undefined,
    boothId: undefined as string | undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    isCancelled: undefined as boolean | undefined,
  });

  // Row selection state for multiselect
  const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState<
    ExtendedClassSession[]
  >([]);
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
    includeCancelled: filters.isCancelled === true,
    isCancelled: filters.isCancelled,
  });

  const queryClient = useQueryClient();

  // Cross-tab sync: refresh only if changed dates intersect current filter range
  useEffect(() => {
    const channel =
      typeof window !== "undefined"
        ? new BroadcastChannel("calendar-events")
        : null;
    if (!channel) return;
    const handler = (event: MessageEvent) => {
      const payload = event.data as { type?: string; dates?: string[] };
      if (!payload || payload.type !== "classSessionsChanged") return;

      // If no date filter set, just refetch active classSessions queries
      const startStr = filters.startDate;
      const endStr = filters.endDate || filters.startDate;
      const hasRange = !!startStr && !!endStr;
      if (!hasRange) {
        queryClient.invalidateQueries({
          queryKey: ["classSessions"],
          refetchType: "active",
        });
        return;
      }

      const start = new Date(`${startStr}T00:00:00`);
      const end = new Date(`${endStr}T23:59:59`);
      const dates = payload.dates || [];
      const intersects =
        dates.length === 0 ||
        dates.some((d) => {
          const dd = new Date(`${d}T12:00:00`);
          return dd >= start && dd <= end;
        });
      if (intersects) {
        queryClient.invalidateQueries({
          queryKey: ["classSessions"],
          refetchType: "active",
        });
      }
    };
    channel.addEventListener("message", handler);
    return () => {
      channel.removeEventListener("message", handler);
      channel.close();
    };
  }, [filters.startDate, filters.endDate, queryClient]);

  // Fetch reference data for filters
  const { data: teachersData } = useTeachers({ limit: 100 });
  const { data: studentsData } = useStudents({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });
  const { data: classTypesData } = useClassTypes({ limit: 100 });
  const { data: boothsData } = useBooths({ limit: 100 });
  const totalCount = classSessions?.pagination.total || 0;
  const deleteClassSessionSeriesMutation = useClassSessionSeriesDelete();
  const bulkDeleteClassSessionMutation = useClassSessionBulkDelete();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("edit");
  // Single delete is handled inside LessonDialog; remove standalone delete flow from toolbar
  const [seriesToDelete, setSeriesToDelete] = useState<{
    seriesId: string;
    sessionInfo: ExtendedClassSession;
  } | null>(null);
  // Remove the create dialog state - no longer needed
  // const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Option lists for shared edit dialog
  const booths = boothsData?.data || [];
  const teachers = teachersData?.data || [];
  const students = studentsData?.data || [];
  const subjects = subjectsData?.data || [];

  // Fetch full lesson details when an item is selected
  const { data: selectedLesson } = useClassSession(
    selectedLessonId || undefined
  );

  // Default to today's sessions when no date range filter is applied
  useEffect(() => {
    if (!filters.startDate && !filters.endDate) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      setFilters((prev) => ({
        ...prev,
        startDate: todayStr,
        endDate: todayStr,
      }));
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (
    field: keyof typeof filters,
    value: string | boolean | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    // Treat single-day selection as from == to to avoid open-ended ranges
    const fromDate = range?.from;
    const toDate = range?.to ?? range?.from; // fallback to from when to is not set
    setFilters({
      ...filters,
      startDate: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
      endDate: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
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
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      isCancelled: undefined,
    };
    setFilters(defaultFilters);
    setPage(1);
  };

  const columns: ColumnDef<ExtendedClassSession, unknown>[] = [
    {
      accessorKey: "date",
      header: "日付",
      cell: ({ row }) =>
        format(
          typeof row.original.date === "string"
            ? parseISO(row.original.date)
            : row.original.date,
          "yyyy/MM/dd",
          { locale: ja }
        ),
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
          <Badge variant="outline">
            {(row.original as ExtendedClassSession).teacherName}
          </Badge>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "studentName",
      header: "生徒",
      cell: ({ row }) => {
        const session = row.original as ExtendedClassSession;
        if (!session.studentName) return "-";

        const parts = [session.studentName];
        if (session.studentGradeYear) {
          parts.push(`${session.studentGradeYear}年`);
        }
        if (session.studentTypeName) {
          parts.push(session.studentTypeName);
        }

        return (
          <div className="flex flex-col">
            <Badge variant="outline">{session.studentName}</Badge>
            {(session.studentGradeYear || session.studentTypeName) && (
              <span className="text-xs text-muted-foreground mt-1">
                {[
                  session.studentGradeYear && `${session.studentGradeYear}年`,
                  session.studentTypeName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "subjectName",
      header: "科目",
      cell: ({ row }) =>
        (row.original as ExtendedClassSession).subjectName || "-",
    },
    {
      accessorKey: "classTypeName",
      header: "授業タイプ",
      cell: ({ row }) => {
        const session = row.original as ExtendedClassSession;
        if (session.isCancelled) {
          const cls = CANCELLED_CLASS_COLOR_CLASSES;
          return (
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border ${cls.background} ${cls.border} ${cls.text} dark:!text-white`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${cls.dot}`}
              />
              キャンセル
            </span>
          );
        }
        if ((session as any).status === "CONFLICTED") {
          const stripePx = 3;
          return (
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border text-destructive dark:!text-white"
              style={{
                // Match 日次 view: red stripes with subtle fill and clear border
                backgroundImage: `repeating-linear-gradient(45deg, rgba(220, 38, 38, 0.18) 0px, rgba(220, 38, 38, 0.18) ${stripePx}px, transparent ${stripePx}px, transparent ${stripePx * 2}px)`,
                borderColor: "rgba(220, 38, 38, 0.7)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              競合
            </span>
          );
        }
        const label = session.classTypeName || "-";
        const colorKey =
          session.classTypeColor || (session as any)?.classType?.color || null;
        if (!session.classTypeName) return "-";
        if (isValidClassTypeColor(colorKey)) {
          const cls = classTypeColorClasses[colorKey as ClassTypeColor];
          return (
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border ${cls.background} ${cls.border} ${cls.text} dark:!text-white`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${cls.dot}`}
              />
              {label}
            </span>
          );
        }
        if (isHexColor(colorKey || "")) {
          const bg = rgba(colorKey!, 0.14) || undefined;
          const border = rgba(colorKey!, 0.4) || undefined;
          return (
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border text-slate-900 dark:!text-white`}
              style={{ backgroundColor: bg, borderColor: border }}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full`}
                style={{ backgroundColor: colorKey! }}
              />
              {label}
            </span>
          );
        }
        return <Badge variant="secondary">{label}</Badge>;
      },
    },
    {
      accessorKey: "boothName",
      header: "ブース",
      cell: ({ row }) =>
        (row.original as ExtendedClassSession).boothName || "-",
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
          <Badge variant="outline">
            {(row.original as ExtendedClassSession).branchName}
          </Badge>
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
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLessonId(session.classId);
                    setDialogMode("edit");
                    setIsLessonDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </DropdownMenuItem>
                {session.seriesId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (session.seriesId) {
                          setSeriesToDelete({
                            seriesId: session.seriesId,
                            sessionInfo: session,
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

    const classIds = selectedRowsForDeletion.map((session) => session.classId);
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
            birthDate: teacher.birthDate ? new Date(teacher.birthDate) : null,
            createdAt: new Date(teacher.createdAt),
            updatedAt: new Date(teacher.updatedAt),
            linkingCode: null,
            lineUserId: teacher.lineUserId || null,
          })) || []
      }
      students={
        studentsData?.data
          ?.filter(
            (student): student is typeof student & { status: string } =>
              student.status !== undefined
          )
          .map((student) => ({
            studentId: student.studentId,
            userId: student.userId,
            name: student.name,
            kanaName: student.kanaName,
            studentTypeId: student.studentTypeId,
            gradeYear: student.gradeYear,
            lineId: student.lineId,
            parentLineId1: student.parentLineId1,
            lineUserId: student.lineUserId,
            lineNotificationsEnabled: student.lineNotificationsEnabled,
            notes: student.notes,
            status: student.status as UserStatus,
            createdAt: new Date(student.createdAt),
            updatedAt: new Date(student.updatedAt),
            linkingCode: null,
            // New fields
            schoolName: student.schoolName,
            schoolType: student.schoolType as any,
            examCategory: student.examCategory as any,
            examCategoryType: student.examCategoryType as any,
            firstChoice: student.firstChoice,
            secondChoice: student.secondChoice,
            examDate: student.examDate ? new Date(student.examDate) : null,
            admissionDate: student.admissionDate
              ? new Date(student.admissionDate)
              : null,
            homePhone: student.homePhone,
            parentPhone: student.parentPhone,
            studentPhone: student.studentPhone,
            parentEmail: student.parentEmail,
            birthDate: student.birthDate ? new Date(student.birthDate) : null,
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
        // Remove the create button functionality
        // onCreateNew={() => setIsCreateDialogOpen(true)}
        // createNewLabel="新規授業作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
        filterComponent={filterComponent}
        enableRowSelection={true}
        onBatchDelete={handleBulkDelete}
      />

      {/* Edit Session Dialog (shared with 日次 view) */}
      {isLessonDialogOpen && selectedLesson && (
        <LessonDialog
          open={isLessonDialogOpen}
          onOpenChange={(open) => {
            setIsLessonDialogOpen(open);
            if (!open) setSelectedLessonId(null);
          }}
          lesson={selectedLesson}
          mode={dialogMode}
          onModeChange={setDialogMode}
          onSave={() => {
            setIsLessonDialogOpen(false);
            setSelectedLessonId(null);
            queryClient.invalidateQueries({ queryKey: ["classSessions"] });
          }}
          onDelete={() => {
            setIsLessonDialogOpen(false);
            setSelectedLessonId(null);
            queryClient.invalidateQueries({ queryKey: ["classSessions"] });
          }}
          booths={booths}
          teachers={teachers}
          students={students}
          subjects={subjects}
        />
      )}

      {/* Remove Create Session Dialog - no longer needed
      <ClassSessionFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        filters={filters}
      />
      */}

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
                <span>{seriesToDelete.sessionInfo.teacherName}先生の</span>
              )}
              {seriesToDelete?.sessionInfo?.subjectName && (
                <span>{seriesToDelete.sessionInfo.subjectName}の</span>
              )}
              シリーズの<strong>本日以降のすべての授業</strong>を削除します。
              <strong className="block mt-2 text-destructive">
                警告:
                過去の授業は削除されませんが、今日以降の未来の授業はすべて削除されます。
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
              {deleteClassSessionSeriesMutation.isPending
                ? "削除中..."
                : "シリーズを削除"}
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
            <AlertDialogTitle>
              選択した授業を一括削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。 選択された
              <strong>{selectedRowsForDeletion.length}件</strong>
              の授業を完全に削除します。
              {selectedRowsForDeletion.some(
                (session: ExtendedClassSession) => session.seriesId
              ) && (
                <strong className="block mt-2 text-destructive">
                  注意:
                  選択した授業の中に繰り返しシリーズの一部が含まれています。
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
              {bulkDeleteClassSessionMutation.isPending
                ? "削除中..."
                : `${selectedRowsForDeletion.length}件を削除`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
