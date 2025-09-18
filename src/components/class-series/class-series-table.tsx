"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getFacetedRowModel, getFacetedUniqueValues, useReactTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClassSeriesList, useExtendClassSeries, useDeleteClassSeries } from "@/hooks/use-class-series";
import { DataTablePagination } from "@/components/new-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/new-table/data-table-column-header";
import SeriesDetailDialog from "@/components/class-series/series-detail-dialog";
import ClassSeriesToolbar from "./class-series-toolbar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClassSeries } from "@/hooks/use-class-series";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import SeriesSessionsTableDialog from "./series-sessions-table-dialog";
import { ConfirmDeleteDialog } from "@/components/admin-schedule/confirm-delete-dialog";

type Props = { selectedBranchId?: string };

export default function ClassSeriesTable({ selectedBranchId }: Props) {
  // Fetch all statuses; default filtering is handled client-side
  const { data = [], isLoading } = useClassSeriesList({ branchId: selectedBranchId });
  const [filter, setFilter] = useState("");
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
  const [openSessionsId, setOpenSessionsId] = useState<string | null>(null);
  const { data: session } = useSession();
  const role = session?.user?.role as ("ADMIN" | "STAFF" | "TEACHER" | undefined);
  const qc = useQueryClient();

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "subjectName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="科目" />,
      cell: ({ row }) => <span className="text-sm">{row.original.subjectName || row.original.subjectId || "—"}</span>,
    },
    {
      accessorKey: "studentName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="生徒" />,
      cell: ({ row }) => <span className="text-sm">{row.original.studentName || row.original.studentId || "—"}</span>,
      filterFn: (row, id, value) => (value as string[]).includes((row.getValue(id) as string) || ""),
    },
    {
      accessorKey: "teacherName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="講師" />,
      cell: ({ row }) => <span className="text-sm">{row.original.teacherName || row.original.teacherId || "—"}</span>,
      filterFn: (row, id, value) => (value as string[]).includes((row.getValue(id) as string) || ""),
    },
    {
      id: "dow",
      accessorFn: (row: any) => {
        const ja = ["日","月","火","水","木","金","土"];
        const dows: number[] = row.daysOfWeek || [];
        return dows.map((d) => ja[d] ?? d).join("・");
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="曜日" />,
      cell: ({ row }) => {
        const dows: number[] = row.original.daysOfWeek || [];
        const ja = ["日","月","火","水","木","金","土"];
        return <span className="text-sm">{dows.map(d => ja[d] ?? d).join("・") || "—"}</span>;
      },
      filterFn: (row, _id, value) => {
        const selected = (value as string[]) || [];
        if (!selected.length) return true;
        const dows: number[] = row.original.daysOfWeek || [];
        return selected.some((s) => dows.includes(Number(s)));
      },
    },
    {
      id: "time",
      accessorFn: (row: any) => `${row.startTime}–${row.endTime}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="時間" />,
      cell: ({ row }) => <span className="text-sm">{row.original.startTime}–{row.original.endTime}</span>,
    },
    {
      id: "range",
      accessorFn: (row: any) => `${row.startDate} ${row.endDate ?? ""}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="期間" />,
      cell: ({ row }) => <span className="text-sm">{row.original.startDate} → {row.original.endDate ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="状態" />,
      cell: ({ row }) => <span className="text-xs rounded border px-2 py-0.5">{row.original.status}</span>,
      filterFn: (row, id, value) => (value as string[]).includes(row.getValue(id) as string),
    },
    {
      accessorKey: "generationMode",
      header: ({ column }) => <DataTableColumnHeader column={column} title="生成モード" />,
      cell: ({ row }) => (
        <GenerationModeCell
          seriesId={row.original.seriesId}
          value={row.original.generationMode}
          disabled={role === "TEACHER"}
        />
      ),
      filterFn: (row, id, value) => (value as string[]).includes(row.getValue(id) as string),
    },
    {
      accessorKey: "lastGeneratedThrough",
      header: ({ column }) => <DataTableColumnHeader column={column} title="生成済み（最終）" />,
      cell: ({ row }) => <span className="text-sm">{row.original.lastGeneratedThrough ?? "—"}</span>,
      filterFn: (row, id, value) => {
        // value is [fromTS, toTS]; matches DataTableDateFilter multiple mode
        const v = row.getValue(id) as string | null;
        if (!value || !Array.isArray(value)) return true;
        if (!v) return false;
        const [fromTS, toTS] = value as (number | undefined)[];
        const d = new Date(`${v}T00:00:00Z`).getTime();
        if (fromTS && d < fromTS) return false;
        if (toTS && d > toTS) return false;
        return true;
      },
      meta: { variant: "dateRange", label: "生成済み（最終）" },
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-2">操作</div>,
      cell: ({ row }) => <RowActions seriesId={row.original.seriesId} onOpenDrawer={setOpenSeriesId} onOpenSessions={setOpenSessionsId} />,
      enableColumnFilter: false,
    },
  ], []);

  const [columnFilters, setColumnFilters] = useState<any[]>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<any>({});
  const [sorting, setSorting] = useState<any>([{ id: "updatedAt", desc: true }]);

  const STORAGE_KEY = "series_table_state";

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.globalFilter) setFilter(parsed.globalFilter);
      if (parsed.columnFilters) setColumnFilters(parsed.columnFilters);
      if (parsed.columnVisibility) setColumnVisibility(parsed.columnVisibility);
      if (parsed.sorting) setSorting(parsed.sorting);
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change
  useEffect(() => {
    const payload = {
      globalFilter: filter,
      columnFilters,
      columnVisibility,
      sorting,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }, [filter, columnFilters, columnVisibility, sorting]);

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      globalFilter: filter,
      columnFilters,
      rowSelection,
      columnVisibility,
      sorting,
    },
    onGlobalFilterChange: setFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row: any) => row.seriesId as string,
    globalFilterFn: (row, _columnId, filterValue) => {
      const v = String(filterValue).toLowerCase();
      const o = row.original as any;
      return (
        (o.subjectId || "").toLowerCase().includes(v) ||
        (o.studentId || "").toLowerCase().includes(v) ||
        (o.teacherId || "").toLowerCase().includes(v) ||
        (o.seriesId || "").toLowerCase().includes(v)
      );
    },
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  return (
    <div className="space-y-3">
      <ClassSeriesToolbar table={table} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={columns.length}>読み込み中…</TableCell></TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(r => (
                <TableRow key={r.id} data-state={r.getIsSelected() && "selected"}>
                  {r.getVisibleCells().map(c => (
                    <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length}>結果がありません</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      {openSeriesId && (
        <SeriesDetailDialog seriesId={openSeriesId} open={!!openSeriesId} onOpenChange={(open) => !open && setOpenSeriesId(null)} />
      )}
      {openSessionsId && (
        <SeriesSessionsTableDialog seriesId={openSessionsId} open={!!openSessionsId} onOpenChange={(open) => !open && setOpenSessionsId(null)} />
      )}
    </div>
  );
}

function RowActions({ seriesId, onOpenDrawer, onOpenSessions }: { seriesId: string; onOpenDrawer: (id: string) => void; onOpenSessions: (id: string) => void }) {
  const extend = useExtendClassSeries(seriesId);
  const del = useDeleteClassSeries(seriesId);
  const { data: session } = useSession();
  const role = session?.user?.role as ("ADMIN" | "STAFF" | "TEACHER" | undefined);
  const [openDelete, setOpenDelete] = useState(false);
  const [genMonths, setGenMonths] = useState<number>(1);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/scheduling-config?scope=branch');
        if (res.ok) {
          const data = await res.json();
          const m = Number(data?.effective?.generationMonths ?? 1) || 1;
          setGenMonths(m);
        }
      } catch (_) {}
    })();
  }, []);
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => onOpenDrawer(seriesId)}>詳細</Button>
      <Button variant="outline" size="sm" onClick={() => onOpenSessions(seriesId)}>授業</Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={extend.isPending}
        onClick={async () => {
          toast.promise(extend.mutateAsync(genMonths), {
            loading: "生成中...",
            success: `${genMonths}ヶ月分を生成しました`,
            error: "生成に失敗しました",
          });
        }}
      >
        {genMonths}ヶ月分を生成
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={role === "TEACHER" || del.isPending}
        onClick={() => setOpenDelete(true)}
      >
        シリーズ全体を削除
      </Button>
      <ConfirmDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="シリーズと関連授業の削除"
        description={"このシリーズと関連するすべての通常授業を完全に削除します。\nこの操作は取り消せません。"}
        confirmText="シリーズ全体を削除"
        onConfirm={() => {
          toast.promise(del.mutateAsync(), {
            loading: "削除中...",
            success: "シリーズを削除しました",
            error: "削除に失敗しました",
          });
        }}
        isLoading={del.isPending}
      />
    </div>
  );
}

function GenerationModeCell({ seriesId, value, disabled }: { seriesId: string; value: string; disabled?: boolean }) {
  const update = useUpdateClassSeries(seriesId);
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const onChange = async (val: string) => {
    const prev = local;
    setLocal(val);
    try {
      await update.mutateAsync({ generationMode: val as any });
      toast.success(`生成モードを${val}に更新しました`);
    } catch (_) {
      setLocal(prev);
      toast.error("生成モードの更新に失敗しました");
    }
  };
  return (
    <Select disabled={disabled || update.isPending} value={local} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ON_DEMAND">手動（ON_DEMAND）</SelectItem>
        <SelectItem value="ADVANCE">自動（ADVANCE）</SelectItem>
      </SelectContent>
    </Select>
  );
}
