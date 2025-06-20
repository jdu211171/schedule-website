import { useDataTable } from "@/hooks/use-data-table";
import { Branch, useBranches } from "@/hooks/useBranchQuery";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { DataTable } from "./data-table/data-table";
import { DataTableToolbar } from "./data-table/data-table-toolbar";
import { DataTableSortList } from "./data-table/data-table-sort-list";
import { DataTableFilterList } from "./data-table/data-table-filter-list";
import { TextIcon } from "lucide-react";

export function TestTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: branches, isLoading } = useBranches({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: "名前",
      header: "名前",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
      meta: {
        label: "名前",
        placeholder: "Search 名前...",
        variant: "text",
        icon: TextIcon,
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "メモ",
      header: "メモ",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.notes || "-"}
        </span>
      ),
      enableColumnFilter: true,
      meta: {
        label: "メモ",
        placeholder: "Search メモ...",
        variant: "text",
        icon: TextIcon,
      },
    },
  ];

  const { table } = useDataTable({
    data: branches?.data || [],
    columns,
    pageCount: branches?.pagination.pages || 0,
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table}>
        <DataTableFilterList table={table} />
        <DataTableSortList table={table} />
      </DataTableToolbar>
    </DataTable>
  );
}
