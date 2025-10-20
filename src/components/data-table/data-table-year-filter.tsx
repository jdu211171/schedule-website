"use client";

import type { Column } from "@tanstack/react-table";
import { Calendar, XCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type YearFilterMode = "single" | "range" | "from" | "before";

interface YearFilterValue {
  mode: YearFilterMode;
  year?: number;
  startYear?: number;
  endYear?: number;
}

interface DataTableYearFilterProps<TData> {
  column: Column<TData, unknown>;
  title?: string;
}

export function DataTableYearFilter<TData>({
  column,
  title,
}: DataTableYearFilterProps<TData>) {
  const columnFilterValue = column.getFilterValue() as
    | { from?: Date; to?: Date }
    | undefined;

  // Convert the date range to year filter value
  const initialValue = React.useMemo<YearFilterValue>(() => {
    if (!columnFilterValue) {
      return { mode: "single" };
    }

    const { from, to } = columnFilterValue;

    if (from && to) {
      const fromYear = from.getFullYear();
      const toYear = to.getFullYear();

      // Check if it's a single year (Jan 1 - Dec 31 of same year)
      if (
        fromYear === toYear &&
        from.getMonth() === 0 &&
        from.getDate() === 1 &&
        to.getMonth() === 11 &&
        to.getDate() === 31
      ) {
        return { mode: "single", year: fromYear };
      }

      // Check if it's a "from" filter (from year to far future)
      if (toYear >= 2100) {
        return { mode: "from", year: fromYear };
      }

      // Otherwise it's a range
      return { mode: "range", startYear: fromYear, endYear: toYear };
    }

    if (from && !to) {
      return { mode: "from", year: from.getFullYear() };
    }

    if (!from && to) {
      return { mode: "before", year: to.getFullYear() };
    }

    return { mode: "single" };
  }, [columnFilterValue]);

  const [filterValue, setFilterValue] =
    React.useState<YearFilterValue>(initialValue);
  const [isOpen, setIsOpen] = React.useState(false);

  // Update column filter when internal state changes
  const updateColumnFilter = React.useCallback(
    (value: YearFilterValue) => {
      let dateRange: { from?: Date; to?: Date } | undefined;

      switch (value.mode) {
        case "single":
          if (value.year) {
            dateRange = {
              from: new Date(value.year, 0, 1), // Jan 1
              to: new Date(value.year, 11, 31), // Dec 31
            };
          }
          break;

        case "range":
          if (value.startYear && value.endYear) {
            dateRange = {
              from: new Date(value.startYear, 0, 1),
              to: new Date(value.endYear, 11, 31),
            };
          }
          break;

        case "from":
          if (value.year) {
            dateRange = {
              from: new Date(value.year, 0, 1),
              to: new Date(2100, 0, 1), // Far future date
            };
          }
          break;

        case "before":
          if (value.year) {
            dateRange = {
              from: undefined,
              to: new Date(value.year - 1, 11, 31), // Dec 31 of previous year
            };
          }
          break;
      }

      column.setFilterValue(dateRange);
    },
    [column]
  );

  const handleApply = () => {
    updateColumnFilter(filterValue);
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilterValue({ mode: "single" });
    column.setFilterValue(undefined);
    setIsOpen(false);
  };

  const onResetClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setFilterValue({ mode: "single" });
    column.setFilterValue(undefined);
  };

  const hasValue = React.useMemo(() => {
    switch (filterValue.mode) {
      case "single":
        return !!filterValue.year;
      case "range":
        return !!(filterValue.startYear && filterValue.endYear);
      case "from":
      case "before":
        return !!filterValue.year;
      default:
        return false;
    }
  }, [filterValue]);

  const displayText = React.useMemo(() => {
    if (!hasValue) return null;

    switch (filterValue.mode) {
      case "single":
        return `${filterValue.year}年`;
      case "range":
        return `${filterValue.startYear}年 - ${filterValue.endYear}年`;
      case "from":
        return `${filterValue.year}年以降`;
      case "before":
        return `${filterValue.year}年より前`;
      default:
        return null;
    }
  }, [filterValue, hasValue]);

  // Generate year options (e.g., from 1950 to current year + 10)
  const currentYear = new Date().getFullYear();
  const yearOptions = React.useMemo(() => {
    const years = [];
    for (let year = currentYear + 10; year >= 1950; year--) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          {hasValue ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              onClick={onResetClick}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <XCircle />
            </div>
          ) : (
            <Calendar />
          )}
          <span className="flex items-center gap-2">
            <span>{title}</span>
            {displayText && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-0.5 data-[orientation=vertical]:h-4"
                />
                <span className="font-normal">{displayText}</span>
              </>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">フィルタータイプ</label>
            <Select
              value={filterValue.mode}
              onValueChange={(value: YearFilterMode) =>
                setFilterValue({ ...filterValue, mode: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">特定の年</SelectItem>
                <SelectItem value="range">年の範囲</SelectItem>
                <SelectItem value="from">指定年以降</SelectItem>
                <SelectItem value="before">指定年より前</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterValue.mode === "single" && (
            <div>
              <label className="text-sm font-medium">年</label>
              <Select
                value={filterValue.year?.toString()}
                onValueChange={(value) =>
                  setFilterValue({ ...filterValue, year: parseInt(value) })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="年を選択" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterValue.mode === "range" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">開始年</label>
                <Select
                  value={filterValue.startYear?.toString()}
                  onValueChange={(value) =>
                    setFilterValue({
                      ...filterValue,
                      startYear: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="開始年を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}年
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">終了年</label>
                <Select
                  value={filterValue.endYear?.toString()}
                  onValueChange={(value) =>
                    setFilterValue({ ...filterValue, endYear: parseInt(value) })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="終了年を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions
                      .filter(
                        (year) =>
                          !filterValue.startYear ||
                          year >= filterValue.startYear
                      )
                      .map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(filterValue.mode === "from" || filterValue.mode === "before") && (
            <div>
              <label className="text-sm font-medium">
                {filterValue.mode === "from" ? "この年以降" : "この年より前"}
              </label>
              <Select
                value={filterValue.year?.toString()}
                onValueChange={(value) =>
                  setFilterValue({ ...filterValue, year: parseInt(value) })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="年を選択" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              リセット
            </Button>
            <Button size="sm" onClick={handleApply}>
              適用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
