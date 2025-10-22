"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import type { Table as ReactTable } from "@tanstack/react-table";
import * as React from "react";

import { Table as UI_Table } from "@/components/ui/table";

import { GenericTableBody } from "./generic-table-body-v0";
import { GenericTableHeader } from "./generic-table-header-v0";

interface GenericDraggableTableProps<TData> {
  table: ReactTable<TData>;
  dataIds: UniqueIdentifier[];
  onDragEnd: (event: DragEndEvent) => void;
  columnsLength: number;
}

export function GenericDraggableTable<TData>({
  table,
  dataIds,
  onDragEnd,
  columnsLength,
}: GenericDraggableTableProps<TData>) {
  const [isDragging, setIsDragging] = React.useState(false);
  const sortableId = React.useId();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    onDragEnd(event);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // Allow both vertical (body) and horizontal (header) drags within table bounds
      modifiers={[restrictToParentElement]}
    >
      <UI_Table>
        <GenericTableHeader table={table} />
        <GenericTableBody
          table={table}
          dataIds={dataIds}
          columnsLength={columnsLength}
          isDragging={isDragging}
          sortableId={sortableId}
        />
      </UI_Table>
    </DndContext>
  );
}
