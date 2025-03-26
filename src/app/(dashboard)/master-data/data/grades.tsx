import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 学年一覧
interface GradeType {
  id: number;
  gradeName: string;
  gradeType: string;
  grade: number;
  note?: string; // 備考
}

export const gradesTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "gradeName", header: "学年名" },
    { accessorKey: "gradeType", header: "学年タイプ名" },
    { accessorKey: "grade", header: "学年" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const grade = row.original as GradeType;
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
  ] as ColumnDef<GradeType, any>[],
  data: [
    { id: 1, gradeName: "1年生", gradeType: "本科", grade: 1, note: "最初の年" },
    { id: 2, gradeName: "2年生", gradeType: "本科", grade: 2, note: "中間の年" },
  ],
};
