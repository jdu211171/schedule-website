"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";

interface ExceptionalAvailabilityCalendarProps {
  studentId: string;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

interface CalendarEvent {
  id: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
  fullDay?: boolean;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface AvailabilityResponse {
  data: Array<{
    id: string;
    userId: string;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    fullDay: boolean | null;
    type: string;
    status: string;
    reason: string | null;
    notes: string | null;
  }>;
}

export function ExceptionalAvailabilityCalendar({
  studentId,
  onDateSelect,
  selectedDate,
}: ExceptionalAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // Fetch exceptional availability data
  const { data: availabilityData, isLoading } = useQuery<AvailabilityResponse>({
    queryKey: ["user-availability", studentId, "EXCEPTION", year, month],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: studentId,
        type: "EXCEPTION",
        startDate: new Date(year, month, 1).toISOString().split("T")[0],
        endDate: new Date(year, month + 1, 0).toISOString().split("T")[0],
      });
      return await fetcher(`/api/user-availability?${params}`);
    },
    enabled: !!studentId,
  });

  // Generate calendar days
  const days = [];
  const current = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Navigate months
  function previousMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  // Get event for date
  function getEventForDate(date: Date): CalendarEvent | undefined {
    if (!availabilityData?.data) return undefined;

    const dateString = date.toISOString().split("T")[0];
    const availability = availabilityData.data.find(
      (item) => item.date === dateString
    );

    if (!availability) return undefined;

    return {
      id: availability.id,
      date: availability.date!,
      status: availability.status as "PENDING" | "APPROVED" | "REJECTED",
      reason: availability.reason || undefined,
      fullDay: availability.fullDay || undefined,
      startTime: availability.startTime || undefined,
      endTime: availability.endTime || undefined,
      notes: availability.notes || undefined,
    };
  }

  // Get status color
  function getStatusColor(status: string) {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 border-green-300 text-green-800";
      case "REJECTED":
        return "bg-red-100 border-red-300 text-red-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  }

  // Get availability icon
  function getAvailabilityIcon(event: CalendarEvent) {
    if (event.fullDay) {
      return <Clock className="h-3 w-3 text-green-600" />;
    }
    if (!event.startTime && !event.endTime) {
      return <AlertCircle className="h-3 w-3 text-red-600" />;
    }
    return <Clock className="h-3 w-3 text-blue-600" />;
  }

  // Check if date is today
  function isToday(date: Date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Check if date is selected
  function isSelected(date: Date) {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  }

  // Check if date is in current month
  function isCurrentMonth(date: Date) {
    return date.getMonth() === month;
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
          })}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></div>
          <span>保留中</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200 border border-green-300"></div>
          <span>承認済み</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300"></div>
          <span>拒否</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-green-600" />
          <span>終日利用可能</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-red-600" />
          <span>利用不可</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((day, index) => {
          const event = getEventForDate(day);
          const isCurrentMonthDay = isCurrentMonth(day);
          const isTodayDay = isToday(day);
          const isSelectedDay = isSelected(day);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              disabled={isLoading}
              className={cn(
                "h-14 p-1 text-sm border rounded-md transition-colors relative",
                "hover:bg-accent hover:text-accent-foreground",
                isCurrentMonthDay ? "text-foreground" : "text-muted-foreground",
                isTodayDay && "ring-2 ring-primary ring-offset-1",
                isSelectedDay && "bg-primary text-primary-foreground",
                !isCurrentMonthDay && "opacity-50",
                isLoading && "cursor-wait"
              )}
            >
              <div className="flex flex-col h-full">
                <span className="text-xs font-medium">{day.getDate()}</span>
                {event && (
                  <div
                    className={cn(
                      "flex-1 mt-1 rounded text-[10px] px-1 border flex items-center gap-1",
                      getStatusColor(event.status)
                    )}
                  >
                    {getAvailabilityIcon(event)}
                    <div className="truncate flex-1" title={event.reason}>
                      {event.reason}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium">
              選択された日付:{" "}
              {selectedDate.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
          </div>

          {(() => {
            const event = getEventForDate(selectedDate);
            if (event) {
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusColor(event.status)}
                    >
                      {event.status === "PENDING" && "保留中"}
                      {event.status === "APPROVED" && "承認済み"}
                      {event.status === "REJECTED" && "拒否"}
                    </Badge>
                    <span className="text-sm font-medium">{event.reason}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getAvailabilityIcon(event)}
                    <span>
                      {event.fullDay && "終日利用可能"}
                      {!event.fullDay &&
                        !event.startTime &&
                        !event.endTime &&
                        "利用不可"}
                      {!event.fullDay &&
                        event.startTime &&
                        event.endTime &&
                        `${event.startTime} - ${event.endTime}`}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      備考: {event.notes}
                    </p>
                  )}
                </div>
              );
            } else {
              return (
                <p className="text-sm text-muted-foreground">
                  この日付には例外的な利用可能時間が設定されていません
                </p>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}
