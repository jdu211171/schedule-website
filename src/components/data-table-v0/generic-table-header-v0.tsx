"use client";

import * as React from "react";
import {
  flexRender,
  type Header as TanHeader,
  type Table as ReactTable,
} from "@tanstack/react-table";
import { GripVertical } from "lucide-react";
import { SortableItemHandle } from "@/components/ui/sortable";

import {
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPinnedCellStyles } from "@/lib/data-table";
import { cn } from "@/lib/utils";
import {
  Sortable,
  SortableContent,
  SortableItem,
} from "@/components/ui/sortable";
import { arrayMove } from "@dnd-kit/sortable";

interface GenericTableHeaderProps<TData> {
  table: ReactTable<TData>;
}

export function GenericTableHeader<TData>({
  table,
}: GenericTableHeaderProps<TData>) {
  const headerGroups = table.getHeaderGroups();
  if (headerGroups.length === 0) return null as any;

  const headerGroup = headerGroups[0];

  // Only leaf headers are draggable
  const leafHeaders = headerGroup.headers.filter((h) => h.colSpan === 1);

  const byPinned = (
    p: ReturnType<TanHeader<TData, unknown>["column"]["getIsPinned"]>
  ) => leafHeaders.filter((h) => h.column.getIsPinned() === p);

  const left = byPinned("left");
  const center = leafHeaders.filter((h) => !h.column.getIsPinned());
  const right = byPinned("right");

  const currentOrder: string[] = table.getState().columnOrder?.length
    ? (table.getState().columnOrder as string[])
    : table.getAllLeafColumns().map((c) => c.id);

  const visibleSet = new Set(table.getVisibleLeafColumns().map((c) => c.id));

  const reorderGroup = (
    group: "left" | "center" | "right",
    from: number,
    to: number
  ) => {
    // Current ids per group in this render
    const leftIds = left.map((h) => h.column.id);
    const centerIds = center.map((h) => h.column.id);
    const rightIds = right.map((h) => h.column.id);

    const newLeft = group === "left" ? arrayMove(leftIds, from, to) : leftIds;
    const newCenter =
      group === "center" ? arrayMove(centerIds, from, to) : centerIds;
    const newRight =
      group === "right" ? arrayMove(rightIds, from, to) : rightIds;

    // Append any ids from current order that are not in the visible groups (hidden columns)
    const groupAllVisible = new Set([...newLeft, ...newCenter, ...newRight]);
    const hiddenIds = currentOrder.filter((id) => !groupAllVisible.has(id));
    const next = [...newLeft, ...newCenter, ...newRight, ...hiddenIds];

    // Update table state
    table.setColumnOrder(next);

    // Persist immediately (defensive)
    const storageKey = (table.options as any)?.meta?.columnOrderStorageKey as
      | string
      | undefined;
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
  };

  const renderHeaderCell = (header: TanHeader<TData, unknown>) => {
    const columnMeta = header.column.columnDef.meta as
      | { headerClassName?: string }
      | undefined;
    const pinnedStyle = getPinnedCellStyles({
      column: header.column,
      zIndex: 40,
      withBorder: true,
    });
    const isPinned = header.column.getIsPinned();
    const colId = header.column.id;
    const isLocked = colId === "select" || colId === "name"; // no handle for select or name
    return (
      <TableHead
        key={header.id}
        colSpan={header.colSpan}
        data-pinned={isPinned || undefined}
        style={pinnedStyle}
        className={cn(
          "bg-inherit select-none",
          isPinned &&
            "relative isolate before:absolute before:inset-0 before:bg-background before:content-[''] before:pointer-events-none",
          columnMeta?.headerClassName
        )}
      >
        <div className="relative flex min-h-[2.75rem] w-full items-center bg-inherit gap-1">
          {!isLocked && (
            <SortableItemHandle
              aria-label="列をドラッグ"
              className="p-0.5 -ml-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="size-3.5" />
            </SortableItemHandle>
          )}
          <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        </div>
      </TableHead>
    );
  };

  // Helper to render a sortable section
  const renderSortable = (
    items: TanHeader<TData, unknown>[],
    group: "left" | "center" | "right"
  ) => {
    const ids = items
      .map((h) => h.column.id)
      .filter((id) => visibleSet.has(id));
    if (ids.length === 0) return items.map(renderHeaderCell);

    return (
      <Sortable
        withinContext
        value={ids}
        orientation="horizontal"
        // Custom onMove to compute full next column order
        onMove={({ activeIndex, overIndex }) => {
          reorderGroup(group, activeIndex, overIndex);
        }}
        // We don't need overlay here; TableHead provides visual feedback
      >
        <SortableContent withoutSlot>
          {/* We must output children in the same order as `ids` */}
          {ids.map((id) => {
            const h = items.find((hh) => hh.column.id === id)!;
            const isLocked = id === "select" || id === "name";
            return (
              <SortableItem key={id} value={id} asChild disabled={isLocked}>
                {renderHeaderCell(h)}
              </SortableItem>
            );
          })}
        </SortableContent>
      </Sortable>
    );
  };

  return (
    <UITableHeader>
      {/* Single header row with left, center, right segments */}
      <TableRow className="bg-background">
        {renderSortable(left, "left")}
        {renderSortable(center, "center")}
        {renderSortable(right, "right")}
      </TableRow>
    </UITableHeader>
  );
}
