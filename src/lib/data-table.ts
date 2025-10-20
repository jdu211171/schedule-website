import type {
  ExtendedColumnFilter,
  FilterOperator,
  FilterVariant,
} from "@/types/data-table";
import type { Column } from "@tanstack/react-table";

import { dataTableConfig } from "@/config/data-table";

const PINNED_BACKGROUND = "hsl(var(--background))";
const PINNED_BORDER = "hsl(var(--border))";

interface PinnedStyleOptions<TData> {
  column: Column<TData>;
  zIndex?: number;
  withBorder?: boolean;
}

export function getPinnedCellStyles<TData>({
  column,
  zIndex = 20,
  withBorder = false,
}: PinnedStyleOptions<TData>): React.CSSProperties {
  const size = column.getSize();
  const isPinned = column.getIsPinned();

  const base: React.CSSProperties = {
    width: size,
    minWidth: size,
  };

  if (!isPinned) {
    return base;
  }

  const offset =
    isPinned === "left" ? column.getStart("left") : column.getAfter("right");
  const isEdgeLeft = isPinned === "left" && column.getIsLastColumn("left");
  const isEdgeRight = isPinned === "right" && column.getIsFirstColumn("right");

  return {
    ...base,
    position: "sticky",
    [isPinned]: `${offset ?? 0}px`,
    zIndex,
    backgroundColor: PINNED_BACKGROUND,
    background: PINNED_BACKGROUND,
    borderRight:
      withBorder && isEdgeLeft ? `1px solid ${PINNED_BORDER}` : undefined,
    borderLeft:
      withBorder && isEdgeRight ? `1px solid ${PINNED_BORDER}` : undefined,
    boxShadow:
      withBorder && isEdgeLeft
        ? "4px 0 8px -6px rgba(15, 23, 42, 0.35)"
        : withBorder && isEdgeRight
          ? "-4px 0 8px -6px rgba(15, 23, 42, 0.35)"
          : undefined,
    backgroundClip: "padding-box",
  };
}

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<
    FilterVariant,
    { label: string; value: FilterOperator }[]
  > = {
    text: dataTableConfig.textOperators,
    number: dataTableConfig.numericOperators,
    range: dataTableConfig.numericOperators,
    date: dataTableConfig.dateOperators,
    dateRange: dataTableConfig.dateOperators,
    yearRange: dataTableConfig.dateOperators,
    boolean: dataTableConfig.booleanOperators,
    select: dataTableConfig.selectOperators,
    multiSelect: dataTableConfig.multiSelectOperators,
  };

  return operatorMap[filterVariant] ?? dataTableConfig.textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant);

  return operators[0]?.value ?? (filterVariant === "text" ? "iLike" : "eq");
}

export function getValidFilters<TData>(
  filters: ExtendedColumnFilter<TData>[]
): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    (filter) =>
      filter.operator === "isEmpty" ||
      filter.operator === "isNotEmpty" ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== "" &&
          filter.value !== null &&
          filter.value !== undefined)
  );
}
