"use client";

import { SearchIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchableColumns?: string[];
  onSearch?: (query: string, columns?: string[]) => void;
}

export function TableSearch({
  value,
  onChange,
  placeholder = "検索...",
  searchableColumns,
  onSearch,
}: TableSearchProps) {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSearch = React.useCallback(() => {
    onChange(localValue);
    onSearch?.(localValue, searchableColumns);
  }, [localValue, onChange, onSearch, searchableColumns]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    onSearch?.("", searchableColumns);
  };

  return (
    <div className="relative flex items-center">
      <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSearch}
        className="pl-9 pr-9"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 h-6 w-6"
          onClick={handleClear}
        >
          <XIcon className="h-3 w-3" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
