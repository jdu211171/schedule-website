"use client";

import { useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeacherCreate, useTeacherUpdate, DayOfWeek } from "@/hooks/useTeacherMutation";
import {
  CreateUserTeacherSchema,
} from "@/schemas/teacher.schema";
import { useEvaluations } from "@/hooks/useEvaluationQuery";
import { TeacherDesiredTimeField } from "./teacher-desired-time-field";
import {
  TeacherShiftPreferencesSchema,
  TeacherShiftPreferencesInput,
} from "@/schemas/teacher-preferences.schema";
import { TeacherWithPreference } from "@/hooks/useTeacherQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: TeacherWithPreference | null;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const createTeacherMutation = useTeacherCreate();
  const updateTeacherMutation = useTeacherUpdate();
  const { data: response } = useEvaluations();
  const evaluations = response?.data ?? [];
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();

  // Create a searchable list of subjects
  const subjectList = useMemo(() => {
    return Array.isArray(subjects)
      ? subjects
      : (subjects?.data ?? []);
  }, [subjects]);

  // Get teacher subjects (if editing)
  const teacherSubjectIds = useMemo(() => {
    if (!teacher || !teacher.teacherSubjects) return [];
    return teacher.teacherSubjects.map(ts => ts.subjectId);
  }, [teacher]);

  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const isEditing = !!teacher;

  // Update schema for edit mode to make username optional
  const editSchema = CreateUserTeacherSchema.extend({
    // Make username optional in edit mode
    username: z.string().min(3).max(50).optional(),
    password: z
      .string()
      .transform((val) => (val === "" ? undefined : val))
      .refine((val) => !val || val.length >= 6, {
        message: "パスワードは6文字以上である必要があります",
      })
      .optional(),
  });

  const formSchema = isEditing ? editSchema : CreateUserTeacherSchema;

  // Use teacher email for username if we're in edit mode
  const defaultUsername = isEditing ? (teacher?.email || "default_username") : "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: teacher?.name || "",
      evaluationId: teacher?.evaluationId || undefined,
      // Ensure birthDate is a Date or undefined
      birthDate: teacher?.birthDate ? new Date(teacher.birthDate) : undefined,
      mobileNumber: teacher?.mobileNumber || "",
      email: teacher?.email || "",
      highSchool: teacher?.highSchool || "",
      university: teacher?.university || "",
      faculty: teacher?.faculty || "",
      department: teacher?.department || "",
      enrollmentStatus: teacher?.enrollmentStatus || "",
      otherUniversities: teacher?.otherUniversities || "",
      englishProficiency: teacher?.englishProficiency || "",
      toeic: teacher?.toeic || undefined,
      toefl: teacher?.toefl || undefined,
      mathCertification: teacher?.mathCertification || "",
      kanjiCertification: teacher?.kanjiCertification || "",
      otherCertifications: teacher?.otherCertifications || "",
      notes: teacher?.notes || "",
      username: defaultUsername, // Set default username for edit mode
      password: "",
      subjects: (teacherSubjectIds || []).map((subjectId) => ({ subjectId })),
    },
  });

  // Extract teacher shift preferences
  const teacherShifts = teacher?.TeacherShiftReference || [];

  // Convert time format for the preferences form
  const formattedShifts = teacherShifts.map(shift => ({
    dayOfWeek: shift.dayOfWeek,
    startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
    endTime: new Date(shift.endTime).toTimeString().slice(0, 5)
  }));

  // Preferences form
  const preferencesForm = useForm<Omit<TeacherShiftPreferencesInput, 'additionalNotes'> & { additionalNotes: string | null }>({
    resolver: zodResolver(TeacherShiftPreferencesSchema),
    defaultValues: {
      dayOfWeek: teacher?.TeacherShiftReference?.[0]?.dayOfWeek || undefined,
      desiredTimes: formattedShifts || [],
      additionalNotes: teacher?.TeacherShiftReference?.[0]?.notes ?? null,
    },
  });

  // Subjects form
  const subjectsForm = useForm<{ subjects: string[] }>({
    defaultValues: {
      subjects: teacherSubjectIds || [],
    },
  });

  // Reset preferences form when teacher data changes
  useEffect(() => {
    if (teacher) {
      const formattedShifts = teacher.TeacherShiftReference?.map(shift => ({
        dayOfWeek: shift.dayOfWeek,
        startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
        endTime: new Date(shift.endTime).toTimeString().slice(0, 5)
      })) || [];

      preferencesForm.reset({
        dayOfWeek: teacher.TeacherShiftReference?.[0]?.dayOfWeek,
        desiredTimes: formattedShifts,
        additionalNotes: teacher.TeacherShiftReference?.[0]?.notes || null,
      });

      // Reset subjects form
      const teacherSubjectIds = teacher.teacherSubjects?.map(ts => ts.subjectId) || [];
      subjectsForm.reset({
        subjects: teacherSubjectIds,
      });
    }
  }, [teacher, preferencesForm, subjectsForm]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getBirthDateString = (value: unknown) => {
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date && !isNaN(value.getTime())) return formatDate(value);
    return "";
  };

  // Helper function to ensure dayOfWeek is a valid enum value
  const ensureDayOfWeekEnum = (day: string): DayOfWeek => {
    const validDays: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    const upperDay = day.toUpperCase() as DayOfWeek;

    if (validDays.includes(upperDay)) {
      return upperDay;
    }

    // Default to Monday if invalid
    console.warn(`Invalid day of week: ${day}, defaulting to MONDAY`);
    return "MONDAY";
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Get shift preferences with properly formatted dayOfWeek enum values
      const shifts = preferencesForm.getValues().desiredTimes.map(time => {
        const noteVal = preferencesForm.getValues().additionalNotes;
        return {
          dayOfWeek: ensureDayOfWeekEnum(time.dayOfWeek),
          startTime: time.startTime,
          endTime: time.endTime,
          notes: noteVal,
        };
      });

      // Get selected subjects
      const subjects = subjectsForm.getValues().subjects;

      // Convert birthDate to ISO string (YYYY-MM-DD)
      const birthDateStr = values.birthDate
        ? (typeof values.birthDate === 'string'
            ? values.birthDate
            : values.birthDate instanceof Date
              ? values.birthDate.toISOString().split('T')[0]
              : '')
        : new Date().toISOString().split('T')[0];

      if (isEditing && teacher) {
        // Update mode: build UpdateTeacherInput
        const updatePayload = {
          teacherId: teacher.teacherId,
          name: values.name || undefined,
          evaluationId: values.evaluationId || undefined,
          birthDate: birthDateStr,
          mobileNumber: values.mobileNumber || undefined,
          email: values.email || undefined,
          highSchool: values.highSchool || undefined,
          university: values.university || undefined,
          faculty: values.faculty || undefined,
          department: values.department || undefined,
          enrollmentStatus: values.enrollmentStatus || undefined,
          otherUniversities: values.otherUniversities || undefined,
          englishProficiency: values.englishProficiency || undefined,
          toeic: values.toeic ?? undefined,
          toefl: values.toefl ?? undefined,
          mathCertification: values.mathCertification || undefined,
          kanjiCertification: values.kanjiCertification || undefined,
          otherCertifications: values.otherCertifications || undefined,
          notes: values.notes || undefined,
          password: values.password || undefined,
          subjects: subjects.length > 0 ? subjects : undefined,
          shifts: shifts.length > 0 ? shifts : undefined,
        };
        await updateTeacherMutation.mutateAsync(updatePayload);
      } else {
        // Create mode: build CreateTeacherInput
        const createPayload = {
          name: values.name,
          evaluationId: values.evaluationId,
          birthDate: birthDateStr,
          mobileNumber: values.mobileNumber,
          email: values.email,
          highSchool: values.highSchool,
          university: values.university,
          faculty: values.faculty,
          department: values.department,
          enrollmentStatus: values.enrollmentStatus,
          otherUniversities: values.otherUniversities || undefined,
          englishProficiency: values.englishProficiency || undefined,
          toeic: values.toeic ?? undefined,
          toefl: values.toefl ?? undefined,
          mathCertification: values.mathCertification || undefined,
          kanjiCertification: values.kanjiCertification || undefined,
          otherCertifications: values.otherCertifications || undefined,
          notes: values.notes || undefined,
          username: values.username || values.email,
          password: values.password || '',
          subjects: subjects.length > 0 ? subjects : undefined,
          shifts: shifts.length > 0 ? shifts : undefined,
        };
        await createTeacherMutation.mutateAsync(createPayload);
      }

      onOpenChange(false);
      form.reset();
      preferencesForm.reset();
      subjectsForm.reset();
    } catch (error) {
      console.error("Error saving teacher:", error);
      // Display error to user
      alert("保存に失敗しました。入力内容を確認してください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading state
  const isLoading = subjectsLoading;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>データを読み込み中...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          preferencesForm.reset();
          subjectsForm.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "講師の編集" : "講師の作成"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="subjects">担当科目</TabsTrigger>
            <TabsTrigger value="shifts">シフト設定</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名前</FormLabel>
                      <FormControl>
                        <Input placeholder="講師の名前を入力" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="evaluationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>評価</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === "none" ? null : value)
                          }
                          value={field.value || "none"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="評価を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">未選択</SelectItem>
                            {evaluations.map((evaluation) => (
                              <SelectItem
                                key={evaluation.evaluationId}
                                value={evaluation.evaluationId}
                              >
                                {evaluation.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>生年月日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          // Ensure we always have a valid string value
                          value={
                            getBirthDateString(field.value)
                          }
                          onChange={(e) => {
                            field.onChange(e.target.value || undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>携帯電話番号</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="携帯電話番号を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メールアドレス</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="メールアドレスを入力"
                          type="email"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="highSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>出身高校</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="出身高校を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>大学</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="大学を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="faculty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学部</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="学部を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学科</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="学科を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enrollmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>在籍状況</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="在籍状況を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="在学中">在学中</SelectItem>
                            <SelectItem value="卒業">卒業</SelectItem>
                            <SelectItem value="休学中">休学中</SelectItem>
                            <SelectItem value="中退">中退</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherUniversities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>その他の大学</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="その他の大学を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="englishProficiency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>英語能力</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="英語能力を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ネイティブ">
                              ネイティブ
                            </SelectItem>
                            <SelectItem value="ビジネス">ビジネス</SelectItem>
                            <SelectItem value="日常会話">日常会話</SelectItem>
                            <SelectItem value="基礎">基礎</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toeic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TOEIC</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="TOEICスコアを入力"
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value, 10);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toefl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TOEFL</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="TOEFLスコアを入力"
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value, 10);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mathCertification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数学検定</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="数学検定を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kanjiCertification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>漢字検定</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="漢字検定を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherCertifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>その他資格</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="その他の資格を入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isEditing && (
                  <>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ユーザー名</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ユーザー名を入力"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>パスワード</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="パスワードを入力"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                {isEditing && (
                  <>
                    {/* Hidden username field for validation in edit mode */}
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>新しいパスワード (変更する場合のみ)</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="新しいパスワードを入力"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メモ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="メモを入力"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="subjects">
            <Form {...subjectsForm}>
              <form className="space-y-4">
                <FormField
                  control={subjectsForm.control}
                  name="subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>担当科目</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="科目を検索..."
                            className="w-full"
                            value={subjectSearchTerm}
                            onChange={(e) => {
                              setSubjectSearchTerm(e.target.value);
                              setShowSubjectDropdown(
                                e.target.value.trim() !== ""
                              );
                            }}
                            onFocus={() => {
                              if (subjectSearchTerm.trim() !== "") {
                                setShowSubjectDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(
                                () => setShowSubjectDropdown(false),
                                200
                              );
                            }}
                          />
                        </FormControl>
                        {showSubjectDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                            {subjectList
                              .filter((subject) =>
                                subject.name
                                  .toLowerCase()
                                  .includes(subjectSearchTerm.toLowerCase())
                              )
                              .map((subject) => (
                                <div
                                  key={subject.subjectId}
                                  className="p-2 hover:bg-accent cursor-pointer"
                                  onClick={() => {
                                    const currentValues = field.value || [];
                                    if (
                                      !currentValues.includes(subject.subjectId)
                                    ) {
                                      field.onChange([
                                        ...currentValues,
                                        subject.subjectId,
                                      ]);
                                    }
                                    setSubjectSearchTerm("");
                                    setShowSubjectDropdown(false);
                                  }}
                                >
                                  {subject.name}
                                </div>
                              ))}
                            {subjectList.filter((subject) =>
                              subject.name
                                .toLowerCase()
                                .includes(subjectSearchTerm.toLowerCase())
                            ).length === 0 && (
                              <div className="p-2 text-muted-foreground">
                                該当する科目が見つかりません
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(field.value || []).map((subjectId, index) => {
                          const subject = subjectList.find(
                            (s) => s.subjectId === subjectId
                          );
                          return (
                            <div
                              key={index}
                              className="flex items-center bg-accent rounded-md px-2 py-1"
                            >
                              <span>{subject ? subject.name : subjectId}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 ml-1"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="shifts">
            <Form {...preferencesForm}>
              <form className="space-y-4">
                <TeacherDesiredTimeField form={preferencesForm} />
                <FormField
                  control={preferencesForm.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>追加メモ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="シフトに関する追加情報や特記事項"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              try {
                // Set the flag to show we're starting submission process
                setIsSubmitting(true);

                console.log("Save button clicked");

                // Manually validate the main form
                const isMainFormValid = await form.trigger();

                // Log the current form errors
                console.log("Validation errors:", form.formState.errors);

                // Log each specific error for debugging
                if (form.formState.errors && Object.keys(form.formState.errors).length > 0) {
                  console.log("Validation errors by field:");
                  Object.entries(form.formState.errors).forEach(([field, error]) => {
                    console.log(`Field "${field}" error:`, error);
                  });
                }

                if (!isMainFormValid) {
                  console.log("Main form validation failed - showing basic tab with errors");
                  setActiveTab("basic");
                  setIsSubmitting(false);
                  return;
                }

                // Get form values
                const formValues = form.getValues();

                // Convert birthDate to string format
                const birthDateStr = formValues.birthDate
                  ? (typeof formValues.birthDate === 'string'
                    ? formValues.birthDate
                    : formValues.birthDate instanceof Date
                      ? formValues.birthDate.toISOString().split('T')[0]
                      : '')
                  : new Date().toISOString().split('T')[0];

                // Get subjects
                const subjects = subjectsForm.getValues().subjects;

                // Get shift preferences with properly formatted dayOfWeek enum values
                const shifts = preferencesForm.getValues().desiredTimes.map(time => {
                  const noteVal = preferencesForm.getValues().additionalNotes;
                  return {
                    dayOfWeek: ensureDayOfWeekEnum(time.dayOfWeek),
                    startTime: time.startTime,
                    endTime: time.endTime,
                    notes: noteVal,
                  };
                });

                // Create the complete payload
                const payload = {
                  ...formValues,
                  birthDate: birthDateStr,
                  subjects,
                  shifts,
                  username: formValues.username || formValues.email,
                };

                // Clean up the payload - remove empty values
                const cleanedPayload: Record<string, unknown> = {};

                Object.entries(payload).forEach(([key, value]) => {
                  if (value !== undefined && value !== null && value !== '') {
                    cleanedPayload[key] = value;
                  }
                });

                console.log("Final payload being sent:", cleanedPayload);

                // Handle edit vs create case
                if (isEditing && teacher) {
                  const updateData = {
                    ...cleanedPayload,
                    teacherId: teacher.teacherId
                  };
                  // No need to check or delete password property here
                  console.log("About to update teacher with data:", updateData);
                  await updateTeacherMutation.mutateAsync(updateData as /* UpdateTeacherInput */ typeof updateData); // Specify the correct type here
                  console.log("Teacher update completed successfully");
                } else {
                  // Build a proper CreateTeacherInput object
                  const createPayload = {
                    name: formValues.name,
                    evaluationId: formValues.evaluationId,
                    birthDate: birthDateStr,
                    mobileNumber: formValues.mobileNumber,
                    email: formValues.email,
                    highSchool: formValues.highSchool,
                    university: formValues.university,
                    faculty: formValues.faculty,
                    department: formValues.department,
                    enrollmentStatus: formValues.enrollmentStatus,
                    otherUniversities: formValues.otherUniversities || undefined,
                    englishProficiency: formValues.englishProficiency || undefined,
                    toeic: formValues.toeic ?? undefined,
                    toefl: formValues.toefl ?? undefined,
                    mathCertification: formValues.mathCertification || undefined,
                    kanjiCertification: formValues.kanjiCertification || undefined,
                    otherCertifications: formValues.otherCertifications || undefined,
                    notes: formValues.notes || undefined,
                    username: formValues.username || formValues.email,
                    password: formValues.password || '',
                    subjects: subjects.length > 0 ? subjects : undefined,
                    shifts: shifts.length > 0 ? shifts : undefined,
                  };
                  await createTeacherMutation.mutateAsync(createPayload);
                }

                // Close dialog and reset forms on success
                onOpenChange(false);
                form.reset();
                preferencesForm.reset();
                subjectsForm.reset();
              } catch (error) {
                console.error("Error during form submission:", error);
                alert("保存に失敗しました。入力内容を確認してください。");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
