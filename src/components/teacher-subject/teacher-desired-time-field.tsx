import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { DesiredTimeInput } from "@/schemas/desiredTime.schema"
import { TeacherPreferencesInput } from "@/schemas/teacher-preferences.schema"
import { Button } from "@/components/ui/button"
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TeacherDesiredTimeFieldProps {
  form: UseFormReturn<TeacherPreferencesInput>
}

export const TeacherDesiredTimeField = ({ form }: TeacherDesiredTimeFieldProps) => {
  const [selectedWeekday, setSelectedWeekday] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")

  return (
    <FormField
      control={form.control}
      name="desiredTimes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>希望時間</FormLabel>
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
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                      .filter(day => !(field.value || []).some((time: DesiredTimeInput) => time.dayOfWeek === day))
                      .map(day => (
                        <SelectItem key={day} value={day}>
                          {day === "Monday"
                            ? "月曜日"
                            : day === "Tuesday"
                              ? "火曜日"
                              : day === "Wednesday"
                                ? "水曜日"
                                : day === "Thursday"
                                  ? "木曜日"
                                  : "金曜日"}
                        </SelectItem>
                      ))
                    }
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
                  
                  // Check if weekday already exists
                  const weekdayExists = (field.value || []).some(
                    (time: DesiredTimeInput) => time.dayOfWeek === selectedWeekday
                  );
                  
                  if (weekdayExists) {
                    alert("この曜日の希望時間は既に追加されています");
                    return;
                  }
                  
                  const newTime: DesiredTimeInput = {
                    dayOfWeek: selectedWeekday,
                    startTime,
                    endTime
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
              {(field.value || []).map((time: DesiredTimeInput, index: number) => (
                <div key={index} className="flex items-center bg-accent rounded-md px-3 py-1">
                  <span>
                    {time.dayOfWeek === "Monday"
                      ? "月曜日"
                      : time.dayOfWeek === "Tuesday"
                        ? "火曜日"
                        : time.dayOfWeek === "Wednesday"
                          ? "水曜日"
                          : time.dayOfWeek === "Thursday"
                            ? "木曜日"
                            : time.dayOfWeek === "Friday"
                              ? "金曜日"
                              : time.dayOfWeek}: {time.startTime} 〜 {time.endTime}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 cursor-pointer hover:bg-muted"
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
              ))}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}