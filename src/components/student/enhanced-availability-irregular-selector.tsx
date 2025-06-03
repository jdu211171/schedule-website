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
import { DatePicker } from "../date-picker";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface IrregularAvailability {
    date:Date;
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

const TIME_PRESETS = [
  { label: "午前 (9:00-12:00)", start: "09:00", end: "12:00" },
  { label: "午後 (13:00-17:00)", start: "13:00", end: "17:00" },
  { label: "夕方 (17:00-21:00)", start: "17:00", end: "21:00" },
  { label: "夜間 (19:00-22:00)", start: "19:00", end: "22:00" },
] as const;

export function EnhancedAvailabilityIrregularSelector({ availability, onChange }: EnhancedAvailabilitySelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");

//   Get availability for a specific day
function getDateAvailability(date: Date): IrregularAvailability | undefined {
    return availability.find(item => item.date === date);
  }

  // Add new time slot to a day
  function addTimeSlot() {
    if (!selectedDate || startTime >= endTime) return;

    const newSlot: TimeSlot = {
      id: crypto.randomUUID(),
      startTime,
      endTime
    };

    // Check for overlaps with existing slots
    const dayAvailability = getDateAvailability(selectedDate)
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
    const existingIndex = updatedAvailability.findIndex(item => item.date === selectedDate)

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
        date: selectedDate,
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
  function removeTimeSlot(date: Date, slotId: string) {
    const updatedAvailability = availability.map(item => {
      if (item.date === date) {
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
  function toggleFullDay(date: Date) {
    const updatedAvailability = [...availability]
    const existingIndex = updatedAvailability.findIndex(item => item.date === date)

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
        date: date,
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
                <DatePicker onChange={setSelectedDate} value={selectedDate}/>
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
                  disabled={!selectedDate || startTime >= endTime}
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

        {availability.length > 0 ? availability.map((availableDate) => {
          const dayAvailability = getDateAvailability(availableDate.date)
          const hasAvailability = dayAvailability && (dayAvailability.fullDay || dayAvailability.timeSlots.length > 0)

          return (
            <Card key={availableDate.date.toDateString()} className={hasAvailability ? "border-blue-200" : "border-gray-200"}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{availableDate.date.toDateString()}</Label>
                    {hasAvailability && (
                      <Badge variant="secondary" className="text-xs">
                        設定済み
                      </Badge>
                    )}
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <Checkbox
                      checked={dayAvailability?.fullDay || false}
                      onCheckedChange={() => toggleFullDay(day.value)}
                    />
                    <Label className="text-sm">終日利用可能</Label>
                  </div> */}
                </div>

                {dayAvailability?.fullDay ? (
                  <div className="text-sm text-muted-foreground">
                    終日利用可能
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayAvailability?.timeSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-md text-black">
                        <span className="text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(availableDate.date, slot.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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
        }) : (<div className="text-center">現在の利用可能時間設定してください！</div>)}
      </div>
    </div>
  )
}
