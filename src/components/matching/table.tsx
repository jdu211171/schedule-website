"use client";

import {
  RegularClassTemplateWithRelations,
  useRegularClassTemplates,
} from "@/hooks/useRegularClassTemplateQuery";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { useState } from "react";
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

export function MatchingTable() {
  const [page, setPage] = useState(1);
  const { data: regularClassTempalates, isLoading } = useRegularClassTemplates({
    page,
    sort: "createdAt",
    order: "desc",
  });
  const [templateToEdit, setTemplateToEdit] =
    useState<RegularClassTemplateWithRelations | null>(null);
  const [templateToDelete, setTemplateToDelete] =
    useState<RegularClassTemplateWithRelations | null>(null);
  const deleteTemplateMutation = useRegularClassTemplateDelete();

  const columns: ColumnDef<RegularClassTemplateWithRelations>[] = [
    {
      accessorKey: "booth",
      header: "ブース",
      cell: ({ row }) => row.original.booth.name,
    },
    {
      accessorKey: "dayOfWeek",
      header: "曜日",
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
      header: "講師ID",
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
            <Badge key={e.studentId} className="text-sm">
              {e.student.name}
            </Badge>
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
      <DataTable
        columns={columns}
        data={regularClassTempalates?.data ?? []}
        pageCount={regularClassTempalates?.pagination.pages}
        pageSize={regularClassTempalates?.pagination.limit}
        pageIndex={page - 1}
        onPageChange={setPage}
        totalItems={regularClassTempalates?.pagination.total}
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
