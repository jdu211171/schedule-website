"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimePresets } from "@/hooks/useTimePresets";

interface TimePresetSelectorProps {
  onPresetSelect: (preset: {
    label: string;
    start: string;
    end: string;
  }) => void;
}

export function TimePresetSelector({
  onPresetSelect,
}: TimePresetSelectorProps) {
  const { customPresets, addCustomPreset, removeCustomPreset } =
    useTimePresets();
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetStart, setNewPresetStart] = useState("");
  const [newPresetEnd, setNewPresetEnd] = useState("");

  function formatTimeTo12Hour(time24: string): string {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  function handleAddCustomPreset() {
    if (
      !newPresetLabel ||
      !newPresetStart ||
      !newPresetEnd ||
      newPresetStart >= newPresetEnd
    )
      return;
    const newPreset = {
      label: newPresetLabel,
      start: newPresetStart,
      end: newPresetEnd,
    };
    addCustomPreset(newPreset);
    setNewPresetLabel("");
    setNewPresetStart("");
    setNewPresetEnd("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">時間プリセット</Label>
        <div className="flex flex-wrap gap-2">
          {customPresets.map((preset, index) => (
            <div key={`custom-${index}`} className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPresetSelect(preset)}
              >
                {preset.label} ({formatTimeTo12Hour(preset.start)}-
                {formatTimeTo12Hour(preset.end)})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCustomPreset(index)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {customPresets.length === 0 && (
            <div className="text-sm text-muted-foreground">
              プリセットがありません。新しいプリセットを追加してください。
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">新しいプリセットを追加</Label>
        <div className="grid grid-cols-4 gap-2">
          <Input
            placeholder="ラベル"
            value={newPresetLabel}
            onChange={(e) => setNewPresetLabel(e.target.value)}
          />
          <Input
            type="time"
            value={newPresetStart}
            onChange={(e) => setNewPresetStart(e.target.value)}
          />
          <Input
            type="time"
            value={newPresetEnd}
            onChange={(e) => setNewPresetEnd(e.target.value)}
          />
          <Button
            type="button"
            onClick={handleAddCustomPreset}
            disabled={
              !newPresetLabel ||
              !newPresetStart ||
              !newPresetEnd ||
              newPresetStart >= newPresetEnd
            }
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            追加
          </Button>
        </div>
      </div>
    </div>
  );
}
