"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface LessonModalSelectsProps {
  // Data for selects
  subjects: { subjectId: string; name: string }[];
  availableDays: { value: string; label: string }[];
  availableStartTimes: string[];
  availableBooths: { boothId: string; name: string }[];
  
  // Selected values
  selectedSubject: string;
  selectedDay: string;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedDuration: string;
  selectedBooth: string;
  
  // Setters for selected values
  setSelectedSubject: (subjectId: string) => void;
  setSelectedDay: (day: string) => void;
  setSelectedStartTime: (time: string) => void;
  setSelectedDuration: (duration: string) => void;
  setSelectedBooth: (boothId: string) => void;
  
   // Errors and statuses
  timeError: string | null;
  hasCommonSubjects: boolean;
  hasCommonDays: boolean;
  hasCommonTimeSlots: boolean;
  loading: boolean;
  
  // Дополнительно
  durationOptions: { value: string; isAvailable: boolean }[];
  handleTimeStep: (step: number) => void;
}

export default function LessonModalSelects({
  // Data for selects
  subjects,
  availableDays,
  availableStartTimes,
  availableBooths,
  
  // Selected values
  selectedSubject,
  selectedDay,
  selectedStartTime,
  selectedEndTime,
  selectedDuration,
  selectedBooth,
  
  // Setters for selected values
  setSelectedSubject,
  setSelectedDay,
  setSelectedStartTime,
  setSelectedDuration,
  setSelectedBooth,
  
  // Errors and statuses
  timeError,
  hasCommonSubjects,
  hasCommonDays,
  hasCommonTimeSlots,
  loading,
  
  // Дополнительно
  durationOptions,
  handleTimeStep
}: LessonModalSelectsProps) {
  
  // Check for compatible options
  const hasNoMatchingOptions = !hasCommonSubjects || !hasCommonDays || !hasCommonTimeSlots;
  
  return (
    <>
      {hasNoMatchingOptions && (
        <Alert variant="destructive" className="my-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>スケジュールの不一致</AlertTitle>
          <AlertDescription>
            {!hasCommonSubjects && "生徒と先生に共通する科目がありません。"}
            {!hasCommonDays && "生徒と先生のスケジュールが重なりません。"}
            {hasCommonDays && !hasCommonTimeSlots && selectedDay && "選択した曜日に利用可能な時間枠がありません。"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 py-3">
        {/* Selecting a subject */}
        <div>
          <Label className="block text-sm font-medium mb-1">科目</Label>
          <Select
            value={selectedSubject}
            onValueChange={setSelectedSubject}
            disabled={!hasCommonSubjects || loading}
          >
            <SelectTrigger className={`w-full cursor-pointer ${!hasCommonSubjects || loading ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="科目を選択" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              {subjects.length > 0 ? (
                subjects.map(subject => (
                  <SelectItem
                    key={subject.subjectId}
                    value={subject.subjectId}
                    className="cursor-pointer"
                  >
                    {subject.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-gray-400">
                  利用可能な科目がありません
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {!hasCommonSubjects && (
            <p className="text-xs text-red-500 mt-1">共通の科目がありません</p>
          )}
        </div>

        {/* Select day of the week */}
        <div>
          <Label className="block text-sm font-medium mb-1">曜日</Label>
          <Select
            value={selectedDay}
            onValueChange={setSelectedDay}
            disabled={!hasCommonDays || loading}
          >
            <SelectTrigger className={`w-full cursor-pointer ${!hasCommonDays || loading ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="曜日を選択" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              {availableDays.length > 0 ? (
                availableDays.map(day => (
                  <SelectItem
                    key={day.value}
                    value={day.value}
                    className="cursor-pointer"
                  >
                    {day.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-gray-400">
                  利用可能な曜日がありません
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {!hasCommonDays && (
            <p className="text-xs text-red-500 mt-1">共通の曜日がありません</p>
          )}
        </div>

        {/* Select duration */}
        <div>
          <Label className="block text-sm font-medium mb-1">授業時間</Label>
          <div className="flex space-x-3">
            {durationOptions.map(duration => (
              <Button
                key={duration.value}
                variant={selectedDuration === duration.value ? "default" : "outline"}
                className={`flex-1 cursor-pointer ${selectedDuration === duration.value ? "bg-black text-white" : ""} ${
                  (hasNoMatchingOptions || !duration.isAvailable || loading)
                    ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => {
                  if (!hasNoMatchingOptions && duration.isAvailable && !loading) {
                    setSelectedDuration(duration.value);
                  }
                }}
                disabled={hasNoMatchingOptions || !duration.isAvailable || loading}
              >
                {duration.value}
              </Button>
            ))}
          </div>
        </div>

        {/* Select start time */}
        <div>
          <Label className="block text-sm font-medium mb-1">開始時刻</Label>
          <div className="relative">
            <div className="flex">
              <Select
                value={selectedStartTime}
                onValueChange={setSelectedStartTime}
                disabled={!hasCommonTimeSlots || !selectedDay || loading}
              >
                <SelectTrigger className={`w-full cursor-pointer rounded-r-none ${!hasCommonTimeSlots || !selectedDay || loading ? 'opacity-50' : ''}`}>
                  <SelectValue placeholder="時間を選択" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  {availableStartTimes.length > 0 ? (
                    availableStartTimes.map(time => (
                      <SelectItem
                        key={time}
                        value={time}
                        className="cursor-pointer"
                      >
                        {time}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-gray-400">
                      利用可能な時間枠がありません
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="flex flex-col border border-l-0 border-input rounded-r-md overflow-hidden">
                <button
                  onClick={() => handleTimeStep(15)}
                  className={`flex-1 hover:bg-gray-100 px-2 cursor-pointer flex items-center justify-center ${
                    !hasCommonTimeSlots || !selectedDay || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!hasCommonTimeSlots || !selectedDay || loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <div className="h-px bg-input w-full"></div>
                <button
                  onClick={() => handleTimeStep(-15)}
                  className={`flex-1 hover:bg-gray-100 px-2 cursor-pointer flex items-center justify-center ${
                    !hasCommonTimeSlots || !selectedDay || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!hasCommonTimeSlots || !selectedDay || loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            </div>
            {timeError && (
              <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 border border-red-300 rounded z-10">
                {timeError}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">15分単位で選択してください (00, 15, 30, 45)</p>
        </div>

        {/* End time (display only) */}
        <div>
          <Label className="block text-sm font-medium mb-1">終了時刻</Label>
          <Input
            type="text"
            placeholder="自動計算"
            value={selectedEndTime}
            readOnly
            className="w-full bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Booth */}
        <div>
          <Label className="block text-sm font-medium mb-1">ブース</Label>
          <Select
            value={selectedBooth}
            onValueChange={setSelectedBooth}
            disabled={loading || availableBooths.length === 0}
          >
            <SelectTrigger className={`w-full cursor-pointer ${loading || availableBooths.length === 0 ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="ブースを選択" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              {availableBooths.length > 0 ? (
                availableBooths.map(booth => (
                  <SelectItem
                    key={booth.boothId}
                    value={booth.boothId}
                    className="cursor-pointer"
                  >
                    {booth.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-gray-400">
                  利用可能なブースがありません
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}