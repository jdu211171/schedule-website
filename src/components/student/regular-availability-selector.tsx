"use client";

import { useState } from "react";
import { Plus, X, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface RegularAvailability {
  dayOfWeek:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  startTime?: string;
  endTime?: string;
  fullDay: boolean;
}

interface RegularAvailabilitySelectorProps {
  availability: RegularAvailability[];
  onChange: (availability: RegularAvailability[]) => void;
}

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "月曜日", short: "月" },
  { value: "TUESDAY", label: "火曜日", short: "火" },
  { value: "WEDNESDAY", label: "水曜日", short: "水" },
  { value: "THURSDAY", label: "木曜日", short: "木" },
  { value: "FRIDAY", label: "金曜日", short: "金" },
  { value: "SATURDAY", label: "土曜日", short: "土" },
  { value: "SUNDAY", label: "日曜日", short: "日" },
];

const TIME_PRESETS = [
  { label: "午前 (9:00-12:00)", start: "09:00", end: "12:00" },
  { label: "午後 (13:00-17:00)", start: "13:00", end: "17:00" },
  { label: "夕方 (17:00-21:00)", start: "17:00", end: "21:00" },
  { label: "夜間 (19:00-22:00)", start: "19:00", end: "22:00" },
];

export function RegularAvailabilitySelector({
  availability,
  onChange,
}: RegularAvailabilitySelectorProps) {
  const [selectedDay, setSelectedDay] = useState<
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY"
    | ""
  >("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [isFullDay, setIsFullDay] = useState<boolean>(false);

  // Add new availability slot
  function addAvailability() {
    if (!selectedDay) return;

    const newSlot: RegularAvailability = {
      dayOfWeek: selectedDay,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      fullDay: isFullDay,
    };

    // Check if this day already exists
    const existingIndex = availability.findIndex(
      (slot) => slot.dayOfWeek === selectedDay
    );

    if (existingIndex >= 0) {
      // Update existing
      const updated = [...availability];
      updated[existingIndex] = newSlot;
      onChange(updated);
    } else {
      // Add new
      onChange([...availability, newSlot]);
    }

    // Reset form
    setSelectedDay("");
    setStartTime("09:00");
    setEndTime("17:00");
    setIsFullDay(false);
  }

  // Remove availability slot
  function removeAvailability(dayOfWeek: string) {
    onChange(availability.filter((slot) => slot.dayOfWeek !== dayOfWeek));
  }

  // Apply time preset
  function applyTimePreset(preset: { start: string; end: string }) {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setIsFullDay(false);
  }

  // Clear all availability
  function clearAll() {
    onChange([]);
  }

  // Get available days (not already selected)
  const availableDays = DAYS_OF_WEEK.filter(
    (day) => !availability.some((slot) => slot.dayOfWeek === day.value)
  );

  // Validate time input
  function validateTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  const isValidTimeRange =
    validateTime(startTime) && validateTime(endTime) && startTime !== endTime;

  const canAdd = selectedDay && (isFullDay || isValidTimeRange);

  return (
    <div className="space-y-4">
      {/* Add New Availability */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4" />
              <Label className="text-sm font-medium">
                新しい利用可能時間を追加
              </Label>
            </div>

            {/* Day Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">曜日</Label>
              <Select
                value={selectedDay}
                onValueChange={(value) =>
                  setSelectedDay(value as typeof selectedDay)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="曜日を選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Day Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fullDay"
                checked={isFullDay}
                onCheckedChange={(checked) => setIsFullDay(checked as boolean)}
              />
              <Label htmlFor="fullDay" className="text-sm">
                終日利用可能
              </Label>
            </div>

            {/* Time Selection */}
            {!isFullDay && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      開始時間
                    </Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      終了時間
                    </Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Time Presets */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    よく使う時間帯
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_PRESETS.map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTimePreset(preset)}
                        className="h-8 text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Validation */}
                {!isValidTimeRange && startTime && endTime && (
                  <p className="text-xs text-destructive">
                    有効な時間範囲を入力してください
                  </p>
                )}
              </div>
            )}

            {/* Add Button */}
            <Button
              type="button"
              onClick={addAvailability}
              disabled={!canAdd}
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Availability */}
      {availability.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              設定済みの利用可能時間
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              全てクリア
            </Button>
          </div>

          <div className="grid gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const slot = availability.find((s) => s.dayOfWeek === day.value);

              if (!slot) return null;

              return (
                <div
                  key={day.value}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="min-w-[40px] justify-center"
                    >
                      {day.short}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {slot.fullDay ? (
                        <span className="text-sm font-medium text-green-700">
                          終日利用可能
                        </span>
                      ) : (
                        <span className="text-sm">
                          {slot.startTime || "00:00"} -{" "}
                          {slot.endTime || "23:59"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAvailability(slot.dayOfWeek)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {availability.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">まだ利用可能時間が設定されていません</p>
          <p className="text-xs mt-1">
            上記のフォームから曜日と時間を追加してください
          </p>
        </div>
      )}
    </div>
  );
}
