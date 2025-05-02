import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DesiredTimeInput } from "@/schemas/desired-time.schema"

// Update to use the correct type
interface StudentDesiredTimeFieldProps {
  form: UseFormReturn<{
    desiredTimes: DesiredTimeInput[]
  }>
}

// Use uppercase enum values for internal storage
const dayOfWeekMap = {
  "MONDAY": "Monday",
  "TUESDAY": "Tuesday",
  "WEDNESDAY": "Wednesday",
  "THURSDAY": "Thursday",
  "FRIDAY": "Friday",
  "SATURDAY": "Saturday",
  "SUNDAY": "Sunday"
}

const dayOfWeekDisplayMap = {
  "Monday": "月曜日",
  "Tuesday": "火曜日",
  "Wednesday": "水曜日",
  "Thursday": "木曜日",
  "Friday": "金曜日",
  "Saturday": "土曜日",
  "Sunday": "日曜日"
}

export const StudentDesiredTimeField = ({ form }: StudentDesiredTimeFieldProps) => {
  const [selectedWeekday, setSelectedWeekday] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")

  return (
    <FormField
      control={form.control}
      name="desiredTimes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>希望時間帯</FormLabel>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  onValueChange={(value) => setSelectedWeekday(value)}
                  value={selectedWeekday}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="曜日を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dayOfWeekMap)
                      .filter(([, displayValue]) => !(field.value || []).some((time: DesiredTimeInput) => time.dayOfWeek.toUpperCase() === displayValue.toUpperCase()))
                      .map(([enumValue, displayValue]) => (
                        <SelectItem key={enumValue} value={enumValue}>
                          {dayOfWeekDisplayMap[displayValue as keyof typeof dayOfWeekDisplayMap]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-28"
                  style={{ appearance: "none", WebkitAppearance: "none" }}
                />
              </div>

              <span className="mx-2 text-sm font-medium">〜</span>

              <div>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-28"
                  style={{ appearance: "none", WebkitAppearance: "none" }}
                />
              </div>

              <Button
                type="button"
                onClick={() => {
                  if (!selectedWeekday || !startTime || !endTime) return;

                  if (startTime >= endTime) {
                    alert("開始時間は終了時間より前にしてください");
                    return;
                  }

                  const weekdayExists = (field.value || []).some(
                    (time: DesiredTimeInput) => time.dayOfWeek.toUpperCase() === selectedWeekday.toUpperCase()
                  );
                  if (weekdayExists) {
                    alert("この曜日の希望時間は既に追加されています");
                    return;
                  }

                  const newTime = {
                    dayOfWeek: selectedWeekday,
                    startTime,
                    endTime,
                  };

                  const updatedTimes = [...field.value || [], newTime];
                  field.onChange(updatedTimes);

                  setSelectedWeekday("");
                  setStartTime("");
                  setEndTime("");
                }}
                disabled={!selectedWeekday || !startTime || !endTime}
              >
                追加
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {(field.value || []).map((time: DesiredTimeInput, index: number) => {
                // Find the display value for the enum
                const displayValue = dayOfWeekMap[time.dayOfWeek.toUpperCase() as keyof typeof dayOfWeekMap] || time.dayOfWeek;
                return (
                  <div key={index} className="flex items-center bg-accent rounded-md px-3 py-1">
                    <span>
                      {dayOfWeekDisplayMap[displayValue as keyof typeof dayOfWeekDisplayMap]}: {time.startTime} 〜 {time.endTime}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                      aria-label="削除"
                      onClick={() => {
                        const newValues = [...(field.value || [])];
                        newValues.splice(index, 1);
                        field.onChange(newValues);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
