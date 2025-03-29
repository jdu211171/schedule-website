import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 授業種別一覧
interface LessonType {
  id: number;
  name: string;
  note?: string; // 備考
}

export const lessonTypesTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "授業種別名" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const lesson = row.original as LessonType;
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
  ] as ColumnDef<LessonType, any>[],
  data: [
    { id: 1, name: "講義", note: "先生が話す授業" },
    { id: 2, name: "演習", note: "実践的な授業" },
  ],
};
