"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState, useCallback } from "react";
import { format, parseISO, addWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useClassSessionCreate,
  useClassSessionUpdate,
} from "@/hooks/useClassSessionMutation";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useBooths } from "@/hooks/useBoothQuery";
import { useClassTypes } from "@/hooks/useClassTypeQuery";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ClassSession } from "@prisma/client";

interface ClassSessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSession?: ClassSession | null;
  // Add filters to props so we can pre-populate fields
  filters?: {
    teacherId?: string;
    studentId?: string;
    subjectId?: string;
    classTypeId?: string;
    boothId?: string;
    startDate?: string;
    endDate?: string;
  };
}

// Extended form schema that includes recurring session fields
const formSchema = z.object({
  teacherId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
  classTypeId: z.string().optional().nullable(),
  boothId: z.string().optional().nullable(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number().optional(),
  notes: z.string().max(255).optional().nullable(),
  // Recurring session fields
  isRecurring: z.boolean().optional().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Day of week options for recurring sessions
const daysOfWeekOptions = [
  { id: 0, label: "日曜日" },
  { id: 1, label: "月曜日" },
  { id: 2, label: "火曜日" },
  { id: 3, label: "水曜日" },
  { id: 4, label: "木曜日" },
  { id: 5, label: "金曜日" },
  { id: 6, label: "土曜日" },
];

export function ClassSessionFormDialog({
  open,
  onOpenChange,
  classSession,
  filters = {},
}: ClassSessionFormDialogProps) {
  const createClassSessionMutation = useClassSessionCreate();
  const updateClassSessionMutation = useClassSessionUpdate();
  const isEditing = !!classSession;
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    classSession?.date && typeof classSession.date === "string"
      ? parseISO(classSession.date)
      : filters.startDate && typeof filters.startDate === "string"
      ? parseISO(filters.startDate)
      : new Date()
  );

  // Fetch reference data
  const { data: teachersData } = useTeachers({ limit: 100 });
  const { data: studentsData } = useStudents({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });
  const { data: classTypesData } = useClassTypes({ limit: 100 });
  const { data: boothsData } = useBooths({ limit: 100 });

  // Get default values based on filters or class session
  const getDefaultValues = useCallback(() => {
    if (classSession) {
      // If editing, use class session values
      return {
        teacherId: classSession.teacherId || "",
        studentId: classSession.studentId || "",
        subjectId: classSession.subjectId || "",
        classTypeId: classSession.classTypeId || "",
        boothId: classSession.boothId || "",
        date:
          typeof classSession.date === "string"
            ? classSession.date
            : format(new Date(), "yyyy-MM-dd"),
        startTime:
          typeof classSession.startTime === "string"
            ? classSession.startTime
            : "09:00",
        endTime:
          typeof classSession.endTime === "string"
            ? classSession.endTime
            : "10:00",
        duration: classSession.duration || 60,
        notes: classSession.notes || "",
        isRecurring: false, // Always false in edit mode
        daysOfWeek: [],
      };
    } else {
      // If creating, use filter values if available
      const today = new Date();
      return {
        teacherId: filters.teacherId || "",
        studentId: filters.studentId || "",
        subjectId: filters.subjectId || "",
        classTypeId: filters.classTypeId || "",
        boothId: filters.boothId || "",
        date: filters.startDate || format(today, "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "10:00",
        duration: 60,
        notes: "",
        isRecurring: false,
        startDate: filters.startDate || format(today, "yyyy-MM-dd"),
        endDate: format(
          addWeeks(
            typeof filters.startDate === "string"
              ? parseISO(filters.startDate)
              : today,
            4
          ),
          "yyyy-MM-dd"
        ),
        daysOfWeek: [],
      };
    }
  }, [classSession, filters]);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when class session or filters change
  useEffect(() => {
    form.reset(getDefaultValues());

    // Update selected date
    setSelectedDate(
      classSession?.date && typeof classSession.date === "string"
        ? parseISO(classSession.date)
        : filters.startDate && typeof filters.startDate === "string"
        ? parseISO(filters.startDate)
        : new Date()
    );

    // Editing mode doesn't support recurring sessions
    setIsRecurring(false);
  }, [classSession, filters, form, getDefaultValues]);

  // Handle recurring option change
  const handleRecurringChange = (value: boolean) => {
    setIsRecurring(value);
    form.setValue("isRecurring", value);

    // Initialize start/end dates if switching to recurring
    if (value) {
      const currentDate = form.getValues("date");
      form.setValue("startDate", currentDate);
      form.setValue(
        "endDate",
        format(
          addWeeks(
            typeof currentDate === "string"
              ? parseISO(currentDate)
              : new Date(),
            4
          ),
          "yyyy-MM-dd"
        )
      );

      // Initialize days of week with the current day
      const currentDayIndex =
        typeof currentDate === "string"
          ? parseISO(currentDate).getDay()
          : new Date(currentDate).getDay();
      form.setValue("daysOfWeek", [currentDayIndex]);
    }
  };

  // Handle day of week selection
  const handleDayOfWeekChange = (dayId: number, checked: boolean) => {
    const currentDays = form.getValues("daysOfWeek") || [];
    if (checked) {
      form.setValue("daysOfWeek", [...currentDays, dayId].sort());
    } else {
      form.setValue(
        "daysOfWeek",
        currentDays.filter((id) => id !== dayId)
      );
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      form.setValue("date", format(date, "yyyy-MM-dd"));
    }
  };

  function onSubmit(values: FormValues) {
    // Close the dialog immediately for better UX
    onOpenChange(false);

    // Handle special "none" values
    const formattedValues = {
      ...values,
      teacherId: values.teacherId === "none" ? null : values.teacherId,
      studentId: values.studentId === "none" ? null : values.studentId,
      subjectId: values.subjectId === "none" ? null : values.subjectId,
      classTypeId: values.classTypeId === "none" ? null : values.classTypeId,
      boothId: values.boothId === "none" ? null : values.boothId,
    };

    // Calculate duration if not specified
    if (!formattedValues.duration) {
      const start = formattedValues.startTime.split(":").map(Number);
      const end = formattedValues.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      formattedValues.duration = endMinutes - startMinutes;
    }

    if (isEditing && classSession) {
      // Update existing session
      updateClassSessionMutation.mutate({
        classId: classSession.classId,
        teacherId: formattedValues.teacherId,
        studentId: formattedValues.studentId,
        subjectId: formattedValues.subjectId,
        classTypeId: formattedValues.classTypeId,
        boothId: formattedValues.boothId,
        date: formattedValues.date,
        startTime: formattedValues.startTime,
        endTime: formattedValues.endTime,
        duration: formattedValues.duration,
        notes: formattedValues.notes,
      });
    } else {
      // Create new session(s)
      createClassSessionMutation.mutate({
        teacherId: formattedValues.teacherId,
        studentId: formattedValues.studentId,
        subjectId: formattedValues.subjectId,
        classTypeId: formattedValues.classTypeId,
        boothId: formattedValues.boothId,
        date: formattedValues.date,
        startTime: formattedValues.startTime,
        endTime: formattedValues.endTime,
        duration: formattedValues.duration,
        notes: formattedValues.notes,
        isRecurring: formattedValues.isRecurring,
        startDate: formattedValues.isRecurring
          ? formattedValues.startDate
          : undefined,
        endDate: formattedValues.isRecurring
          ? formattedValues.endDate
          : undefined,
        daysOfWeek: formattedValues.isRecurring
          ? formattedValues.daysOfWeek
          : undefined,
        checkAvailability: true,
        skipConflicts: false,
        forceCreate: false,
      });
    }

    // Reset form
    form.reset();
  }

  // Show active filters as badges at the top of the form
  const renderActiveFilters = () => {
    const activeFilters = Object.entries(filters).filter(
      ([, value]) => value !== undefined
    );

    if (activeFilters.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">現在のフィルター:</div>
        <div className="flex flex-wrap gap-2">
          {filters.startDate && (
            <Badge variant="outline" className="px-2 py-1">
              <CalendarIcon className="mr-1 h-3 w-3" />
              {format(parseISO(filters.startDate), "yyyy年MM月dd日", {
                locale: ja,
              })}
            </Badge>
          )}
          {filters.teacherId && teachersData?.data && (
            <Badge variant="outline" className="px-2 py-1">
              講師:{" "}
              {teachersData.data.find((t) => t.teacherId === filters.teacherId)
                ?.name || ""}
            </Badge>
          )}
          {filters.studentId && studentsData?.data && (
            <Badge variant="outline" className="px-2 py-1">
              生徒:{" "}
              {studentsData.data.find((s) => s.studentId === filters.studentId)
                ?.name || ""}
            </Badge>
          )}
          {filters.subjectId && subjectsData?.data && (
            <Badge variant="outline" className="px-2 py-1">
              科目:{" "}
              {subjectsData.data.find((s) => s.subjectId === filters.subjectId)
                ?.name || ""}
            </Badge>
          )}
          {filters.classTypeId && classTypesData?.data && (
            <Badge variant="outline" className="px-2 py-1">
              授業タイプ:{" "}
              {classTypesData.data.find(
                (c) => c.classTypeId === filters.classTypeId
              )?.name || ""}
            </Badge>
          )}
          {filters.boothId && boothsData?.data && (
            <Badge variant="outline" className="px-2 py-1">
              ブース:{" "}
              {boothsData.data.find((b) => b.boothId === filters.boothId)
                ?.name || ""}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog is closed
          form.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "授業の編集" : "新規授業作成"}</DialogTitle>
        </DialogHeader>

        {!isEditing && renderActiveFilters()}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Accordion
              type="single"
              collapsible
              defaultValue="basic-info"
              className="w-full"
            >
              {/* Basic Information Section */}
              <AccordionItem value="basic-info">
                <AccordionTrigger className="py-2">基本情報</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Teacher and Student fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Teacher field */}
                      <FormField
                        control={form.control}
                        name="teacherId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>講師</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || "none"}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="講師を選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">講師なし</SelectItem>
                                {teachersData?.data.map((teacher) => (
                                  <SelectItem
                                    key={teacher.teacherId}
                                    value={teacher.teacherId}
                                  >
                                    {teacher.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Student field */}
                      <FormField
                        control={form.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>生徒</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || "none"}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="生徒を選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">生徒なし</SelectItem>
                                {studentsData?.data.map((student) => (
                                  <SelectItem
                                    key={student.studentId}
                                    value={student.studentId}
                                  >
                                    {student.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Subject and Booth fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Subject field */}
                      <FormField
                        control={form.control}
                        name="subjectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>科目</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || "none"}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="科目を選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">科目なし</SelectItem>
                                {subjectsData?.data.map((subject) => (
                                  <SelectItem
                                    key={subject.subjectId}
                                    value={subject.subjectId}
                                  >
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Booth field */}
                      <FormField
                        control={form.control}
                        name="boothId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ブース</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || "none"}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="ブースを選択" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">ブースなし</SelectItem>
                                {boothsData?.data.map((booth) => (
                                  <SelectItem
                                    key={booth.boothId}
                                    value={booth.boothId}
                                  >
                                    {booth.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Class Type field */}
                    <FormField
                      control={form.control}
                      name="classTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>授業タイプ</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || "none"}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="授業タイプを選択" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">タイプなし</SelectItem>
                              {classTypesData?.data.map((classType) => (
                                <SelectItem
                                  key={classType.classTypeId}
                                  value={classType.classTypeId}
                                >
                                  {classType.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Schedule Section */}
              <AccordionItem value="schedule">
                <AccordionTrigger className="py-2">
                  スケジュール
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {/* Date field */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>日付</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(
                                      parseISO(field.value),
                                      "yyyy年MM月dd日",
                                      {
                                        locale: ja,
                                      }
                                    )
                                  ) : (
                                    <span>日付を選択</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                                locale={ja}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Time fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>開始時間</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>終了時間</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Notes Section */}
              <AccordionItem value="notes">
                <AccordionTrigger className="py-2">メモ</AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="メモを入力（任意）"
                              className="resize-none"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Recurring Section - only show in create mode */}
              {!isEditing && (
                <AccordionItem value="recurring">
                  <AccordionTrigger className="py-2">
                    繰り返し設定
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Recurring toggle */}
                      <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                繰り返し授業
                              </FormLabel>
                              <FormDescription>
                                定期的に繰り返す授業作成
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  handleRecurringChange(checked);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Recurring options - only show when isRecurring is true */}
                      {isRecurring && (
                        <div className="space-y-4">
                          {/* Start date field */}
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>開始日</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        type="button"
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value &&
                                            "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(
                                            parseISO(field.value),
                                            "yyyy年MM月dd日",
                                            { locale: ja }
                                          )
                                        ) : (
                                          <span>開始日を選択</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={
                                        field.value
                                          ? parseISO(field.value)
                                          : undefined
                                      }
                                      onSelect={(date) => {
                                        const dateStr = date
                                          ? format(date, "yyyy-MM-dd")
                                          : "";
                                        field.onChange(dateStr);
                                      }}
                                      disabled={(date) =>
                                        date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                      locale={ja}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* End date field */}
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>終了日</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        type="button"
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value &&
                                            "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(
                                            parseISO(field.value),
                                            "yyyy年MM月dd日",
                                            { locale: ja }
                                          )
                                        ) : (
                                          <span>終了日を選択</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={
                                        field.value
                                          ? parseISO(field.value)
                                          : undefined
                                      }
                                      onSelect={(date) => {
                                        const dateStr = date
                                          ? format(date, "yyyy-MM-dd")
                                          : "";
                                        field.onChange(dateStr);
                                      }}
                                      disabled={(date) =>
                                        date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                      locale={ja}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Days of week */}
                          <FormField
                            control={form.control}
                            name="daysOfWeek"
                            render={() => (
                              <FormItem>
                                <div className="mb-2 flex items-center">
                                  <FormLabel>曜日を選択</FormLabel>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="ml-2 h-4 w-4"
                                        >
                                          <InfoIcon className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          選択した曜日に繰り返し授業が作成されます
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {daysOfWeekOptions.map((day) => {
                                    const daysOfWeek =
                                      form.getValues("daysOfWeek") || [];
                                    return (
                                      <div
                                        key={day.id}
                                        className="flex items-center space-x-2"
                                      >
                                        <Checkbox
                                          id={`day-${day.id}`}
                                          checked={daysOfWeek.includes(day.id)}
                                          onCheckedChange={(checked) =>
                                            handleDayOfWeekChange(
                                              day.id,
                                              checked as boolean
                                            )
                                          }
                                        />
                                        <label
                                          htmlFor={`day-${day.id}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {day.label}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            <DialogFooter className="pt-2">
              <Button type="submit">{isEditing ? "更新" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
