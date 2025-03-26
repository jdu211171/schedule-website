import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

// Определяем тип данных для 時間枠一覧
interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  note?: string; // 備考
}

export const timeSlotsTable = {
  columns: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "startTime", header: "開始時刻" },
    { accessorKey: "endTime", header: "終了時刻" },
    { accessorKey: "note", header: "備考" },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const slot = row.original as TimeSlot;
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
  ] as ColumnDef<TimeSlot, any>[],
  data: [
    { id: 1, startTime: "09:00", endTime: "10:30", note: "午前の授業" },
    { id: 2, startTime: "11:00", endTime: "12:30", note: "昼前の授業" },
  ],
};
