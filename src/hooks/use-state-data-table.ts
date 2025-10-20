"use client";

import {
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  type VisibilityState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { type UseQueryStateOptions, useQueryState } from "nuqs";
import * as React from "react";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getSortingStateParser } from "@/lib/parsers";
import type { ExtendedColumnSort } from "@/types/data-table";
import { useColumnOrder } from "@/hooks/useColumnOrder";

const SORT_KEY = "sort";
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;

interface UseDataTableProps<TData>
  extends Omit<
      TableOptions<TData>,
      | "state"
      | "pageCount"
      | "getCoreRowModel"
      | "manualFiltering"
      | "manualPagination"
      | "manualSorting"
    >,
    Required<Pick<TableOptions<TData>, "pageCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  /**
   * Persist column order in localStorage under this key. If omitted, column order is not persisted.
   */
  columnOrderStorageKey?: string;
  history?: "push" | "replace";
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  enableAdvancedFilter?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
}

export function useStateDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    // New: optional storage key to persist column order per table
    // Example: "teacherTable.columnOrder" | "studentTable.columnOrder"
    // If omitted, column order is still controllable in-memory and not persisted.
    columnOrderStorageKey,
    initialState,
    history = "replace",
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    clearOnDefault = false,
    enableAdvancedFilter = false,
    scroll = false,
    shallow = true,
    startTransition,
    ...tableProps
  } = props;

  const queryStateOptions = React.useMemo<
    Omit<UseQueryStateOptions<string>, "parse">
  >(
    () => ({
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    }),
    [
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    ]
  );

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {}
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});

  // ✅ Pagination is now local state (hidden from URL)
  const [page, setPage] = React.useState<number>(
    initialState?.pagination?.pageIndex != null
      ? initialState.pagination.pageIndex + 1
      : 1
  );
  const [perPage, setPerPage] = React.useState<number>(
    initialState?.pagination?.pageSize ?? 10
  );

  const pagination: PaginationState = React.useMemo(() => {
    return {
      pageIndex: page - 1,
      pageSize: perPage,
    };
  }, [page, perPage]);

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      if (typeof updaterOrValue === "function") {
        const newPagination = updaterOrValue(pagination);
        setPage(newPagination.pageIndex + 1);
        setPerPage(newPagination.pageSize);
      } else {
        setPage(updaterOrValue.pageIndex + 1);
        setPerPage(updaterOrValue.pageSize);
      }
    },
    [pagination]
  );

  const columnIds = React.useMemo(() => {
    return new Set(
      columns.map((column) => column.id).filter(Boolean) as string[]
    );
  }, [columns]);

  const [sorting, setSorting] = useQueryState(
    SORT_KEY,
    getSortingStateParser<TData>(columnIds)
      .withOptions(queryStateOptions)
      .withDefault(initialState?.sorting ?? [])
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      if (typeof updaterOrValue === "function") {
        const newSorting = updaterOrValue(sorting);
        setSorting(newSorting as ExtendedColumnSort<TData>[]);
      } else {
        setSorting(updaterOrValue as ExtendedColumnSort<TData>[]);
      }
    },
    [sorting, setSorting]
  );

  const filterableColumns = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return columns.filter((column) => column.enableColumnFilter);
  }, [columns, enableAdvancedFilter]);

  // Seed initial filter values from provided initialState.columnFilters (if any)
  const initialFilterValuesFromProps = React.useMemo(() => {
    const cf = initialState?.columnFilters as ColumnFiltersState | undefined;
    if (!cf || cf.length === 0) return {};
    return cf.reduce<Record<string, string | string[]>>((acc, f) => {
      acc[f.id] = f.value as string | string[];
      return acc;
    }, {});
  }, [initialState?.columnFilters]);

  // ✅ Filters are now local state (hidden from URL)
  const [filterValues, setFilterValues] = React.useState<
    Record<string, string | string[]>
  >(initialFilterValuesFromProps);

  const debouncedSetFilterValues = useDebouncedCallback(
    (values: typeof filterValues) => {
      setPage(1);
      setFilterValues(values);
    },
    debounceMs
  );

  const initialColumnFilters: ColumnFiltersState = React.useMemo(() => {
    if (enableAdvancedFilter) return [];

    return Object.entries(filterValues).reduce<ColumnFiltersState>(
      (filters, [key, value]) => {
        if (value !== null) {
          const processedValue = Array.isArray(value)
            ? value
            : typeof value === "string" && /[^a-zA-Z0-9]/.test(value)
              ? value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
              : [value];

          filters.push({
            id: key,
            value: processedValue,
          });
        }
        return filters;
      },
      []
    );
  }, [filterValues, enableAdvancedFilter]);

  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters);

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return;

      setColumnFilters((prev) => {
        const next =
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev)
            : updaterOrValue;

        const filterUpdates = next.reduce<
          Record<string, string | string[] | null>
        >((acc, filter) => {
          if (filterableColumns.find((column) => column.id === filter.id)) {
            acc[filter.id] = filter.value as string | string[];
          }
          return acc;
        }, {});

        for (const prevFilter of prev) {
          if (!next.some((filter) => filter.id === prevFilter.id)) {
            filterUpdates[prevFilter.id] = null;
          }
        }

        // Filter out null values before passing to debouncedSetFilterValues
        const filteredUpdates = Object.fromEntries(
          Object.entries(filterUpdates).filter(([, value]) => value !== null)
        ) as Record<string, string | string[]>;

        debouncedSetFilterValues(filteredUpdates);
        return next;
      });
    },
    [debouncedSetFilterValues, filterableColumns, enableAdvancedFilter]
  );

  // Derive a stable list of leaf column ids from column definitions
  const allColumnIds = React.useMemo(() => {
    // Our codebase declares ids on each ColumnDef; fall back to accessorKey when needed
    const ids: string[] = [];
    for (const col of columns as any[]) {
      const id = (col?.id ?? col?.accessorKey) as string | undefined;
      if (id) ids.push(id);
    }
    return ids;
  }, [columns]);

  // Column order state + persistence
  const { order: columnOrder, setOrder: setColumnOrder } = useColumnOrder(
    columnOrderStorageKey as string | undefined,
    allColumnIds
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    meta: {
      columnOrderStorageKey,
      defaultColumnIds: allColumnIds,
    },
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      // Control column order so we can persist it
      columnOrder,
    },
    enableMultiSort: true,
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: (updaterOrValue) => {
      if (typeof updaterOrValue === "function") {
        const next = updaterOrValue(columnOrder as any);
        setColumnOrder(next as string[]);
      } else {
        setColumnOrder(updaterOrValue as unknown as string[]);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return { table, shallow, debounceMs, throttleMs };
}
