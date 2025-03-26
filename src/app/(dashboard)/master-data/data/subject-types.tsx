import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 科目タイプ一覧
interface SubjectType {
  id: number;
  name: string;
  note?: string; // 備考
}

export const subjectTypesTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "科目タイプ名" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const subject = row.original as SubjectType;
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive">
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ] as ColumnDef<SubjectType, any>[],
  data: [
    { id: 1, name: "必修", note: "卒業に必要な科目" },
    { id: 2, name: "選択", note: "自由に選択できる科目" },
  ],
};
