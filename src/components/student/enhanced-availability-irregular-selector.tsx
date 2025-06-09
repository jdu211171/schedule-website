"use client";

import { useState, useEffect } from "react";
import { Plus, X, Clock, RotateCcw, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "../date-picker";
import { DateRangePicker } from "../date-range-picker";
import { DateRange } from "react-day-picker";
import { TimePresetSelector } from "../TimePresetSelector";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface IrregularAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  fullDay: boolean;
}

interface WeekdayPattern {
  dayOfWeek:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  timeSlots: TimeSlot[];
  fullDay: boolean;
}

interface EnhancedAvailabilitySelectorProps {
  availability: IrregularAvailability[];
  onChange: (availability: IrregularAvailability[]) => void;
}

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "月曜日", short: "月" },
  { value: "TUESDAY", label: "火曜日", short: "火" },
  { value: "WEDNESDAY", label: "水曜日", short: "水" },
  { value: "THURSDAY", label: "木曜日", short: "木" },
  { value: "FRIDAY", label: "金曜日", short: "金" },
  { value: "SATURDAY", label: "土曜日", short: "土" },
  { value: "SUNDAY", label: "日曜日", short: "日" },
] as const;

export function EnhancedAvailabilityIrregularSelector({
  availability,
  onChange,
}: EnhancedAvailabilitySelectorProps) {
  // Mode selection: "date" for individual dates, "pattern" for date range + weekday patterns
  const [selectionMode, setSelectionMode] = useState<"date" | "pattern">(
    "date"
  );

  // Individual date mode states
  const [selectedDateRange, setSelectedDateRange] = useState<
    DateRange | undefined
  >(undefined);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [useDateRange, setUseDateRange] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Pattern mode states
  const [patternDateRange, setPatternDateRange] = useState<
    DateRange | undefined
  >(undefined);
  const [weekdayPatterns, setWeekdayPatterns] = useState<
    Map<string, WeekdayPattern>
  >(new Map());
  const [currentWeekday, setCurrentWeekday] = useState<string>("");

  // Load persistent time values from local storage on mount
  useEffect(() => {
    const savedStartTime = localStorage.getItem("irregularAvailabilityStartTime");
    const savedEndTime = localStorage.getItem("irregularAvailabilityEndTime");

    if (savedStartTime) {
      setStartTime(savedStartTime);
    }
    if (savedEndTime) {
      setEndTime(savedEndTime);
    }
  }, []);

  // Save time values to local storage when they change
  useEffect(() => {
    localStorage.setItem("irregularAvailabilityStartTime", startTime);
  }, [startTime]);

  useEffect(() => {
    localStorage.setItem("irregularAvailabilityEndTime", endTime);
  }, [endTime]);

  // Helper function to get all dates in a range
  function getDatesInRange(dateRange: DateRange): Date[] {
    if (!dateRange.from) return [];

    const dates: Date[] = [];
    const startDate = new Date(dateRange.from);
    const endDate = dateRange.to ? new Date(dateRange.to) : startDate;

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(new Date(d));
    }

    return dates;
  }

  // Helper function to get weekday name from date
  function getWeekdayFromDate(date: Date): string {
    const weekdayNames = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    return weekdayNames[date.getDay()];
  }

  // Get availability for a specific day
  function getDateAvailability(date: Date): IrregularAvailability | undefined {
    return availability.find(
      (item) => item.date.toDateString() === date.toDateString()
    );
  }

  // Check for overlaps in the current selection
  function checkForOverlap(start: string, end: string): boolean {
    if (start >= end) return false;

    const datesToCheck: Date[] = [];

    if (useDateRange && selectedDateRange?.from) {
      datesToCheck.push(...getDatesInRange(selectedDateRange));
    } else if (!useDateRange && selectedDate) {
      datesToCheck.push(selectedDate);
    }

    if (datesToCheck.length === 0) return false;

    return datesToCheck.some((date) => {
      const dayAvailability = getDateAvailability(date);
      if (!dayAvailability || dayAvailability.fullDay) return false;

      return dayAvailability.timeSlots.some((slot) => {
        return start < slot.endTime && end > slot.startTime;
      });
    });
  }

  // Check for overlaps in weekday patterns
  function checkForWeekdayOverlap(weekday: string, start: string, end: string): boolean {
    if (!weekday || start >= end) return false;

    const currentPattern = weekdayPatterns.get(weekday);
    if (!currentPattern || currentPattern.fullDay) return false;

    return currentPattern.timeSlots.some((slot) => {
      return start < slot.endTime && end > slot.startTime;
    });
  }

  // Get weekday pattern
  function getWeekdayPattern(dayOfWeek: string): WeekdayPattern | undefined {
    return weekdayPatterns.get(dayOfWeek);
  }

  // Add new time slot to a day or date range (individual date mode)
  function addTimeSlot() {
    if (startTime >= endTime) return;

    const datesToProcess: Date[] = [];

    if (useDateRange && selectedDateRange?.from) {
      datesToProcess.push(...getDatesInRange(selectedDateRange));
    } else if (!useDateRange && selectedDate) {
      datesToProcess.push(selectedDate);
    }

    if (datesToProcess.length === 0) return;

    // Check for overlaps with existing slots for each date
    for (const date of datesToProcess) {
      const dayAvailability = getDateAvailability(date);
      if (dayAvailability && !dayAvailability.fullDay) {
        const existingSlots = dayAvailability.timeSlots;
        const hasOverlap = existingSlots.some((slot) => {
          return startTime < slot.endTime && endTime > slot.startTime;
        });

        if (hasOverlap) {
          alert(
            `選択した時間帯は${date.toLocaleDateString()}の既存の時間帯と重複しています`
          );
          return;
        }
      }
    }

    // Create updated availability for all dates
    const updatedAvailability = [...availability];

    datesToProcess.forEach((date) => {
      const existingIndex = updatedAvailability.findIndex(
        (item) => item.date.toDateString() === date.toDateString()
      );

      const newSlotForDate: TimeSlot = {
        id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime,
        endTime,
      };

      if (existingIndex >= 0) {
        // Add to existing day
        updatedAvailability[existingIndex] = {
          ...updatedAvailability[existingIndex],
          timeSlots: [
            ...updatedAvailability[existingIndex].timeSlots,
            newSlotForDate,
          ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
          fullDay: false,
        };
      } else {
        // Create new day availability
        updatedAvailability.push({
          date: new Date(date),
          timeSlots: [newSlotForDate],
          fullDay: false,
        });
      }
    });

    onChange(updatedAvailability);

    // Remove the static time reset - keep user's preferred times persistent
    // Keep date picker values so users can add multiple time slots to the same day
  }

  // Add time slot to weekday pattern
  function addWeekdayTimeSlot() {
    if (!currentWeekday || startTime >= endTime) return;

    const currentPattern = weekdayPatterns.get(currentWeekday);
    const existingSlots = currentPattern?.timeSlots || [];

    // Check for overlaps
    const hasOverlap = existingSlots.some((slot) => {
      return startTime < slot.endTime && endTime > slot.startTime;
    });

    if (hasOverlap) {
      alert("選択した時間帯は既存の時間帯と重複しています");
      return;
    }

    const newSlot: TimeSlot = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime,
      endTime,
    };

    const updatedPattern: WeekdayPattern = {
      dayOfWeek: currentWeekday as WeekdayPattern["dayOfWeek"],
      timeSlots: [...existingSlots, newSlot].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      ),
      fullDay: false,
    };

    const newPatterns = new Map(weekdayPatterns);
    newPatterns.set(currentWeekday, updatedPattern);
    setWeekdayPatterns(newPatterns);

    // Remove the static time reset - keep user's preferred times persistent
  }

  // Remove time slot from weekday pattern
  function removeWeekdayTimeSlot(dayOfWeek: string, slotId: string) {
    const currentPattern = weekdayPatterns.get(dayOfWeek);
    if (!currentPattern) return;

    const updatedSlots = currentPattern.timeSlots.filter(
      (slot) => slot.id !== slotId
    );

    if (updatedSlots.length === 0 && !currentPattern.fullDay) {
      // Remove the entire pattern if no slots and not full day
      const newPatterns = new Map(weekdayPatterns);
      newPatterns.delete(dayOfWeek);
      setWeekdayPatterns(newPatterns);
    } else {
      const updatedPattern: WeekdayPattern = {
        ...currentPattern,
        timeSlots: updatedSlots,
      };

      const newPatterns = new Map(weekdayPatterns);
      newPatterns.set(dayOfWeek, updatedPattern);
      setWeekdayPatterns(newPatterns);
    }
  }

  // Toggle full day for weekday pattern
  function toggleWeekdayFullDay(dayOfWeek: string) {
    const currentPattern = weekdayPatterns.get(dayOfWeek);

    if (currentPattern?.fullDay) {
      // Remove full day pattern
      const newPatterns = new Map(weekdayPatterns);
      newPatterns.delete(dayOfWeek);
      setWeekdayPatterns(newPatterns);
    } else {
      // Set to full day
      const updatedPattern: WeekdayPattern = {
        dayOfWeek: dayOfWeek as WeekdayPattern["dayOfWeek"],
        timeSlots: [],
        fullDay: true,
      };

      const newPatterns = new Map(weekdayPatterns);
      newPatterns.set(dayOfWeek, updatedPattern);
      setWeekdayPatterns(newPatterns);
    }
  }

  // Apply weekday patterns to date range
  function applyPatternsToRange() {
    if (!patternDateRange?.from || weekdayPatterns.size === 0) return;

    const allDates = getDatesInRange(patternDateRange);
    const updatedAvailability = [...availability];

    allDates.forEach((date) => {
      const weekday = getWeekdayFromDate(date);
      const pattern = weekdayPatterns.get(weekday);

      if (pattern) {
        // Check if this date already exists in availability
        const existingIndex = updatedAvailability.findIndex(
          (item) => item.date.toDateString() === date.toDateString()
        );

        const dateAvailability: IrregularAvailability = {
          date: new Date(date),
          timeSlots: pattern.timeSlots.map((slot) => ({
            ...slot,
            id: `applied-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          })),
          fullDay: pattern.fullDay,
        };

        if (existingIndex >= 0) {
          // Check for overlaps
          const existingSlots = updatedAvailability[existingIndex].timeSlots;
          const hasOverlap = dateAvailability.timeSlots.some((newSlot) =>
            existingSlots.some(
              (existingSlot) =>
                newSlot.startTime < existingSlot.endTime &&
                newSlot.endTime > existingSlot.startTime
            )
          );

          if (hasOverlap) {
            alert(`${date.toLocaleDateString()}で時間帯の重複があります`);
            return;
          }

          // Merge with existing
          updatedAvailability[existingIndex] = {
            ...updatedAvailability[existingIndex],
            timeSlots: [...existingSlots, ...dateAvailability.timeSlots].sort(
              (a, b) => a.startTime.localeCompare(b.startTime)
            ),
            fullDay:
              dateAvailability.fullDay ||
              updatedAvailability[existingIndex].fullDay,
          };
        } else {
          updatedAvailability.push(dateAvailability);
        }
      }
    });

    onChange(updatedAvailability);

    // Reset pattern mode
    setPatternDateRange(undefined);
    setWeekdayPatterns(new Map());
    setCurrentWeekday("");
  }

  // Remove a specific time slot
  function removeTimeSlot(date: Date, slotId: string) {
    const updatedAvailability = availability
      .map((item) => {
        if (item.date.toDateString() === date.toDateString()) {
          const updatedTimeSlots = item.timeSlots.filter(
            (slot) => slot.id !== slotId
          );
          return {
            ...item,
            timeSlots: updatedTimeSlots,
          };
        }
        return item;
      })
      .filter((item) => item.timeSlots.length > 0 || item.fullDay);

    onChange(updatedAvailability);
  }

  // Remove entire date availability (including full day)
  function removeDateAvailability(date: Date) {
    const updatedAvailability = availability.filter(
      (item) => item.date.toDateString() !== date.toDateString()
    );

    onChange(updatedAvailability);
  }

  // Apply time preset
  function applyPreset(preset: { label: string; start: string; end: string }) {
    setStartTime(preset.start);
    setEndTime(preset.end);
  }

  // Clear all availability
  function clearAll() {
    onChange([]);
  }

  // Count affected dates in pattern mode
  function getAffectedDatesCount(): number {
    if (!patternDateRange?.from || weekdayPatterns.size === 0) return 0;

    const allDates = getDatesInRange(patternDateRange);
    return allDates.filter((date) => {
      const weekday = getWeekdayFromDate(date);
      return weekdayPatterns.has(weekday);
    }).length;
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4" />
              <Label className="text-sm font-medium">入力モード選択</Label>
            </div>

            <div className="flex items-center gap-6 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="date-mode"
                  name="selection-mode"
                  checked={selectionMode === "date"}
                  onChange={() => setSelectionMode("date")}
                  className="h-4 w-4"
                />
                <Label htmlFor="date-mode" className="text-sm cursor-pointer">
                  個別日付指定
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="pattern-mode"
                  name="selection-mode"
                  checked={selectionMode === "pattern"}
                  onChange={() => setSelectionMode("pattern")}
                  className="h-4 w-4"
                />
                <Label
                  htmlFor="pattern-mode"
                  className="text-sm cursor-pointer"
                >
                  期間×曜日パターン指定
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Date Mode */}
      {selectionMode === "date" && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label className="text-sm font-medium">
                  新しい時間帯を追加
                </Label>
              </div>

              {/* Date Selection Mode Toggle */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <Label className="text-sm">選択モード:</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="single-date"
                    name="date-mode"
                    checked={!useDateRange}
                    onChange={() => {
                      setUseDateRange(false);
                      setSelectedDateRange(undefined);
                    }}
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor="single-date"
                    className="text-sm cursor-pointer"
                  >
                    単一日付
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="date-range"
                    name="date-mode"
                    checked={useDateRange}
                    onChange={() => {
                      setUseDateRange(true);
                      setSelectedDate(undefined);
                    }}
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor="date-range"
                    className="text-sm cursor-pointer"
                  >
                    日付範囲
                  </Label>
                </div>
              </div>

              {/* Day Selection */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">
                    {useDateRange ? "日付範囲" : "日付"}
                  </Label>
                  {useDateRange ? (
                    <DateRangePicker
                      dateRange={selectedDateRange}
                      onChange={setSelectedDateRange}
                      label=""
                    />
                  ) : (
                    <DatePicker
                      onChange={setSelectedDate}
                      value={selectedDate}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">開始時間</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">終了時間</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">操作</Label>
                  <Button
                    type="button"
                    onClick={addTimeSlot}
                    disabled={
                      (!useDateRange && !selectedDate) ||
                      (useDateRange && !selectedDateRange?.from) ||
                      startTime >= endTime ||
                      checkForOverlap(startTime, endTime)
                    }
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {useDateRange &&
                    selectedDateRange?.from &&
                    selectedDateRange?.to
                      ? `範囲内の${
                          getDatesInRange(selectedDateRange).length
                        }日に追加`
                      : "追加"}
                  </Button>
                </div>
              </div>

              {/* Time Presets */}
              <TimePresetSelector onPresetSelect={applyPreset} />

              {/* Info for date range mode */}
              {useDateRange && selectedDateRange?.from && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>日付範囲モード:</strong>{" "}
                    {selectedDateRange?.to
                      ? `${selectedDateRange.from.toLocaleDateString()} から ${selectedDateRange.to.toLocaleDateString()} まで（${
                          getDatesInRange(selectedDateRange).length
                        }日間）`
                      : selectedDateRange.from.toLocaleDateString()}
                    に同じ時間帯が追加されます。
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Mode */}
      {selectionMode === "pattern" && (
        <div className="space-y-4">
          {/* Date Range Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Label className="text-sm font-medium">対象期間を選択</Label>
                </div>

                <DateRangePicker
                  dateRange={patternDateRange}
                  onChange={setPatternDateRange}
                  label=""
                />

                {patternDateRange?.from && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      期間: {patternDateRange.from.toLocaleDateString()}
                      {patternDateRange.to &&
                        ` ～ ${patternDateRange.to.toLocaleDateString()}`}
                      {patternDateRange.to &&
                        ` (${getDatesInRange(patternDateRange).length}日間)`}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekday Pattern Configuration */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Label className="text-sm font-medium">
                    曜日別の利用可能時間を設定
                  </Label>
                </div>

                {/* Weekday Selection and Time Slot Addition */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">曜日</Label>
                    <select
                      value={currentWeekday}
                      onChange={(e) => setCurrentWeekday(e.target.value)}
                      className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                    >
                      <option value="">曜日を選択</option>
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">開始時間</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">終了時間</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">操作</Label>
                    <Button
                      type="button"
                      onClick={addWeekdayTimeSlot}
                      disabled={
                        !currentWeekday ||
                        startTime >= endTime ||
                        checkForWeekdayOverlap(currentWeekday, startTime, endTime)
                      }
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      時間帯追加
                    </Button>
                  </div>
                </div>

                {/* Time Presets */}
                <TimePresetSelector onPresetSelect={applyPreset} />
              </div>
            </CardContent>
          </Card>

          {/* Current Weekday Patterns */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    設定済みの曜日パターン
                  </Label>
                  {weekdayPatterns.size > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWeekdayPatterns(new Map())}
                      className="h-7 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      パターンクリア
                    </Button>
                  )}
                </div>

                {DAYS_OF_WEEK.map((day) => {
                  const pattern = getWeekdayPattern(day.value);
                  const hasPattern =
                    pattern &&
                    (pattern.fullDay || pattern.timeSlots.length > 0);

                  return (
                    <Card
                      key={day.value}
                      className={
                        hasPattern ? "border-blue-200" : "border-gray-200"
                      }
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{day.label}</Label>
                            {hasPattern && (
                              <Badge variant="secondary" className="text-xs">
                                設定済み
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={pattern?.fullDay || false}
                              onCheckedChange={() =>
                                toggleWeekdayFullDay(day.value)
                              }
                            />
                            <Label className="text-sm">終日利用可能</Label>
                          </div>
                        </div>

                        {pattern?.fullDay ? (
                          <div className="text-sm text-muted-foreground">
                            終日利用可能
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {pattern?.timeSlots.map((slot) => (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md"
                              >
                                <span className="text-sm">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeWeekdayTimeSlot(day.value, slot.id)
                                  }
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {(!pattern || pattern.timeSlots.length === 0) && (
                              <div className="text-sm text-muted-foreground">
                                利用不可
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Apply Pattern Button */}
          {patternDateRange?.from && weekdayPatterns.size > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="text-sm text-green-800 dark:text-green-200">
                      <strong>適用予定:</strong> {getAffectedDatesCount()}
                      日間の例外的利用可能時間が作成されます
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={applyPatternsToRange}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    パターンを期間に適用
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Current Availability Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            現在の例外的利用可能時間
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={availability.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            すべてクリア
          </Button>
        </div>

        {availability.length > 0 ? (
          availability
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map((availableDate) => {
              const dayAvailability = getDateAvailability(availableDate.date);
              const hasAvailability =
                dayAvailability &&
                (dayAvailability.fullDay ||
                  dayAvailability.timeSlots.length > 0);

              return (
                <Card
                  key={availableDate.date.toDateString()}
                  className={
                    hasAvailability ? "border-blue-200" : "border-gray-200"
                  }
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">
                          {availableDate.date.toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </Label>
                        {hasAvailability && (
                          <Badge variant="secondary" className="text-xs">
                            設定済み
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removeDateAvailability(availableDate.date)
                        }
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        title="この日付の設定を削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {dayAvailability?.fullDay ? (
                      <div className="text-sm text-muted-foreground">
                        終日利用可能
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayAvailability?.timeSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between p-2 bg-blue-50 rounded-md text-black"
                          >
                            <span className="text-sm">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removeTimeSlot(availableDate.date, slot.id);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {(!dayAvailability ||
                          dayAvailability.timeSlots.length === 0) && (
                          <div className="text-sm text-muted-foreground">
                            利用不可
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <div className="text-center py-8">
            <div className="text-muted-foreground text-sm">
              例外的な利用可能時間を設定してください
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              個別日付指定または期間×曜日パターン指定をお選びください
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
