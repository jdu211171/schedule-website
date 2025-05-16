"use client";

import {
  RegularClassTemplateWithRelations,
  useRegularClassTemplates,
} from "@/hooks/useRegularClassTemplateQuery";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { useCallback, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { MatchingFormDialog } from "./matching-form-dialog";
import { useRegularClassTemplateDelete } from "@/hooks/useRegularClassTemplateMutation";
import { FilterBar, type AnyFilterConfig } from "@/components/filter-bar";
type FilterState = Record<string, string[]>;

export function MatchingTable() {
  const [page, setPage] = useState(1);
  const { data: regularClassTemplates, isLoading } = useRegularClassTemplates({
    page,
    sort: "createdAt",
    order: "desc",
  });
  const [templateToEdit, setTemplateToEdit] =
    useState<RegularClassTemplateWithRelations | null>(null);
  const [templateToDelete, setTemplateToDelete] =
    useState<RegularClassTemplateWithRelations | null>(null);
  const deleteTemplateMutation = useRegularClassTemplateDelete();

  const [filters, setFilters] = useState<FilterState>({
    teacherIds: [],
    studentIds: [],
    subjectIds: [],
    boothIds: [],
    dayOfWeekIds: [],
  });

  const filterOptions = useMemo(() => {
    const templates = regularClassTemplates?.data || [];

    const teachers = Array.from(
      new Set(templates.map((t) => t.teacherId).filter(Boolean))
    ).map((id) => ({
      value: id,
      label: templates.find((t) => t.teacherId === id)?.teacher?.name || id,
    }));

    const students: { value: string; label: string }[] = [];
    templates.forEach((template) => {
      template.templateStudentAssignments?.forEach((assignment) => {
        if (assignment.studentId && !students.some(s => s.value === assignment.studentId)) {
          students.push({
            value: assignment.studentId,
            label: assignment.student?.name || assignment.studentId,
          });
        }
      });
    });

    const subjects = Array.from(
      new Set(templates.map((t) => t.subjectId).filter(Boolean))
    ).map((id) => ({
      value: id,
      label: templates.find((t) => t.subjectId === id)?.subject?.name || id,
    }));

    const booths = Array.from(
      new Set(templates.map((t) => t.boothId).filter(Boolean))
    ).map((id) => ({
      value: id,
      label: templates.find((t) => t.boothId === id)?.booth?.name || id,
    }));

    const daysOfWeek = [
      { value: "MONDAY", label: "月曜日" },
      { value: "TUESDAY", label: "火曜日" },
      { value: "WEDNESDAY", label: "水曜日" },
      { value: "THURSDAY", label: "木曜日" },
      { value: "FRIDAY", label: "金曜日" },
      { value: "SATURDAY", label: "土曜日" },
      { value: "SUNDAY", label: "日曜日" },
    ];

    return { teachers, students, subjects, booths, daysOfWeek };
  }, [regularClassTemplates?.data]);

  const filterConfigs = useMemo<AnyFilterConfig[]>(
    () => [
      {
        id: "teacherIds",
        label: "講師",
        placeholder: "講師を選択",
        options: filterOptions.teachers,
      },
      {
        id: "studentIds",
        label: "生徒",
        placeholder: "生徒を選択",
        options: filterOptions.students,
      },
      {
        id: "subjectIds",
        label: "科目",
        placeholder: "科目を選択",
        options: filterOptions.subjects,
      },
      {
        id: "boothIds",
        label: "ブース",
        placeholder: "ブースを選択",
        options: filterOptions.booths,
      },
      {
        id: "dayOfWeekIds",
        label: "曜日",
        placeholder: "曜日を選択",
        options: filterOptions.daysOfWeek,
      },
    ],
    [filterOptions]
  );

  const handleFilterChange = useCallback(
    (filterId: string, values: string[]) => {
      setFilters((prev) => ({
        ...prev,
        [filterId]: values,
      }));
    },
    []
  );

  const filteredTemplates = useMemo(() => {
    const templates = regularClassTemplates?.data || [];

    return templates.filter((template) => {
      const teacherMatch =
        filters.teacherIds.length === 0 ||
        (template.teacherId && filters.teacherIds.includes(template.teacherId));

      const studentMatch =
        filters.studentIds.length === 0 ||
        template.templateStudentAssignments?.some((assignment) =>
          filters.studentIds.includes(assignment.studentId)
        );

      const subjectMatch =
        filters.subjectIds.length === 0 ||
        (template.subjectId && filters.subjectIds.includes(template.subjectId));

      const boothMatch =
        filters.boothIds.length === 0 ||
        (template.boothId && filters.boothIds.includes(template.boothId));

      const dayOfWeekMatch =
        filters.dayOfWeekIds.length === 0 ||
        (template.dayOfWeek && filters.dayOfWeekIds.includes(template.dayOfWeek));

      return teacherMatch && studentMatch && subjectMatch && boothMatch && dayOfWeekMatch;
    });
  }, [regularClassTemplates?.data, filters]);

  const columns: ColumnDef<RegularClassTemplateWithRelations>[] = [
    {
      accessorKey: "booth",
      header: "ブース",
      cell: ({ row }) => row.original.booth.name,
    },
    {
      accessorKey: "dayOfWeek",
      header: "曜日",
      cell: ({ row }) => {
        const dayMapping: Record<string, string> = {
          MONDAY: "月曜日",
          TUESDAY: "火曜日",
          WEDNESDAY: "水曜日",
          THURSDAY: "木曜日",
          FRIDAY: "金曜日",
          SATURDAY: "土曜日",
          SUNDAY: "日曜日"
        };
        return dayMapping[row.original.dayOfWeek] || row.original.dayOfWeek;
      },
    },
    {
      accessorKey: "startDate",
      header: "開始日",
      cell: ({ row }) =>
        row.original.startDate
          ? format(new Date(row.original.startDate), "yyyy/MM/dd")
          : "-",
    },
    {
      accessorKey: "endDate",
      header: "終了日",
      cell: ({ row }) =>
        row.original.endDate
          ? format(new Date(row.original.endDate), "yyyy/MM/dd")
          : "-",
    },
    {
      accessorKey: "startTime",
      header: "開始時間",
      cell: ({ row }) => format(new Date(row.original.startTime), "HH:mm"),
    },
    {
      accessorKey: "endTime",
      header: "終了時間",
      cell: ({ row }) => format(new Date(row.original.endTime), "HH:mm"),
    },
    {
      accessorKey: "teacher",
      header: "講師",
      cell: ({ row }) => row.original.teacher.name,
    },
    {
      accessorKey: "classType",
      header: "授業タイプ",
      cell: ({ row }) => (
        <Badge variant={"outline"}>{row.original.classType.name}</Badge>
      ),
    },
    {
      accessorKey: "student",
      header: "生徒",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.templateStudentAssignments.map((e) => (
            <span key={e.studentId} className="text-sm">
              {e.student.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "subject",
      header: "科目",
      cell: ({ row }) => row.original.subject.name,
    },
    {
      accessorKey: "notes",
      header: "備考",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setTemplateToEdit(row.original);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setTemplateToDelete(row.original);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  function handleDeleteTemplate() {
    if (!templateToDelete) return;

    try {
      deleteTemplateMutation.mutate(templateToDelete.templateId);
    } catch (error) {
      console.error("Error deleting template:", error);
    }

    setTemplateToDelete(null);
  }

  return (
    <>
      <div className="mb-6">
        <FilterBar
          filters={filterConfigs}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          onDateRangeChange={() => {}}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredTemplates}
        pageCount={regularClassTemplates?.pagination.pages}
        pageSize={regularClassTemplates?.pagination.limit}
        pageIndex={page - 1}
        onPageChange={setPage}
        totalItems={regularClassTemplates?.pagination.total}
        isLoading={isLoading}
      />

      {templateToEdit && (
        <MatchingFormDialog
          isOpen={!!templateToEdit}
          onOpenChange={() => setTemplateToEdit(null)}
          template={templateToEdit}
        />
      )}

      <AlertDialog
        open={!!templateToDelete}
        onOpenChange={() => setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>通常授業のマッチング</AlertDialogTitle>
            <AlertDialogDescription>
              通常授業のマッチングを行います。
              マッチングが完了すると、講師と生徒に通知が送信されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
