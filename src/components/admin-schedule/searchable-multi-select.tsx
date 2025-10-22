import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SearchableMultiSelectItem {
  value: string;
  label: string;
  description?: string;
}

interface SearchableMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  items: SearchableMultiSelectItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  defaultValues?: string[]; // Values that cannot be removed
  renderSelectedBadge?: (
    item: SearchableMultiSelectItem,
    isDefault: boolean,
    onRemove?: () => void
  ) => React.ReactNode;
}

export function SearchableMultiSelect({
  value,
  onValueChange,
  items,
  placeholder = "選択してください...",
  searchPlaceholder = "検索...",
  emptyMessage = "見つかりません",
  disabled = false,
  className = "",
  loading = false,
  defaultValues = [],
  renderSelectedBadge,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  // Filter items
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  // Reset highlighted index when items change, but only if current index is out of bounds
  React.useEffect(() => {
    if (filteredItems.length > 0 && highlightedIndex >= filteredItems.length) {
      setHighlightedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, highlightedIndex]);

  // Handle outside clicks
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Focus input when opening and reset when closing
  React.useEffect(() => {
    if (open && inputRef.current) {
      // Use a small timeout to ensure the dropdown is rendered before focusing
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    } else if (!open) {
      // Only reset search when closing, don't reset highlight
      setSearchQuery("");
    }
  }, [open]);

  const handleSelect = (itemValue: string) => {
    const newValue = value.includes(itemValue)
      ? value.filter((v) => v !== itemValue)
      : [...value, itemValue];
    onValueChange(newValue);
    // Keep the dropdown open and maintain search state for better UX
    // Don't reset search query immediately to prevent flickering
  };

  const handleRemove = (itemValue: string) => {
    if (defaultValues.includes(itemValue)) {
      return; // Cannot remove default values
    }
    const newValue = value.filter((v) => v !== itemValue);
    onValueChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key === "Enter") {
      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  const selectedItems = value
    .map((val) => items.find((item) => item.value === val))
    .filter(Boolean) as SearchableMultiSelectItem[];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Items Display */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedItems.map((item) => {
            const isDefault = defaultValues.includes(item.value);

            if (renderSelectedBadge) {
              return renderSelectedBadge(
                item,
                isDefault,
                isDefault ? undefined : () => handleRemove(item.value)
              );
            }

            return (
              <Badge
                key={item.value}
                variant={isDefault ? "default" : "secondary"}
                className="flex items-center gap-1 px-3 py-1"
              >
                <span>{item.label}</span>
                {isDefault && <span className="text-xs">(デフォルト)</span>}
                {!isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                    onClick={() => handleRemove(item.value)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setOpen(!open)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          selectedItems.length === 0 && "text-muted-foreground",
          className
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">
          {loading
            ? "..."
            : selectedItems.length > 0
              ? `${selectedItems.length}個選択済み`
              : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                  inputRef.current?.focus();
                }}
                className="ml-2 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Items List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="p-1">
                {filteredItems.map((item, index) => {
                  const isSelected = value.includes(item.value);
                  const isHighlighted = highlightedIndex === index;
                  const isDefault = defaultValues.includes(item.value);

                  return (
                    <div
                      key={item.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item.value);
                      }}
                      onMouseEnter={() => {
                        // Only update highlighted index if it's different to avoid unnecessary state updates
                        if (highlightedIndex !== index) {
                          setHighlightedIndex(index);
                        }
                      }}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                        // Hover state (только если не выбран)
                        !isSelected &&
                          isHighlighted &&
                          "bg-accent text-accent-foreground",
                        // Selected state (приоритетнее hover)
                        isSelected && "bg-primary/10 text-primary font-medium",
                        // Selected + highlighted state
                        isSelected &&
                          isHighlighted &&
                          "bg-primary/20 text-primary"
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <span>{item.label}</span>
                          {isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              デフォルト
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="ml-2 h-4 w-4 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
