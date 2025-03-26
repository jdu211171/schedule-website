import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 評価一覧
interface Evaluation {
  id: number;
  name: string;
  score: number;
  note?: string; // 備考
}

export const evaluationsTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "評価名" },
    { accessorKey: "score", header: "スコア" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const evaluation = row.original as Evaluation;
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
  ] as ColumnDef<Evaluation, any>[],
  data: [
    { id: 1, name: "A", score: 90, note: "優秀" },
    { id: 2, name: "B", score: 80, note: "良い" },
  ],
};
