// src/components/student/student-filter.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Student } from "@/hooks/useStudentQuery";
import type { Subject } from "@/hooks/useSubjectQuery";
import type { StudentType } from "@/hooks/useStudentTypeQuery";
import { userStatusLabels } from "@/schemas/student.schema";

interface StudentFilterProps {
  students?: Student[];
  subjects?: Subject[];
  studentTypes?: StudentType[];
  filters: {
    name: string;
    status: string[];
    studentType: string[];
    gradeYear: string[];
    branch: string[];
    subject: string[];
  };
  onFilterChange: (
    field: keyof StudentFilterProps["filters"],
    value: string | string[] | undefined
  ) => void;
  onResetFilters: () => void;
}

export function StudentFilter({
  subjects = [],
  studentTypes = [],
  filters,
  onFilterChange,
  onResetFilters,
}: StudentFilterProps) {
  const hasActiveFilters =
    filters.name ||
    filters.status.length > 0 ||
    filters.studentType.length > 0 ||
    filters.gradeYear.length > 0 ||
    filters.branch.length > 0 ||
    filters.subject.length > 0;

  // Status options
  const statusOptions = Object.entries(userStatusLabels).map(
    ([value, label]) => ({
      value,
      label,
    })
  );

  // Student type options
  const studentTypeOptions = studentTypes.map((type) => ({
    value: type.name,
    label: type.name,
  }));

  // Grade year options
  const gradeYearOptions = [1, 2, 3, 4, 5, 6].map((year) => ({
    value: year.toString(),
    label: `${year}年生`,
  }));

  // Subject options
  const subjectOptions = subjects.map((subject) => ({
    value: subject.name,
    label: subject.name,
  }));

  // Branch options (hardcoded for now - you might want to fetch these)
  const branchOptions = [
    { value: "本校", label: "本校" },
    { value: "分校", label: "分校" },
  ];

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Name filter */}
        <Input
          placeholder="名前で検索..."
          value={filters.name}
          onChange={(event) => onFilterChange("name", event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {/* Status filter */}
        <MultiSelectFilter
          title="ステータス"
          options={statusOptions}
          selectedValues={filters.status}
          onSelectionChange={(values) => onFilterChange("status", values)}
        />

        {/* Student Type filter */}
        <MultiSelectFilter
          title="生徒タイプ"
          options={studentTypeOptions}
          selectedValues={filters.studentType}
          onSelectionChange={(values) => onFilterChange("studentType", values)}
        />

        {/* Grade Year filter */}
        <MultiSelectFilter
          title="学年"
          options={gradeYearOptions}
          selectedValues={filters.gradeYear}
          onSelectionChange={(values) => onFilterChange("gradeYear", values)}
        />

        {/* Branch filter */}
        <MultiSelectFilter
          title="校舎"
          options={branchOptions}
          selectedValues={filters.branch}
          onSelectionChange={(values) => onFilterChange("branch", values)}
        />

        {/* Subject filter */}
        <MultiSelectFilter
          title="選択科目"
          options={subjectOptions}
          selectedValues={filters.subject}
          onSelectionChange={(values) => onFilterChange("subject", values)}
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onResetFilters}
            className="h-8 px-2 lg:px-3"
          >
            リセット
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface MultiSelectFilterProps {
  title: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
}

function MultiSelectFilter({
  title,
  options,
  selectedValues,
  onSelectionChange,
}: MultiSelectFilterProps) {
  const selectedSet = React.useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  );

  const toggleOption = (value: string) => {
    const newSelectedValues = selectedSet.has(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelectedValues);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          {title}
          {selectedValues.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.length}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.length > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.length} 選択済み
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedSet.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>結果が見つかりません。</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Checkbox checked={isSelected} className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={clearSelection}
                    className="justify-center text-center"
                  >
                    選択をクリア
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
