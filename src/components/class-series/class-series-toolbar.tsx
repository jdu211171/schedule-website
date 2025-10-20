"use client";

import React from "react";
import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "@/components/new-table/data-table-view-options";
import { DataTableFacetedFilter } from "@/components/new-table/data-table-faceted-filter";
import { SimpleDateRangePicker } from "@/components/fix-date-range-picker/simple-date-range-picker";
import type { DateRange } from "react-day-picker";

type Props<TData> = {
  table: Table<TData>;
  globalSearchPlaceholder?: string;
};

export default function ClassSeriesToolbar<TData>({
  table,
  globalSearchPlaceholder = "検索（科目/生徒/講師）",
}: Props<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    Boolean(table.getState().globalFilter);

  const statusOptions = [
    { value: "ACTIVE", label: "ACTIVE" },
    { value: "PAUSED", label: "PAUSED" },
    { value: "ENDED", label: "ENDED" },
  ];

  // generation mode removed (always ADVANCE globally)

  // Build dynamic options from faceted unique values
  function makeOptions(colId: string) {
    const col = table.getColumn(colId);
    if (!col || !("getFacetedUniqueValues" in col))
      return [] as Array<{ value: string; label: string }>;
    // @ts-ignore tanstack provides this at runtime when faceted unique is enabled
    const m: Map<unknown, number> | undefined = col.getFacetedUniqueValues?.();
    if (!m) return [];
    const arr: Array<{ value: string; label: string }> = [];
    m.forEach((_count, key) => {
      const v = String(key ?? "");
      if (!v) return;
      arr.push({ value: v, label: v });
    });
    arr.sort((a, b) => a.label.localeCompare(b.label, "ja"));
    return arr;
  }

  const subjectOptions = makeOptions("subjectName");
  const studentOptions = makeOptions("studentName");
  const teacherOptions = makeOptions("teacherName");
  // Controlled date range from column filter state
  const lastGeneratedCol = table.getColumn("lastGeneratedThrough");
  const lastGeneratedValue =
    (lastGeneratedCol?.getFilterValue() as
      | (number | undefined)[]
      | undefined) || undefined;
  const lastGeneratedRange: DateRange | undefined =
    lastGeneratedValue && Array.isArray(lastGeneratedValue)
      ? {
          from: lastGeneratedValue[0]
            ? new Date(lastGeneratedValue[0])
            : undefined,
          to: lastGeneratedValue[1]
            ? new Date(lastGeneratedValue[1])
            : undefined,
        }
      : undefined;

  const selectedCount = table.getSelectedRowModel().rows.length;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder={globalSearchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="h-8 w-[180px] lg:w-[280px]"
          />
          {table.getColumn("subjectName") && subjectOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn("subjectName")!}
              title="科目"
              options={subjectOptions}
            />
          )}
          {table.getColumn("studentName") && studentOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn("studentName")!}
              title="生徒"
              options={studentOptions}
            />
          )}
          {table.getColumn("teacherName") && teacherOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn("teacherName")!}
              title="講師"
              options={teacherOptions}
            />
          )}
          {table.getColumn("dow") && (
            <DataTableFacetedFilter
              column={table.getColumn("dow")!}
              title="曜日"
              options={[
                { value: "0", label: "日" },
                { value: "1", label: "月" },
                { value: "2", label: "火" },
                { value: "3", label: "水" },
                { value: "4", label: "木" },
                { value: "5", label: "金" },
                { value: "6", label: "土" },
              ]}
            />
          )}
          {table.getColumn("status") && (
            <DataTableFacetedFilter
              column={table.getColumn("status")!}
              title="状態"
              options={statusOptions}
            />
          )}
          {/* generationMode filter removed */}
          {table.getColumn("lastGeneratedThrough") && (
            <SimpleDateRangePicker
              value={lastGeneratedRange}
              onValueChange={(range) =>
                lastGeneratedCol?.setFilterValue(
                  range?.from || range?.to
                    ? [range?.from?.getTime(), range?.to?.getTime()]
                    : undefined
                )
              }
              placeholder="生成済み（最終）"
              showPresets
              className="w-[220px]"
            />
          )}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters();
                table.setGlobalFilter("");
              }}
              className="h-8 px-2 lg:px-3"
            >
              リセット
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        {/* Column visibility menu */}
        <DataTableViewOptions table={table} />
      </div>
      {/* Bulk generation mode bar removed */}
    </>
  );
}

// presets are shown inside SimpleDateRangePicker

// Bulk generation mode operations removed
