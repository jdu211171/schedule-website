"use client";

import { useMemo } from "react";
import { useReactTable, ColumnDef, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export function MasterDataTable<TData>({ columns, data }: DataTableProps<TData>) {
  // Перемещаем 操作 в конец
  const reorderedColumns = useMemo(() => {
    const actionColumnIndex = columns.findIndex((col) => col.id === "actions");
    if (actionColumnIndex === -1) return columns; // Если 操作 нет, возвращаем как есть

    const filteredColumns = columns.filter((col) => col.id !== "actions");
    return [...filteredColumns, columns[actionColumnIndex]]; // Добавляем 操作 в конец
  }, [columns]);

  const table = useReactTable({
    data,
    columns: reorderedColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200"> 
      <Table className="w-full border-collapse"> {/* border-collapse вместо border-separate */}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="h-12">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={`px-4 bg-white ${header.id === "actions" ? "text-right sticky right-0 bg-white z-10" : ""}`}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="h-12 hover:bg-gray-100">
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={`px-4 ${cell.column.id === "actions" ? "text-right sticky right-0 bg-white z-10" : ""}`}
                >
                  {cell.column.id === "actions" ? (
                    <div className="flex justify-end gap-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ) : (
                    flexRender(cell.column.columnDef.cell, cell.getContext())
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
