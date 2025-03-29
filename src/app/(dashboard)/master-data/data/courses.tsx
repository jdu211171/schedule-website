import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 講座一覧
interface Course {
  id: number;
  name: string;
  subjectName: string;
  grade: number;
  duration: string;
  sessions: number;
  category: string;
}

export const coursesTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "講座名" },
    { accessorKey: "subjectName", header: "科目名" },
    { accessorKey: "grade", header: "学年" },
    { accessorKey: "duration", header: "授業時間" },
    { accessorKey: "sessions", header: "授業回数" },
    { accessorKey: "category", header: "講習区分" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const course = row.original as Course;
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
  ] as ColumnDef<Course, any>[],
  data: [
    { id: 1, name: "数学基礎", subjectName: "数学", grade: 1, duration: "90分", sessions: 15, category: "必修" },
    { id: 2, name: "近代史", subjectName: "歴史", grade: 2, duration: "60分", sessions: 10, category: "選択" },
  ],
};
