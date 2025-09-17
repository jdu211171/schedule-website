import * as React from "react";
import { Check, ChevronsUpDown, Search, X, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectItem {
  value: string;
  label: string;
  description?: string;
  compatibilityType?: 'perfect' | 'subject-only' | 'teacher-only' | 'student-only' | 'no-preferences' | 'mismatch' | 'no-teacher-selected' | 'no-student-selected' | 'teacher-no-prefs' | 'student-no-prefs';
  matchingSubjectsCount?: number;
  partialMatchingSubjectsCount?: number;
  icon?: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: SearchableSelectItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  showCompatibilityIcons?: boolean;
  onSearchChange?: (value: string) => void;
}

const getCompatibilityIcon = (compatibilityType?: string) => {
  switch (compatibilityType) {
    case 'perfect':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'subject-only':
      return <AlertTriangle className="h-3 w-3 text-orange-500" />;
    case 'teacher-only':
      return <Users className="h-3 w-3 text-blue-500" />;
    case 'student-only':
      return <Users className="h-3 w-3 text-orange-500" />;
    case 'mismatch':
      return <AlertTriangle className="h-3 w-3 text-red-500" />;
    case 'teacher-no-prefs':
    case 'student-no-prefs':
      return <Users className="h-3 w-3 text-gray-400" />;
    default:
      return null;
  }
};

const getCompatibilityDescription = (item: SearchableSelectItem): string => {
  if (item.description) return item.description;

  switch (item.compatibilityType) {
    case 'perfect':
      return '完全一致';
    case 'subject-only':
      return '科目一致（レベル違い）';
    case 'teacher-only':
      return '講師のみ';
    case 'student-only':
      return '生徒のみ';
    case 'mismatch':
      return '共通設定なし';
    case 'teacher-no-prefs':
      return '講師の設定なし';
    case 'student-no-prefs':
      return '生徒の設定なし';
    case 'no-teacher-selected':
      return '講師未選択';
    case 'no-student-selected':
      return '生徒未選択';
    default:
      return '';
  }
};

const getItemPriority = (item: SearchableSelectItem): number => {
  // Higher priority = shown first
  switch (item.compatibilityType) {
    case 'perfect':
      return 5;
    case 'subject-only':
      return 4;
    case 'teacher-only':
    case 'student-only':
      return 3;
    case 'teacher-no-prefs':
    case 'student-no-prefs':
      return 2;
    case 'no-preferences':
      return 1;
    case 'mismatch':
      return 0;
    default:
      return -1;
  }
};

export function SearchableSelect({
  value,
  onValueChange,
  items,
  placeholder = "Выберите...",
  searchPlaceholder = "Поиск...",
  emptyMessage = "Не найдено",
  disabled = false,
  className = "",
  loading = false,
  showCompatibilityIcons = false,
  onSearchChange,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const handleSearchQueryUpdate = React.useCallback(
    (nextValue: string) => {
      setSearchQuery(nextValue);
      onSearchChange?.(nextValue);
    },
    [onSearchChange]
  );

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  );

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let filtered = items;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Sort by compatibility priority if showCompatibilityIcons is true
    if (showCompatibilityIcons) {
      filtered = filtered.sort((a, b) => {
        const priorityA = getItemPriority(a);
        const priorityB = getItemPriority(b);

        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }

        // If same priority, sort alphabetically
        return a.label.localeCompare(b.label);
      });
    }

    return filtered;
  }, [items, searchQuery, showCompatibilityIcons]);

  // Reset highlighted index when items change
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  // Handle outside clicks
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Focus input when opening
  React.useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      handleSearchQueryUpdate("");
      setHighlightedIndex(0);
    }
  }, [open, handleSearchQueryUpdate]);

  const handleSelect = (itemValue: string) => {
    onValueChange(itemValue);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key === 'Enter') {
      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
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
          !value && "text-muted-foreground",
          className
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 truncate">
          {showCompatibilityIcons && selectedItem && getCompatibilityIcon(selectedItem.compatibilityType)}
          <span className="truncate">
            {loading ? "..." : selectedItem ? selectedItem.label : placeholder}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{
            minWidth: containerRef.current?.offsetWidth,
          }}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchQueryUpdate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearchQueryUpdate("");
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
                  const isSelected = value === item.value;
                  const isHighlighted = highlightedIndex === index;
                  const compatibilityIcon = showCompatibilityIcons ? getCompatibilityIcon(item.compatibilityType) : null;
                  const compatibilityDescription = showCompatibilityIcons ? getCompatibilityDescription(item) : item.description;

                  return (
                    <div
                      key={item.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item.value);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                        // Hover state (только если не выбран)
                        !isSelected && isHighlighted && "bg-accent text-accent-foreground",
                        // Selected state (приоритетнее hover)
                        isSelected && "bg-primary/10 text-primary font-medium",
                        // Selected + highlighted state
                        isSelected && isHighlighted && "bg-primary/20 text-primary"
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          {compatibilityIcon}
                          <span>{item.label}</span>
                          {item.matchingSubjectsCount !== undefined && item.matchingSubjectsCount > 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                              {item.matchingSubjectsCount}
                            </span>
                          )}
                          {item.partialMatchingSubjectsCount !== undefined && item.partialMatchingSubjectsCount > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">
                              ±{item.partialMatchingSubjectsCount}
                            </span>
                          )}
                        </div>
                        {compatibilityDescription && (
                          <span className="text-xs text-muted-foreground">
                            {compatibilityDescription}
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
