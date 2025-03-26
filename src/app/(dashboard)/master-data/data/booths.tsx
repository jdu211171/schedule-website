import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для ブース一覧
interface Booth {
  id: number;
  name: string;
  capacity: number;
  note?: string; // 備考
}

export const boothsTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "ブース名" },
    { accessorKey: "capacity", header: "定員" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const booth = row.original as Booth;
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
  ] as ColumnDef<Booth, any>[],
  data: [
    { id: 1, name: "A101", capacity: 30, note: "1階のブース" },
    { id: 2, name: "B202", capacity: 25, note: "2階のブース" },
  ],
};
