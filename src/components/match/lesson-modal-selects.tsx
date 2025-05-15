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
import { ClassType, Subject } from "./types";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface LessonModalSelectsProps {
  // Поля для типов предметов
  subjectTypes: { subjectTypeId: string; name: string }[];
  selectedSubjectType: string;
  setSelectedSubjectType: (typeId: string) => void;
  
  // Данные для селектов - обновляем тип subjects
  subjects: Subject[]; // Изменяем тип на Subject[]
  availableDays: { value: string; label: string }[];
  availableStartTimes: string[];
  availableBooths: { boothId: string; name: string }[];
  classTypes: ClassType[];

  // Выбранные значения
  selectedSubject: string;
  selectedDay: string;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedDuration: string;
  selectedBooth: string;
  selectedClassType: string;
  selectedStartDate: string | null;
  selectedEndDate: string | null;

  // Сеттеры для выбранных значений
  setSelectedSubject: (subjectId: string) => void;
  setSelectedDay: (day: string) => void;
  setSelectedStartTime: (time: string) => void;
  setSelectedDuration: (duration: string) => void;
  setSelectedBooth: (boothId: string) => void;
  setSelectedClassType: (classTypeId: string) => void;
  setSelectedStartDate: (date: string | null) => void;
  setSelectedEndDate: (date: string | null) => void;

  // Ошибки и статусы
  timeError: string | null;
  hasCommonSubjects: boolean;
  hasCommonDays: boolean;
  hasCommonTimeSlots: boolean;
  loading: boolean;

  // Дополнительно
  durationOptions: { value: string; isAvailable: boolean }[];
  handleTimeStep: (step: number) => void;
  getMinMaxDates: () => { minStartDate: Date; maxEndDate: Date };
}

