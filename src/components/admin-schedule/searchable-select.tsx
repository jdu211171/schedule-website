import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectItem {
  value: string;
  label: string;
  description?: string;
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
}

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
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  );
  
  // Фильтрация элементов по поисковому запросу
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    return items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);
  
  // Обработчик выбора элемента
  const handleSelect = React.useCallback((itemValue: string) => {
    onValueChange(itemValue);
    setOpen(false);
    setSearchQuery("");
  }, [onValueChange]);
  
  // Фокус на поле поиска при открытии
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between transition-all duration-200",
            "hover:bg-accent hover:text-accent-foreground",
            "active:scale-[0.98]",
            className
          )}
        >
          {loading ? (
            "Загрузка..."
          ) : selectedItem ? (
            selectedItem.label
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <div style={{ position: "relative", zIndex: 9999 }}>
        <PopoverContent 
          className="p-0 w-full" 
          align="start"
          sideOffset={5}
          style={{ position: "relative", zIndex: 9999, pointerEvents: "auto" }}
        >
          <div className="border-b px-3 py-2 flex gap-2 items-center">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              className="flex flex-1 bg-transparent border-0 outline-none placeholder:text-muted-foreground"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                // Предотвращаем закрытие выпадающего списка при нажатии на Enter
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Выбираем первый элемент из отфильтрованного списка при нажатии Enter
                  if (filteredItems.length > 0) {
                    handleSelect(filteredItems[0].value);
                  }
                }
              }}
            />
            {searchQuery && (
              <button
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
          <div className="max-h-[300px] overflow-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.value}
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground",
                    "transition-colors",
                    value === item.value && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </div>
                  {value === item.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}