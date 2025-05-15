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
import {
  useTeacherCreate,
  useTeacherUpdate,
  DayOfWeek,
  SubjectTypePair,
} from "@/hooks/useTeacherMutation";
import { CreateUserTeacherSchema } from "@/schemas/teacher.schema";
import { useEvaluations } from "@/hooks/useEvaluationQuery";
import { TeacherDesiredTimeField } from "./teacher-desired-time-field";
import {
  TeacherShiftPreferencesSchema,
  TeacherShiftPreferencesInput,
} from "@/schemas/teacher-preferences.schema";
import { TeacherWithPreference } from "@/hooks/useTeacherQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { TeacherSubjectSelector } from "./teacher-subject-selector";

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

  const subjectList = useMemo(() => {
    return Array.isArray(subjects) ? subjects : subjects?.data ?? [];
  }, [subjects]);

  const subjectsCompatArray = useMemo(
    () =>
      subjectList.map((s: any) => ({
        subjectId: s.subjectId,
        name: s.name,
        subjectTypeId: s.subjectTypeId,
        notes: s.notes,
        subjectToSubjectTypes: s.subjectToSubjectTypes,
      })),
    [subjectList]
  );

  const teacherSubjectPairs = useMemo(() => {
    if (!teacher || !teacher.teacherSubjects) return [];
    return teacher.teacherSubjects.map((ts) => ({
      subjectId: ts.subjectId,
      subjectTypeId: ts.subjectTypeId,
    }));
  }, [teacher]);

  const isEditing = !!teacher;

  const editSchema = CreateUserTeacherSchema.extend({
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

  const defaultUsername = isEditing ? teacher?.email || "default_username" : "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: teacher?.name || "",
      evaluationId: teacher?.evaluationId || undefined,
      birthDate: teacher?.birthDate || undefined,
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
      username: defaultUsername,
      password: "",
      subjects: [],
    },
  });

  const teacherShifts = teacher?.TeacherShiftReference || [];

  const formattedShifts = teacherShifts.map((shift) => ({
    dayOfWeek: shift.dayOfWeek,
    startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
    endTime: new Date(shift.endTime).toTimeString().slice(0, 5),
  }));

  const preferencesForm = useForm<
    Omit<TeacherShiftPreferencesInput, "additionalNotes"> & {
      additionalNotes: string | null;
    }
  >({
    resolver: zodResolver(TeacherShiftPreferencesSchema),
    defaultValues: {
      dayOfWeek: teacher?.TeacherShiftReference?.[0]?.dayOfWeek || undefined,
      desiredTimes: formattedShifts || [],
      additionalNotes: teacher?.TeacherShiftReference?.[0]?.notes ?? null,
    },
  });

  const subjectsForm = useForm<{ subjectPairs: SubjectTypePair[] }>({
    defaultValues: {
      subjectPairs: teacherSubjectPairs || [],
    },
  });

  useEffect(() => {
    if (teacher) {
      const formattedShifts =
        teacher.TeacherShiftReference?.map((shift) => ({
          dayOfWeek: shift.dayOfWeek,
          startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
          endTime: new Date(shift.endTime).toTimeString().slice(0, 5),
        })) || [];

      preferencesForm.reset({
        dayOfWeek: teacher.TeacherShiftReference?.[0]?.dayOfWeek,
        desiredTimes: formattedShifts,
        additionalNotes: teacher.TeacherShiftReference?.[0]?.notes || null,
      });

      const subjectPairs =
        teacher.teacherSubjects?.map((ts) => ({
          subjectId: ts.subjectId,
          subjectTypeId: ts.subjectTypeId,
        })) || [];

      subjectsForm.setValue("subjectPairs", subjectPairs);
    }
  }, [teacher, preferencesForm, subjectsForm]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getBirthDateString = (value: unknown) => {
    if (typeof value === "string") return value.slice(0, 10);
    if (value instanceof Date && !isNaN(value.getTime()))
      return formatDate(value);
    return "";
  };

  const ensureDayOfWeekEnum = (day: string): DayOfWeek => {
    const validDays: DayOfWeek[] = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ];
    const upperDay = day.toUpperCase() as DayOfWeek;

    if (validDays.includes(upperDay)) {
      return upperDay;
    }

    console.warn(`Invalid day of week: ${day}, defaulting to MONDAY`);
    return "MONDAY";
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const shifts = preferencesForm.getValues().desiredTimes.map((time) => {
        const noteVal = preferencesForm.getValues().additionalNotes;
        return {
          dayOfWeek: ensureDayOfWeekEnum(time.dayOfWeek),
          startTime: time.startTime,
          endTime: time.endTime,
          notes: noteVal,
        };
      });

      const subjectPairs = subjectsForm.getValues().subjectPairs;

      const birthDateStr = values.birthDate
        ? typeof values.birthDate === "string"
          ? values.birthDate
          : values.birthDate instanceof Date
          ? values.birthDate.toISOString().split("T")[0]
          : ""
        : new Date().toISOString().split("T")[0];

      onOpenChange(false);

      form.reset();
      preferencesForm.reset();
      subjectsForm.reset();

      if (isEditing && teacher) {
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
          subjects: subjectPairs.length > 0 ? subjectPairs : undefined,
          shifts: shifts.length > 0 ? shifts : undefined,
        };
        updateTeacherMutation.mutate(updatePayload);
      } else {
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
          password: values.password || "",
          subjects: subjectPairs.length > 0 ? subjectPairs : undefined,
          shifts: shifts.length > 0 ? shifts : undefined,
        };
        createTeacherMutation.mutate(createPayload);
      }
    } catch (error) {
      console.error("Error saving teacher:", error);
      setIsSubmitting(false);
    }
  }

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
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                        名前
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="講師の名前を入力"
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
                      <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                        メールアドレス
                      </FormLabel>
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
                          placeholder="大学名を入力"
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
                          <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                            ログインID
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ログインIDを入力"
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
                          <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                            パスワード
                          </FormLabel>
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

          <TabsContent value="subjects" className="min-h-[400px]">
            <Form {...subjectsForm}>
              <form className="space-y-4 h-full">
              <TeacherSubjectSelector 
                form={subjectsForm}
                subjects={subjectsCompatArray}
                initialSubjectPairs={teacherSubjectPairs}
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
            onClick={() => {
              const shifts = preferencesForm.getValues().desiredTimes.map((time) => {
                const noteVal = preferencesForm.getValues().additionalNotes;
                return {
                  dayOfWeek: ensureDayOfWeekEnum(time.dayOfWeek),
                  startTime: time.startTime,
                  endTime: time.endTime,
                  notes: noteVal,
                };
              });

              const subjectPairs = subjectsForm.getValues().subjectPairs;

              form.handleSubmit(onSubmit)();
            }}
          >
            {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}