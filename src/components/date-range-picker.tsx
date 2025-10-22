"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  dateRange: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  label?: string;
  className?: string;
};

export function DateRangePicker({
  dateRange,
  onChange,
  label,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between min-h-10",
              !dateRange?.from && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CalendarIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MM/dd")} -{" "}
                      {format(dateRange.to, "MM/dd")}
                    </>
                  ) : (
                    format(dateRange.from, "MM/dd")
                  )
                ) : (
                  "日付の範囲を選択"
                )}
              </span>
            </div>
            {dateRange?.from && (
              <X
                className="h-4 w-4 opacity-70 hover:opacity-100 flex-shrink-0"
                onClick={handleClearClick}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onChange}
            numberOfMonths={2}
            className="rounded-md border"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
