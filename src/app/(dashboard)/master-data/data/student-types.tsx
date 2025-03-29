import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 学生タイプ一覧
interface StudentType {
  id: number;
  name: string;
  note?: string; // 補足
}

export const studentTypesTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "学生タイプ名" },
    { accessorKey: "note", header: "補足" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const student = row.original as StudentType;
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
  ] as ColumnDef<StudentType, any>[],
  data: [
    { id: 1, name: "留学生", note: "海外からの学生" },
    { id: 2, name: "国内学生", note: "日本国内の学生" },
  ],
};