export default function LessonModalSelects({
  // Поля для типов предметов
  subjectTypes,
  selectedSubjectType,
  setSelectedSubjectType,
  
  subjects,
  availableDays,
  availableStartTimes,
  availableBooths,
  selectedSubject,
  selectedDay,
  selectedStartTime,
  selectedEndTime,
  selectedDuration,
  selectedBooth,
  selectedStartDate,
  selectedEndDate,
  setSelectedSubject,
  setSelectedDay,
  setSelectedStartTime,
  setSelectedDuration,
  setSelectedBooth,
  setSelectedStartDate,
  setSelectedEndDate,
  timeError,
  hasCommonSubjects,
  hasCommonDays,
  hasCommonTimeSlots,
  loading,
  durationOptions,
  handleTimeStep,
  getMinMaxDates
}: LessonModalSelectsProps) {

  const hasNoMatchingOptions = !hasCommonSubjects || !hasCommonDays || !hasCommonTimeSlots;
  const { minStartDate, maxEndDate } = getMinMaxDates();

  const disableStartDate = (date: Date) => {
    return date < minStartDate;
  };

  const disableEndDate = (date: Date) => {
    const startDate = selectedStartDate ? new Date(selectedStartDate) : minStartDate;
    return date < startDate || date > maxEndDate;
  };

  return (
    <>
      {hasNoMatchingOptions && (
        <Alert variant="destructive" className="my-3 bg-red-50 dark:bg-destructive/10 border-red-200 dark:border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-destructive" />
          <AlertTitle className="text-red-800 dark:text-destructive">スケジュールの不一致</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-destructive/90">
            {!hasCommonSubjects && "生徒と先生に共通する科目がありません。"}
            {!hasCommonDays && "生徒と先生のスケジュールが重なりません。"}
            {hasCommonDays && !hasCommonTimeSlots && selectedDay && "選択した曜日に利用可能な時間枠がありません。"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3">
        {/* 1. Выбор типа предмета */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">科目タイプ</Label>
          <Select
            value={selectedSubjectType}
            onValueChange={setSelectedSubjectType}
            disabled={!hasCommonSubjects || loading}
          >
            <SelectTrigger className={`w-full cursor-pointer ${!hasCommonSubjects || loading ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="科目タイプを選択" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              {subjectTypes.length > 0 ? (
                subjectTypes.map(type => (
                  <SelectItem
                    key={type.subjectTypeId}
                    value={type.subjectTypeId}
                    className="cursor-pointer hover:bg-accent dark:hover:bg-accent"
                  >
                    {type.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-muted-foreground">
                  利用可能な科目タイプがありません
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {!hasCommonSubjects && (
            <p className="text-xs text-red-600 dark:text-destructive mt-1">共通の科目タイプがありません</p>
          )}
        </div>

        {/* 2. Выбор предмета */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">科目</Label>
          <Select
            value={selectedSubject}
            onValueChange={setSelectedSubject}
            disabled={!hasCommonSubjects || loading || !selectedSubjectType}
          >
            <SelectTrigger className={`w-full cursor-pointer ${!hasCommonSubjects || loading || !selectedSubjectType ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="科目を選択" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              {subjects.length > 0 ? (
                subjects.map(subject => {
                  // Определяем имя предмета, с учетом его возможного отсутствия
                  let subjectName: string;
                  
                  if (typeof subject.name === 'string') {
                    // Если name есть и это строка, используем его
                    subjectName = subject.name;
                  } else if (subject.subject && typeof subject.subject === 'object' && 'name' in subject.subject) {
                    // Если есть вложенный объект subject с полем name
                    subjectName = subject.subject.name as string;
                  } else {
                    // Если ничего не найдено, используем ID или значение по умолчанию
                    subjectName = `Предмет ${subject.subjectId.slice(0, 6)}`;
                  }
                  
                  return (
                    <SelectItem
                      key={subject.subjectId}
                      value={subject.subjectId}
                      className="cursor-pointer hover:bg-accent dark:hover:bg-accent"
                    >
                      {subjectName}
                    </SelectItem>
                  );
                })
              ) : (
                <SelectItem value="none" disabled className="text-muted-foreground">
                  {selectedSubjectType 
                    ? "選択したタイプで利用可能な科目がありません" 
                    : "まず科目タイプを選択してください"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {!hasCommonSubjects && (
            <p className="text-xs text-red-600 dark:text-destructive mt-1">共通の科目がありません</p>
          )}
        </div>

        {/* 3. Выбор дня недели */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">曜日</Label>
          <Select
            value={selectedDay}
            onValueChange={setSelectedDay}
            disabled={!hasCommonDays || loading || !selectedSubject}
          >
            <SelectTrigger className={`w-full cursor-pointer ${!hasCommonDays || loading || !selectedSubject ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="曜日を選択" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              {availableDays.length > 0 ? (
                availableDays.map(day => (
                  <SelectItem
                    key={day.value}
                    value={day.value}
                    className="cursor-pointer hover:bg-accent dark:hover:bg-accent"
                  >
                    {day.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-muted-foreground">
                  利用可能な曜日がありません
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {!hasCommonDays && (
            <p className="text-xs text-red-600 dark:text-destructive mt-1">共通の曜日がありません</p>
          )}
        </div>

        {/* 4. Выбор времени начала */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">開始時刻</Label>
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
                        className="cursor-pointer hover:bg-accent dark:hover:bg-accent"
                      >
                        {time}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-muted-foreground">
                      利用可能な時間枠がありません
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="flex flex-col border border-l-0 border-input rounded-r-md overflow-hidden">
                <button
                  onClick={() => handleTimeStep(15)}
                  className={`flex-1 hover:bg-accent dark:hover:bg-accent px-2 cursor-pointer flex items-center justify-center ${
                    !hasCommonTimeSlots || !selectedDay || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!hasCommonTimeSlots || !selectedDay || loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <div className="h-px bg-input w-full"></div>
                <button
                  onClick={() => handleTimeStep(-15)}
                  className={`flex-1 hover:bg-accent dark:hover:bg-accent px-2 cursor-pointer flex items-center justify-center ${
                    !hasCommonTimeSlots || !selectedDay || loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!hasCommonTimeSlots || !selectedDay || loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            </div>
            {timeError && (
              <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-destructive text-destructive-foreground border border-destructive/20 rounded z-10">
                {timeError}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">15分単位で選択してください (00, 15, 30, 45)</p>
        </div>

        {/* 5. Время окончания (только для отображения) */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">終了時刻</Label>
          <Input
            type="text"
            placeholder="自動計算"
            value={selectedEndTime}
            readOnly
            className="w-full bg-muted/50 dark:bg-muted text-muted-foreground cursor-not-allowed"
          />
        </div>

        {/* 6. Выбор длительности */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">授業時間</Label>
          <div className="flex space-x-3">
            {durationOptions.map(duration => (
              <Button
                key={duration.value}
                variant={selectedDuration === duration.value ? "default" : "outline"}
                className={`flex-1 cursor-pointer ${
                  selectedDuration === duration.value
                    ? "bg-primary/20 dark:bg-primary/20 text-foreground border-primary"
                    : "hover:bg-accent dark:hover:bg-accent"
                } ${
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

        {/* 7. Дата начала */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">開始日付</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal hover:bg-accent dark:hover:bg-accent",
                  !selectedStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                {selectedStartDate ? (
                  format(new Date(selectedStartDate), 'yyyy年MM月dd日', { locale: ja })
                ) : (
                  <span>日付を選択</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedStartDate ? new Date(selectedStartDate) : undefined}
                onSelect={(date) => setSelectedStartDate(date ? format(date, 'yyyy-MM-dd') : null)}
                disabled={disableStartDate}
                locale={ja}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">今日から選択可能です</p>
        </div>

        {/* 8. Дата окончания */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">終了日付</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal hover:bg-accent dark:hover:bg-accent",
                  !selectedEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                {selectedEndDate ? (
                  format(new Date(selectedEndDate), 'yyyy年MM月dd日', { locale: ja })
                ) : (
                  <span>日付を選択（任意）</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedEndDate ? new Date(selectedEndDate) : undefined}
                onSelect={(date) => setSelectedEndDate(date ? format(date, 'yyyy-MM-dd') : null)}
                disabled={disableEndDate}
                locale={ja}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">開始日付から2年以内で選択可能です</p>
        </div>

        {/* 9. Кабинет */}
        <div className="min-h-[4.5rem]">
          <Label className="block text-sm font-medium mb-1 text-foreground">ブース</Label>
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
                    className="cursor-pointer hover:bg-accent dark:hover:bg-accent"
                  >
                    {booth.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled className="text-muted-foreground">
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