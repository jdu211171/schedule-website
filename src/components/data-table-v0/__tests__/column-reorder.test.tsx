/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsAdapter } from "nuqs/adapters/react";

import { useStateDataTable } from "@/hooks/use-state-data-table";
import { GenericDraggableTable } from "@/components/data-table-v0/generic-draggable-table-v0";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";

type Row = { id: string; firstName: string; lastName: string; age: number };

function TestTable({ storageKey }: { storageKey: string }) {
  const data: Row[] = [
    { id: "1", firstName: "Taro", lastName: "Yamada", age: 16 },
  ];
  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      { id: "firstName", accessorKey: "firstName", header: "First" },
      { id: "lastName", accessorKey: "lastName", header: "Last" },
      { id: "age", accessorKey: "age", header: "Age" },
    ],
    [],
  );

  const { table } = useStateDataTable<Row>({
    data,
    columns,
    pageCount: 1,
    columnOrderStorageKey: storageKey,
    getRowId: (r) => r.id,
  });

  return (
    <div>
      <DataTableViewOptions table={table} />
      <div className="rounded-md border">
        <GenericDraggableTable
          table={table}
          dataIds={data.map((d) => d.id)}
          onDragEnd={() => {}}
          columnsLength={columns.length}
        />
      </div>
    </div>
  );
}

function getHeaderTexts() {
  const table = screen.getByRole("table");
  const header = within(table).getAllByRole("rowgroup")[0]!;
  return within(header)
    .getAllByRole("columnheader")
    .map((el) => el.textContent?.trim());
}

describe("Column reorder integration", () => {
  const KEY = "vitest.table.order";

beforeEach(() => {
  // Reset storage
  (globalThis as any).localStorage?.removeItem(KEY);
  // Minimal ResizeObserver polyfill for jsdom
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // Minimal scrollIntoView polyfill
  (Element.prototype as any).scrollIntoView = () => {};
});

  it("applies persisted order on mount and can reset via view options", async () => {
    const user = userEvent.setup();

    // Persist a custom order: age, first, last
    (globalThis as any).localStorage?.setItem(
      KEY,
      JSON.stringify(["age", "firstName", "lastName"]),
    );

    render(
      <NuqsAdapter>
        <TestTable storageKey={KEY} />
      </NuqsAdapter>,
    );

    // Expect headers reflect persisted order
    expect(getHeaderTexts()).toEqual(["Age", "First", "Last"]);

    // Open view options and reset order
    await user.click(screen.getByRole("combobox", { name: /Toggle columns/i }));
    await user.click(screen.getByText("列順序をリセット"));

    // Expect default order restored
    expect(getHeaderTexts()).toEqual(["First", "Last", "Age"]);

    // Storage cleared
    expect((globalThis as any).localStorage?.getItem(KEY)).toBeNull();
  });
});
