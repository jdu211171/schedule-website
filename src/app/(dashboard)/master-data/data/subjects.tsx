import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 科目一覧
interface Subject {
  id: number;
  name: string;
  typeName: string;
  typeId: number;
  note?: string; // 備考
}

export const subjectsTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "科目名" },
    { accessorKey: "typeName", header: "科目タイプ名" },
    { accessorKey: "typeId", header: "科目タイプID" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const subject = row.original as Subject;
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
  ] as ColumnDef<Subject, any>[],
  data: [
    { id: 1, name: "数学", typeName: "必修", typeId: 1, note: "重要科目" },
    { id: 2, name: "歴史", typeName: "選択", typeId: 2, note: "興味深い" },
  ],
};
