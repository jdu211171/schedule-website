// src/components/data-table/types.ts

// Custom properties for our data table columns
export interface DataTableColumnMeta {
  label?: string;
  placeholder?: string;
  variant?: "text" | "number" | "range" | "date" | "dateRange" | "select" | "multiSelect";
  options?: { value: string; label: string }[];
  unit?: string;
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

// Augment the TanStack table types to use our custom meta
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> extends DataTableColumnMeta {}
}
