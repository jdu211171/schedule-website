"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import {
  type CreateClassSessionPayload,
  type NewClassSessionData,
  formatDateToString,
} from "./types/class-session";
import {
  SearchableSelect,
  type SearchableSelectItem,
} from "../searchable-select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

function DateRangePicker({
  dateRange,
  setDateRange,
  placeholder = "期間を選択",
}: {
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);

  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTempRange(dateRange);
    }
  };

  const handleApply = () => {
    setDateRange(tempRange);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal text-sm",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MM/dd", { locale: ja })} -{" "}
                  {format(dateRange.to, "MM/dd", { locale: ja })}
                </>
              ) : (
                format(dateRange.from, "MM/dd", { locale: ja })
              )
            ) : (
              placeholder
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        style={{
          zIndex: 9999,
          position: "relative",
          pointerEvents: "auto",
        }}
        align="start"
        side="bottom"
        sideOffset={8}
        forceMount
      >
        <div className="flex flex-col">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={tempRange?.from}
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={1}
            locale={ja}
            showOutsideDays={false}
            className="rounded-md border-b pointer-events-auto"
          />
          <div className="flex justify-between items-center p-2 bg-background border-t">
            <div className="text-xs text-muted-foreground flex-1 mr-2">
              {tempRange?.from && tempRange?.to && (
                <>
                  {format(tempRange.from, "yyyy/MM/dd", { locale: ja })} -{" "}
                  {format(tempRange.to, "yyyy/MM/dd", { locale: ja })}
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!tempRange?.from || !tempRange?.to}
            >
              適用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Booth {
  boothId: string;
  name: string;
}

type CreateLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonData: NewClassSessionData;
  onSave: (data: CreateClassSessionPayload) => Promise<void> | void;
  booths: Booth[];
};

interface Teacher {
  teacherId: string;
  name: string;
}

interface Student {
  studentId: string;
  name: string;
  studentTypeId?: string;
}

interface Subject {
  subjectId: string;
  name: string;
}

interface ClassType {
  classTypeId: string;
  name: string;
}

interface StudentType {
  studentTypeId: string;
  name: string;
  maxYears?: number;
  description?: string;
}

export const CreateLessonDialog: React.FC<CreateLessonDialogProps> = ({
  open,
  onOpenChange,
  lessonData,
  onSave,
  booths,
}) => {
  const [selectedClassTypeId, setSelectedClassTypeId] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [studentTypeId, setStudentTypeId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);

  const [isLoadingStudentTypes, setIsLoadingStudentTypes] =
    useState<boolean>(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState<boolean>(false);
  const [isLoadingClassTypes, setIsLoadingClassTypes] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [regularClassTypeId, setRegularClassTypeId] = useState<string>("");
  const [isRecurringOpen, setIsRecurringOpen] = useState<boolean>(false);

  // All useEffect blocks remain the same
  useEffect(() => {
    const loadClassTypes = async () => {
      setIsLoadingClassTypes(true);
      try {
        const response = await fetcher<{ data: ClassType[] }>(
          "/api/class-types"
        );
        setClassTypes(response.data || []);

        const regularType = response.data.find(
          (type) => type.name === "通常授業"
        );

        if (regularType) {
          setRegularClassTypeId(regularType.classTypeId);
          setSelectedClassTypeId(regularType.classTypeId);
        }
      } catch (err) {
        console.error("授業タイプの読み込みエラー:", err);
        setError("授業タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingClassTypes(false);
      }
    };

    if (open) {
      loadClassTypes();
    }
  }, [open]);

  useEffect(() => {
    const loadStudentTypes = async () => {
      setIsLoadingStudentTypes(true);
      try {
        const response = await fetcher<{ data: StudentType[] }>(
          "/api/student-types"
        );
        setStudentTypes(response.data || []);
      } catch (err) {
        console.error("生徒タイプの読み込みエラー:", err);
        setError("生徒タイプの読み込みに失敗しました");
      } finally {
        setIsLoadingStudentTypes(false);
      }
    };

    if (open) {
      loadStudentTypes();
    }
  }, [open]);

  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetcher<{ data: Subject[] }>("/api/subjects");
        setSubjects(response.data || []);
      } catch (err) {
        console.error("科目の読み込みエラー:", err);
        setError("科目の読み込みに失敗しました");
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    if (open && studentId) {
      loadSubjects();
    }
  }, [open, studentId]);

  useEffect(() => {
    if (open) {
      setIsRecurring(false);
      setStudentTypeId("");
      setStudentId("");
      setSubjectId("");
      setTeacherId("");
      setNotes("");
      const lessonDate =
        typeof lessonData.date === "string"
          ? new Date(lessonData.date)
          : lessonData.date;
      setDateRange({ from: lessonDate, to: undefined });
      setSelectedDays([]);
      setError(null);
      setIsRecurringOpen(false);
    }
  }, [open, lessonData.date]);

  const loadStudentsByType = useCallback(
    async (selectedStudentTypeId: string) => {
      if (!selectedStudentTypeId) return;

      setIsLoadingStudents(true);
      setStudents([]);
      setStudentId("");

      try {
        const url = selectedStudentTypeId
          ? `/api/students?studentTypeId=${selectedStudentTypeId}`
          : "/api/students";

        const response = await fetcher<{ data: Student[] }>(url);
        setStudents(response.data || []);
      } catch (err) {
        console.error("生徒の読み込みエラー:", err);
        setError("生徒を読み込めませんでした");
      } finally {
        setIsLoadingStudents(false);
      }
    },
    []
  );

  const loadTeachers = useCallback(async () => {
    setIsLoadingTeachers(true);
    setTeachers([]);
    setTeacherId("");

    try {
      const response = await fetcher<{ data: Teacher[] }>("/api/teachers");
      setTeachers(response.data || []);
    } catch (err) {
      console.error("講師の読み込みエラー:", err);
      setError("講師を読み込めませんでした");
    } finally {
      setIsLoadingTeachers(false);
    }
  }, []);

  useEffect(() => {
    if (studentTypeId) {
      loadStudentsByType(studentTypeId);
    } else {
      setStudents([]);
      setStudentId("");
    }
  }, [studentTypeId, loadStudentsByType]);

  useEffect(() => {
    if (studentId) {
      if (!subjects.length) {
        const loadSubjects = async () => {
          setIsLoadingSubjects(true);
          try {
            const response = await fetcher<{ data: Subject[] }>(
              "/api/subjects"
            );
            setSubjects(response.data || []);
          } catch (err) {
            console.error("科目の読み込みエラー:", err);
            setError("科目の読み込みに失敗しました");
          } finally {
            setIsLoadingSubjects(false);
          }
        };

        loadSubjects();
      }

      if (!teachers.length) {
        loadTeachers();
      }
    }
  }, [studentId, subjects.length, teachers.length, loadTeachers]);

  useEffect(() => {
    const newIsRecurring = selectedClassTypeId === regularClassTypeId;
    setIsRecurring(newIsRecurring);
    setIsRecurringOpen(newIsRecurring);
  }, [selectedClassTypeId, regularClassTypeId]);

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSubmit = () => {
    if (
      !studentId ||
      !subjectId ||
      !teacherId ||
      !selectedClassTypeId ||
      !dateRange?.from
    ) {
      return;
    }

    const payload: CreateClassSessionPayload = {
      date: formatDateToString(lessonData.date),
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
      boothId: lessonData.boothId,
      subjectId: subjectId,
      teacherId: teacherId,
      studentId: studentId,
      notes: notes || "",
      classTypeId: selectedClassTypeId,
    };

    if (isRecurring) {
      payload.isRecurring = true;
      payload.startDate = format(dateRange.from, "yyyy-MM-dd");

      if (dateRange.to) {
        payload.endDate = format(dateRange.to, "yyyy-MM-dd");
      }

      if (selectedDays.length > 0) {
        payload.daysOfWeek = selectedDays;
      } else {
        const dayOfWeek = dateRange.from.getDay();
        payload.daysOfWeek = [dayOfWeek];
      }
    }

    console.log("------ ДАННЫЕ ИЗ ДИАЛОГА -------");
    console.log(JSON.stringify(payload, null, 2));
    console.log("--------------------------------------------");

    onSave(payload);
    onOpenChange(false);
  };

  const isLoading =
    isLoadingStudentTypes ||
    isLoadingStudents ||
    isLoadingSubjects ||
    isLoadingTeachers ||
    isLoadingClassTypes;

  const daysOfWeek = [
    { label: "月", value: 1 },
    { label: "火", value: 2 },
    { label: "水", value: 3 },
    { label: "木", value: 4 },
    { label: "金", value: 5 },
    { label: "土", value: 6 },
    { label: "日", value: 0 },
  ];

  // Convert data for SearchableSelect
  const classTypeItems: SearchableSelectItem[] = classTypes.map((type) => ({
    value: type.classTypeId,
    label: type.name,
  }));

  const studentTypeItems: SearchableSelectItem[] = studentTypes.map((type) => ({
    value: type.studentTypeId,
    label: type.name,
    description: type.description,
  }));

  const studentItems: SearchableSelectItem[] = students.map((student) => ({
    value: student.studentId,
    label: student.name,
  }));

  const subjectItems: SearchableSelectItem[] = subjects.map((subject) => ({
    value: subject.subjectId,
    label: subject.name,
  }));

  const teacherItems: SearchableSelectItem[] = teachers.map((teacher) => ({
    value: teacher.teacherId,
    label: teacher.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-x-hidden overflow-y-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-lg">授業の作成</DialogTitle>
          <DialogDescription className="text-sm">
            新しい授業の情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1">
          <div className="space-y-4 pb-4">
            {/* Basic Info Card */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  基本情報
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">
                      日付
                    </label>
                    <div className="border rounded p-2 bg-muted/50 text-foreground">
                      {format(
                        typeof lessonData.date === "string"
                          ? new Date(lessonData.date)
                          : lessonData.date,
                        "MM/dd",
                        { locale: ja }
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">
                      教室
                    </label>
                    <div className="border rounded p-2 bg-muted/50 text-foreground truncate">
                      {booths.find(
                        (booth) => booth.boothId === lessonData.boothId
                      )?.name || lessonData.boothId}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">
                      開始
                    </label>
                    <div className="border rounded p-2 bg-muted/50 text-foreground">
                      {lessonData.startTime}
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">
                      終了
                    </label>
                    <div className="border rounded p-2 bg-muted/50 text-foreground">
                      {lessonData.endTime}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Type */}
            <div className="space-y-2">
              <Label
                htmlFor="class-type-select"
                className="text-sm font-medium text-foreground"
              >
                授業のタイプ <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                value={selectedClassTypeId}
                onValueChange={setSelectedClassTypeId}
                items={classTypeItems}
                placeholder="授業タイプを選択"
                searchPlaceholder="授業タイプを検索..."
                emptyMessage="授業タイプが見つかりません"
                loading={isLoadingClassTypes}
                disabled={isLoadingClassTypes || classTypes.length === 0}
              />
            </div>

            {/* Recurring Settings */}
            {isRecurring && (
              <Collapsible
                open={isRecurringOpen}
                onOpenChange={setIsRecurringOpen}
              >
                <Card className="border-primary/20">
                  <CardContent className="p-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto font-medium text-sm"
                      >
                        <span className="text-primary">繰り返し設定</span>
                        {isRecurringOpen ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-3 mt-3">
                      <div>
                        <Label className="text-sm font-medium mb-2 block text-foreground">
                          期間 <span className="text-destructive">*</span>
                        </Label>
                        <DateRangePicker
                          dateRange={dateRange}
                          setDateRange={setDateRange}
                          placeholder="期間を選択"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block text-foreground">
                          曜日を選択
                        </Label>
                        <div className="grid grid-cols-7 gap-1">
                          {daysOfWeek.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => handleDayToggle(day.value)}
                              className={`
                                h-8 rounded flex items-center justify-center text-xs font-medium
                                transition-colors duration-200
                                ${
                                  selectedDays.includes(day.value)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground border border-input hover:bg-muted/80"
                                }
                              `}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs mt-2 text-muted-foreground">
                          {selectedDays.length === 0
                            ? "未選択の場合、選択した日付の曜日が使用されます"
                            : `選択: ${selectedDays
                                .map(
                                  (d) =>
                                    daysOfWeek.find((day) => day.value === d)
                                      ?.label
                                )
                                .join(", ")}`}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            )}

            {/* Student Selection */}
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="student-type-select"
                  className="text-sm font-medium mb-2 block text-foreground"
                >
                  生徒タイプ <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  value={studentTypeId}
                  onValueChange={setStudentTypeId}
                  items={studentTypeItems}
                  placeholder="生徒タイプを選択"
                  searchPlaceholder="生徒タイプを検索..."
                  emptyMessage="生徒タイプが見つかりません"
                  loading={isLoadingStudentTypes}
                  disabled={isLoadingStudentTypes}
                />
              </div>

              <div>
                <Label
                  htmlFor="student-select"
                  className="text-sm font-medium mb-2 block text-foreground"
                >
                  生徒 <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  value={studentId}
                  onValueChange={setStudentId}
                  items={studentItems}
                  placeholder={
                    isLoadingStudents
                      ? "生徒を読み込み中..."
                      : !studentTypeId
                      ? "先に生徒タイプを選択してください"
                      : students.length === 0
                      ? "この生徒タイプの生徒はいません"
                      : "生徒を選択"
                  }
                  searchPlaceholder="生徒を検索..."
                  emptyMessage="生徒が見つかりません"
                  loading={isLoadingStudents}
                  disabled={
                    isLoadingStudents || !studentTypeId || students.length === 0
                  }
                />
              </div>
            </div>

            {/* Subject and Teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="subject-select"
                  className="text-sm font-medium mb-2 block text-foreground"
                >
                  科目 <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  value={subjectId}
                  onValueChange={setSubjectId}
                  items={subjectItems}
                  placeholder={
                    isLoadingSubjects
                      ? "科目を読み込み中..."
                      : !studentId
                      ? "先に生徒を選択してください"
                      : subjects.length === 0
                      ? "科目がありません"
                      : "科目を選択"
                  }
                  searchPlaceholder="科目を検索..."
                  emptyMessage="科目が見つかりません"
                  loading={isLoadingSubjects}
                  disabled={
                    isLoadingSubjects || !studentId || subjects.length === 0
                  }
                />
              </div>

              <div>
                <Label
                  htmlFor="teacher-select"
                  className="text-sm font-medium mb-2 block text-foreground"
                >
                  講師 <span className="text-destructive">*</span>
                </Label>
                <SearchableSelect
                  value={teacherId}
                  onValueChange={setTeacherId}
                  items={teacherItems}
                  placeholder={
                    isLoadingTeachers
                      ? "講師を読み込み中..."
                      : !studentId
                      ? "先に生徒を選択してください"
                      : teachers.length === 0
                      ? "講師はいません"
                      : "講師を選択"
                  }
                  searchPlaceholder="講師を検索..."
                  emptyMessage="講師が見つかりません"
                  loading={isLoadingTeachers}
                  disabled={
                    isLoadingTeachers || !studentId || teachers.length === 0
                  }
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label
                htmlFor="notes"
                className="text-sm font-medium mb-2 block text-foreground"
              >
                メモ
              </Label>
              <textarea
                id="notes"
                className="w-full h-20 p-2 border rounded-md bg-background text-foreground hover:border-accent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors border-input text-sm resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="授業に関するメモを入力してください"
              />
            </div>

            {error && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !studentTypeId ||
                !studentId ||
                !subjectId ||
                !teacherId ||
                !selectedClassTypeId
              }
            >
              {isLoading ? "読み込み中..." : "作成"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
