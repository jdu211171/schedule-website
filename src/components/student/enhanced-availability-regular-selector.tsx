"use client";

import { useState } from "react";
import { Plus, X, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface RegularAvailability {
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  timeSlots: TimeSlot[];
  fullDay: boolean;
}

interface EnhancedAvailabilitySelectorProps {
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
] as const;

const TIME_PRESETS = [
  { label: "午前 (9:00-12:00)", start: "09:00", end: "12:00" },
  { label: "午後 (13:00-17:00)", start: "13:00", end: "17:00" },
  { label: "夕方 (17:00-21:00)", start: "17:00", end: "21:00" },
  { label: "夜間 (19:00-22:00)", start: "19:00", end: "22:00" },
] as const;

export function EnhancedAvailabilityRegularSelector({ availability, onChange }: EnhancedAvailabilitySelectorProps) {
  const [selectedDay, setSelectedDay] = useState<typeof DAYS_OF_WEEK[number]["value"] | "">("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");

  // Get availability for a specific day
  function getDayAvailability(dayOfWeek: typeof DAYS_OF_WEEK[number]["value"]): RegularAvailability | undefined {
    return availability.find(item => item.dayOfWeek === dayOfWeek);
  }

  // Add new time slot to a day
  function addTimeSlot() {
    if (!selectedDay || startTime >= endTime) return;

    const newSlot: TimeSlot = {
      id: crypto.randomUUID(),
      startTime,
      endTime
    };

    // Check for overlaps with existing slots
    const dayAvailability = getDayAvailability(selectedDay)
    if (dayAvailability && !dayAvailability.fullDay) {
      const existingSlots = dayAvailability.timeSlots
      const hasOverlap = existingSlots.some(slot => {
        return (startTime < slot.endTime && endTime > slot.startTime)
      })

      if (hasOverlap) {
        alert("選択した時間帯は既存の時間帯と重複しています")
        return
      }
    }

    const updatedAvailability = [...availability]
    const existingIndex = updatedAvailability.findIndex(item => item.dayOfWeek === selectedDay)

    if (existingIndex >= 0) {
      // Add to existing day
      updatedAvailability[existingIndex] = {
        ...updatedAvailability[existingIndex],
        timeSlots: [...updatedAvailability[existingIndex].timeSlots, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime)),
        fullDay: false
      }
    } else {
      // Create new day availability
      updatedAvailability.push({
        dayOfWeek: selectedDay,
        timeSlots: [newSlot],
        fullDay: false
      })
    }

    onChange(updatedAvailability)

    // Reset selection
    setStartTime("09:00")
    setEndTime("17:00")
  }

  // Remove a specific time slot
  function removeTimeSlot(dayOfWeek: typeof DAYS_OF_WEEK[number]["value"], slotId: string) {
    const updatedAvailability = availability.map(item => {
      if (item.dayOfWeek === dayOfWeek) {
        const updatedTimeSlots = item.timeSlots.filter(slot => slot.id !== slotId)
        return {
          ...item,
          timeSlots: updatedTimeSlots
        }
      }
      return item
    }).filter(item => item.timeSlots.length > 0 || item.fullDay)

    onChange(updatedAvailability)
  }

  // Toggle full day for a specific day
  function toggleFullDay(dayOfWeek: typeof DAYS_OF_WEEK[number]["value"]) {
    const updatedAvailability = [...availability]
    const existingIndex = updatedAvailability.findIndex(item => item.dayOfWeek === dayOfWeek)

    if (existingIndex >= 0) {
      const current = updatedAvailability[existingIndex]
      if (current.fullDay) {
        // Remove full day (remove the entire entry)
        updatedAvailability.splice(existingIndex, 1)
      } else {
        // Set to full day (clear time slots)
        updatedAvailability[existingIndex] = {
          ...current,
          fullDay: true,
          timeSlots: []
        }
      }
    } else {
      // Create new full day entry
      updatedAvailability.push({
        dayOfWeek: dayOfWeek,
        timeSlots: [],
        fullDay: true
      })
    }

    onChange(updatedAvailability)
  }

  // Apply time preset
  function applyPreset(preset: typeof TIME_PRESETS[number]) {
    setStartTime(preset.start)
    setEndTime(preset.end)
  }

  // Clear all availability
  function clearAll() {
    onChange([])
  }

  return (
    <div className="space-y-6">
      {/* Time Slot Addition Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Label className="text-sm font-medium">新しい時間帯を追加</Label>
            </div>

            {/* Day Selection */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">曜日</Label>
                <Select value={selectedDay} onValueChange={(value) => setSelectedDay(value as typeof selectedDay)}>
                  <SelectTrigger>
                    <SelectValue placeholder="曜日を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  disabled={!selectedDay || startTime >= endTime}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  追加
                </Button>
              </div>
            </div>

            {/* Time Presets */}
            <div className="space-y-2">
              <Label className="text-xs">時間プリセット</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Availability Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">現在の利用可能時間</Label>
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

        {DAYS_OF_WEEK.map((day) => {
          const dayAvailability = getDayAvailability(day.value)
          const hasAvailability = dayAvailability && (dayAvailability.fullDay || dayAvailability.timeSlots.length > 0)

          return (
            <Card key={day.value} className={hasAvailability ? "border-blue-200" : "border-gray-200"}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{day.label}</Label>
                    {hasAvailability && (
                      <Badge variant="secondary" className="text-xs">
                        設定済み
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={dayAvailability?.fullDay || false}
                      onCheckedChange={() => toggleFullDay(day.value)}
                    />
                    <Label className="text-sm">終日利用可能</Label>
                  </div>
                </div>

                {dayAvailability?.fullDay ? (
                  <div className="text-sm text-muted-foreground">
                    終日利用可能
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayAvailability?.timeSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(day.value, slot.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {(!dayAvailability || dayAvailability.timeSlots.length === 0) && (
                      <div className="text-sm text-muted-foreground">
                        利用不可
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
