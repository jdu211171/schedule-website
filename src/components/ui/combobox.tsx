"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ComboboxItemBase {
  value: string;
  label: React.ReactNode;
  keywords?: string[];
  disabled?: boolean;
}

export interface ComboboxRenderItemProps<T extends ComboboxItemBase> {
  item: T;
  isSelected: boolean;
  defaultIndicator: React.ReactNode;
}

export interface ComboboxProps<T extends ComboboxItemBase> {
  items: T[];
  value?: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  triggerClassName?: string;
  popoverContentClassName?: string;
  renderItem?: (props: ComboboxRenderItemProps<T>) => React.ReactNode;
  renderSelectedValue?: (item: T | undefined) => React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  closeOnSelect?: boolean;
  autoFocusSearch?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  popoverModal?: boolean;
  popoverContentProps?: React.ComponentProps<typeof PopoverContent>;
  usePortal?: boolean;
  portalContainer?: HTMLElement | null;
}

const DEFAULT_PLACEHOLDER = "選択してください...";
const DEFAULT_SEARCH_PLACEHOLDER = "検索...";
const DEFAULT_EMPTY_MESSAGE = "該当する項目がありません";
const DEFAULT_LOADING_MESSAGE = "検索中...";

export function Combobox<T extends ComboboxItemBase>({
  items,
  value = null,
  onValueChange,
  placeholder = DEFAULT_PLACEHOLDER,
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  loadingMessage = DEFAULT_LOADING_MESSAGE,
  disabled = false,
  clearable = false,
  triggerClassName,
  popoverContentClassName,
  renderItem,
  renderSelectedValue,
  searchValue,
  onSearchChange,
  closeOnSelect = true,
  autoFocusSearch = true,
  loading = false,
  ariaLabel,
  open,
  onOpenChange,
  popoverModal = false,
  popoverContentProps,
  usePortal = false,
  portalContainer,
}: ComboboxProps<T>) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpenControlled = open !== undefined;
  const currentOpen = isOpenControlled ? open : internalOpen;

  const [internalSearch, setInternalSearch] = React.useState("");
  const isSearchControlled = searchValue !== undefined;
  const currentSearchValue = isSearchControlled ? searchValue : internalSearch;

  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === (value ?? "")),
    [items, value]
  );

  const indicatorFor = React.useCallback(
    (isSelected: boolean) => (
      <Check
        className={cn(
          "ml-auto h-4 w-4 text-primary",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
    ),
    []
  );

  const handleSelect = React.useCallback(
    (nextValue: string) => {
      const resolvedValue = clearable && nextValue === value ? "" : nextValue;
      onValueChange(resolvedValue);
      if (closeOnSelect) {
        if (!isOpenControlled) {
          setInternalOpen(false);
        }
        onOpenChange?.(false);
      }
    },
    [clearable, closeOnSelect, isOpenControlled, onOpenChange, onValueChange, value]
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isOpenControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isOpenControlled, onOpenChange]
  );

  const handleSearchChange = React.useCallback(
    (next: string) => {
      if (!isSearchControlled) {
        setInternalSearch(next);
      }
      onSearchChange?.(next);
    },
    [isSearchControlled, onSearchChange]
  );

  React.useEffect(() => {
    if (!currentOpen && !isSearchControlled) {
      setInternalSearch("");
    }
  }, [currentOpen, isSearchControlled]);

  const displayValue = renderSelectedValue
    ? renderSelectedValue(selectedItem)
    : selectedItem?.label ?? placeholder;

  return (
    <Popover open={currentOpen} onOpenChange={handleOpenChange} modal={popoverModal}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={currentOpen}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedItem && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate text-left flex-1">
            {displayValue}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        disablePortal={!usePortal}
        container={portalContainer ?? undefined}
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width, 220px)] p-0",
          popoverContentClassName
        )}
        {...popoverContentProps}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={currentSearchValue}
            onValueChange={handleSearchChange}
            autoFocus={autoFocusSearch}
            className="h-9"
          />
          <ScrollArea className="max-h-60">
            <CommandList className="max-h-60">
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {loadingMessage}
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => {
                      const isSelected = item.value === (value ?? "");
                      const defaultIndicator = indicatorFor(isSelected);

                      return (
                        <CommandItem
                          key={item.value}
                          value={item.value}
                          keywords={item.keywords}
                          disabled={item.disabled}
                          onSelect={(currentValue) => handleSelect(currentValue)}
                        >
                          {renderItem
                            ? renderItem({
                                item,
                                isSelected,
                                defaultIndicator,
                              })
                            : (
                                <>
                                  <span className="flex-1 truncate">
                                    {item.label}
                                  </span>
                                  {defaultIndicator}
                                </>
                              )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ComboboxDemo() {
  const [value, setValue] = React.useState("");

  const items: ComboboxItemBase[] = [
    { value: "next.js", label: "Next.js" },
    { value: "sveltekit", label: "SvelteKit" },
    { value: "nuxt.js", label: "Nuxt.js" },
    { value: "remix", label: "Remix" },
    { value: "astro", label: "Astro" },
  ];

  return (
    <div className="w-[240px]">
      <Combobox
        items={items}
        value={value}
        onValueChange={setValue}
        placeholder="Select framework..."
        searchPlaceholder="Search framework..."
        emptyMessage="No framework found."
        clearable
      />
    </div>
  );
}

export type { ComboboxItemBase as ComboboxItem };
