"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useGrades } from "@/hooks/useGradeQuery";
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation";
import type { Student } from "@/schemas/student.schema";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useTeacherSubjects } from "@/hooks/useTeacherSubjectQuery";
import { StudentDesiredTimeField } from "./student-desired-time-field";
import {
  CreateUserStudentSchema,
  studentPreferencesSchema,
  StudentPreference,
} from "@/schemas/student.schema";
import { TeacherSubject } from "@prisma/client";
import { StudentSubjectSelector, TeacherSelector } from "./student-selector";

// Define the type for the props, including the preference structure from the API
interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?:
    | (Student & {
        StudentPreference?: Array<{
          preferenceId: string;
          studentId: string;
          classTypeId: string;
          notes: string | null;
          createdAt: string;
          updatedAt: string;
          subjects?: Array<{ subjectId: string; subjectTypeId: string }>;
          teachers?: Array<{ teacherId: string }>;
          timeSlots?: Array<{
            dayOfWeek: string;
            startTime: string;
            endTime: string;
          }>;
        }>;
      })
    | null;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const createStudentMutation = useStudentCreate();
  const updateStudentMutation = useStudentUpdate();

  const isEditing = !!student;
  const { data: grades = [], isLoading: gradesLoading } = useGrades();
  const { data: teachers = [], isLoading: teachersLoading } = useTeachers({});
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: teacherSubjects = [], isLoading: teacherSubjectsLoading } =
    useTeacherSubjects({});

  // Create a modified schema for edit mode
  const editSchema = CreateUserStudentSchema.extend({
    username: z.string().min(3).max(50).optional(),
    password: z
      .string()
      .transform((val) => (val === "" ? undefined : val))
      .refine((val) => !val || val.length >= 6, {
        message: "パスワードは6文字以上である必要があります",
      })
      .optional(),
  });

  const formSchema = isEditing ? editSchema : CreateUserStudentSchema;

  // Memoize arrays to avoid dependency issues in useMemo
  const gradesArray = useMemo(
    () => (Array.isArray(grades) ? grades : grades?.data ?? []),
    [grades]
  );
  const teachersArray = useMemo(
    () => (Array.isArray(teachers) ? teachers : teachers?.data ?? []),
    [teachers]
  );
  const subjectsArray = useMemo(
    () => (Array.isArray(subjects) ? subjects : subjects?.data ?? []),
    [subjects]
  );
  const teacherSubjectsArray = useMemo(
    () =>
      Array.isArray(teacherSubjects)
        ? teacherSubjects
        : teacherSubjects?.data ?? [],
    [teacherSubjects]
  );

  // Helper type for subject compatibility
  interface SubjectCompat {
    subjectId: string;
    name: string;
    subjectTypeId?: string;
    notes?: string | null;
    subjectToSubjectTypes?: Array<{
      subjectTypeId: string;
      subjectType: {
        subjectTypeId: string;
        name: string;
      };
    }>;
  }

  // Map subjectsArray to compatible type for filter/find
  const subjectsCompatArray: SubjectCompat[] = useMemo(
    () =>
      subjectsArray.map((s: any) => ({
        subjectId: s.subjectId,
        name: s.name,
        subjectTypeId: s.subjectTypeId,
        notes: s.notes,
        subjectToSubjectTypes: s.subjectToSubjectTypes,
      })),
    [subjectsArray]
  );

  // Create a defaultUsername for edit mode, similar to teacher form
  const defaultUsername = isEditing
    ? student?.StudentPreference?.[0]?.studentId || "default_username"
    : "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: student?.name || "",
      kanaName: student?.kanaName || "",
      gradeId: student?.gradeId || "",
      schoolName: student?.schoolName || "",
      schoolType: safeEnum(student?.schoolType, ["PUBLIC", "PRIVATE"]) as
        | "PUBLIC"
        | "PRIVATE"
        | null
        | undefined,
      examSchoolType: safeEnum(student?.examSchoolType, [
        "PUBLIC",
        "PRIVATE",
      ]) as "PUBLIC" | "PRIVATE" | null | undefined,
      examSchoolCategoryType: safeEnum(student?.examSchoolCategoryType, [
        "ELEMENTARY",
        "MIDDLE",
        "HIGH",
        "UNIVERSITY",
        "OTHER",
      ]) as
        | "ELEMENTARY"
        | "MIDDLE"
        | "HIGH"
        | "UNIVERSITY"
        | "OTHER"
        | null
        | undefined,
      birthDate: student?.birthDate || undefined,
      parentMobile: student?.parentMobile || "",
      studentMobile: student?.studentMobile || "",
      parentEmail: student?.parentEmail || "",
      notes: student?.notes || "",
      firstChoiceSchool: student?.firstChoiceSchool || "",
      secondChoiceSchool: student?.secondChoiceSchool || "",
      homePhone: student?.homePhone || "",
      enrollmentDate: student?.enrollmentDate || undefined,
      username: defaultUsername,
      password: "",
    },
  });

  // Preferences form using the properly defined schema
  const preferencesForm = useForm<StudentPreference>({
    resolver: zodResolver(studentPreferencesSchema),
    defaultValues: {
      preferredTeachers: [],
      preferredSubjects: [],
      desiredTimes: [],
      additionalNotes: "",
      classTypeId: null,
    },
  });

  // Derived form for desiredTimes only
  const desiredTimesForm = useForm<{
    desiredTimes: { dayOfWeek: string; startTime: string; endTime: string }[];
  }>({
    defaultValues: {
      desiredTimes: preferencesForm.getValues("desiredTimes") || [],
    },
  });

  // Helper function to format date
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to get birth date as string, similar to teacher form
  const getBirthDateString = (value: unknown) => {
    if (typeof value === "string") return value.slice(0, 10);
    if (value instanceof Date && !isNaN(value.getTime()))
      return formatDate(value);
    return "";
  };

  // Helper function to format time
  const formatTimeString = (time: Date | string) => {
    if (typeof time === "string") {
      // Handle ISO string
      if (time.includes("T")) {
        return time.split("T")[1].substring(0, 5);
      }
      return time;
    }
    // Handle Date object
    return time.toTimeString().substring(0, 5);
  };

  // Parse existing student preferences if available
  useEffect(() => {
    if (student?.StudentPreference?.length) {
      const preferences = student.StudentPreference[0];

      // Set teachers
      const teacherIds =
        preferences.teachers?.map((t: { teacherId: string }) => t.teacherId) ||
        [];
      preferencesForm.setValue("preferredTeachers", teacherIds);

      // Set subject-type pairs
      const subjectPairs =
        preferences.subjects?.map(
          (s: { subjectId: string; subjectTypeId: string }) => ({
            subjectId: s.subjectId,
            subjectTypeId: s.subjectTypeId,
          })
        ) || [];
      preferencesForm.setValue("preferredSubjects", subjectPairs);

      // Set time slots
      const timeSlots =
        preferences.timeSlots?.map(
          (slot: {
            dayOfWeek: string;
            startTime: string;
            endTime: string;
          }) => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: formatTimeString(slot.startTime),
            endTime: formatTimeString(slot.endTime),
          })
        ) || [];
      preferencesForm.setValue("desiredTimes", timeSlots);
      desiredTimesForm.setValue("desiredTimes", timeSlots);

      // Set additional notes and class type
      preferencesForm.setValue("additionalNotes", preferences.notes || null);
      preferencesForm.setValue("classTypeId", preferences.classTypeId || null);
    }
  }, [student, preferencesForm, desiredTimesForm]);

  // Sync from preferencesForm to desiredTimesForm
  useEffect(() => {
    const preferenceTimes = preferencesForm.watch("desiredTimes");
    if (
      preferenceTimes &&
      JSON.stringify(preferenceTimes) !==
        JSON.stringify(desiredTimesForm.getValues().desiredTimes)
    ) {
      desiredTimesForm.setValue("desiredTimes", preferenceTimes || []);
    }
  }, [preferencesForm, desiredTimesForm]);

  // Sync from desiredTimesForm to preferencesForm
  useEffect(() => {
    const desiredTimes = desiredTimesForm.watch("desiredTimes");
    if (desiredTimes && desiredTimes.length > 0) {
      const formattedTimes = desiredTimes.map((time) => ({
        dayOfWeek: time.dayOfWeek.toUpperCase(),
        startTime: time.startTime,
        endTime: time.endTime,
      }));
      preferencesForm.setValue("desiredTimes", formattedTimes);
    }
  }, [desiredTimesForm, preferencesForm]);

  // Watch selected subjects and teachers
  const selectedSubjects = preferencesForm.watch("preferredSubjects");

  // Create a mapping of teacherId to the subjects they teach using useMemo
  const teacherToSubjectsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    teacherSubjectsArray.forEach((ts: TeacherSubject) => {
      if (!map.has(ts.teacherId)) {
        map.set(ts.teacherId, []);
      }
      const subjectsForTeacher = map.get(ts.teacherId);
      if (subjectsForTeacher) {
        subjectsForTeacher.push(ts.subjectId);
      }
    });
    return map;
  }, [teacherSubjectsArray]);

  // Compute filtered teachers based on selected subjects
  const teacherList = useMemo(() => {
    return Array.isArray(teachersArray)
      ? teachersArray.filter(
          (t) =>
            typeof t === "object" &&
            t !== null &&
            typeof t.teacherId === "string" &&
            t.name
        )
      : [];
  }, [teachersArray]);
  const filteredTeachers = useMemo(() => {
    if (!selectedSubjects.length) {
      return teacherList;
    }
    return teacherList.filter((teacher) => {
      const teacherSubjects = teacherToSubjectsMap.get(teacher.teacherId) || [];
      return selectedSubjects.some((subject: { subjectId: string }) =>
        teacherSubjects.includes(subject.subjectId)
      );
    });
  }, [teacherList, teacherToSubjectsMap, selectedSubjects]);

  // Loading states
  const isLoading =
    gradesLoading ||
    teachersLoading ||
    subjectsLoading ||
    teacherSubjectsLoading;

  // Function to map the preferences form data to the API format
  const mapPreferencesForApi = (preference: StudentPreference) => {
    return {
      subjects: preference.preferredSubjects.map((pair) => ({
        subjectId: pair.subjectId,
        subjectTypeId: pair.subjectTypeId,
      })),
      teachers: preference.preferredTeachers,
      timeSlots: preference.desiredTimes.map((time) => ({
        dayOfWeek: time.dayOfWeek.toUpperCase(),
        startTime: time.startTime,
        endTime: time.endTime,
      })),
      notes: preference.additionalNotes || undefined,
      classTypeId: preference.classTypeId || undefined,
    };
  };

  // Handle form submission - OPTIMIZED to close dialog immediately
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Get the latest time slots from the desiredTimesForm
      const timeSlots = desiredTimesForm.getValues().desiredTimes;

      // Ensure the day of week is in uppercase enum format
      const formattedTimeSlots = timeSlots.map((time) => ({
        dayOfWeek: time.dayOfWeek.toUpperCase(),
        startTime: time.startTime,
        endTime: time.endTime,
      }));

      // Update the preferencesForm with these values
      preferencesForm.setValue("desiredTimes", formattedTimeSlots);

      const preferenceData = preferencesForm.getValues();
      const preferences = mapPreferencesForApi(preferenceData);

      // Format the dates properly for API
      const birthDateStr = values.birthDate
        ? typeof values.birthDate === "string"
          ? values.birthDate
          : values.birthDate instanceof Date
          ? values.birthDate.toISOString().split("T")[0]
          : ""
        : undefined;

      const enrollmentDateStr = values.enrollmentDate
        ? typeof values.enrollmentDate === "string"
          ? values.enrollmentDate
          : (values.enrollmentDate as Date).toISOString().split("T")[0]
        : undefined;

      // Close the dialog immediately for better UX
      onOpenChange(false);

      // Reset all forms
      form.reset();
      preferencesForm.reset();
      desiredTimesForm.reset();
      setIsSubmitting(false);

      // Then trigger the mutation without waiting for result
      if (isEditing && student) {
        updateStudentMutation.mutate({
          studentId: student.studentId,
          name: values.name || undefined,
          kanaName: values.kanaName || undefined,
          gradeId: values.gradeId || undefined,
          schoolName: values.schoolName || undefined,
          schoolType: values.schoolType || undefined,
          examSchoolType: values.examSchoolType || undefined,
          examSchoolCategoryType: values.examSchoolCategoryType || undefined,
          birthDate: birthDateStr,
          parentMobile: values.parentMobile || undefined,
          studentMobile: values.studentMobile || undefined,
          parentEmail: values.parentEmail || undefined,
          notes: values.notes || undefined,
          firstChoiceSchool: values.firstChoiceSchool || undefined,
          secondChoiceSchool: values.secondChoiceSchool || undefined,
          homePhone: values.homePhone || undefined,
          enrollmentDate: enrollmentDateStr,
          password: values.password || undefined,
          preferences,
        });
      } else {
        createStudentMutation.mutate({
          username: values.username || "",
          password: values.password || "",
          name: values.name,
          kanaName: values.kanaName || undefined,
          gradeId: values.gradeId || undefined,
          schoolName: values.schoolName || undefined,
          schoolType: values.schoolType || undefined,
          examSchoolType: values.examSchoolType || undefined,
          examSchoolCategoryType: values.examSchoolCategoryType || undefined,
          birthDate: birthDateStr,
          parentMobile: values.parentMobile || undefined,
          studentMobile: values.studentMobile || undefined,
          parentEmail: values.parentEmail || undefined,
          notes: values.notes || undefined,
          firstChoiceSchool: values.firstChoiceSchool || undefined,
          secondChoiceSchool: values.secondChoiceSchool || undefined,
          homePhone: values.homePhone || undefined,
          enrollmentDate: enrollmentDateStr,
          preferences,
        });
      }
    } catch (error) {
      console.error("Error saving student:", error);
      setIsSubmitting(false);
    }
  }

  // Show loading state
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
          desiredTimesForm.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent
        className="sm:max-w-[600px] max-h-[80vh] overflow-auto"
        style={{
          overflowY: "auto",
          height: "80vh",
          maxHeight: "80vh",
          paddingRight: "10px",
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "学生の編集" : "学生の作成"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="preferences">学習設定</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Form {...form}>
              <form className="space-y-4" autoComplete="off">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名前</FormLabel>
                      <FormControl>
                        <Input placeholder="学生の名前を入力" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kanaName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>カナ名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="カナ名を入力"
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
                  name="gradeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学年</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="学年を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradesArray.map(
                              (grade: { gradeId: string; name: string }) => (
                                <SelectItem
                                  key={grade.gradeId}
                                  value={grade.gradeId}
                                >
                                  {grade.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学校名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="学校名を入力"
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
                  name="schoolType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学校タイプ</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="学校タイプを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PUBLIC">公立</SelectItem>
                            <SelectItem value="PRIVATE">私立</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examSchoolType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>受験校タイプ</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="受験校タイプを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PUBLIC">公立</SelectItem>
                            <SelectItem value="PRIVATE">私立</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="examSchoolCategoryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>受験校カテゴリータイプ</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="受験校カテゴリーを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ELEMENTARY">小学校</SelectItem>
                            <SelectItem value="MIDDLE">中学校</SelectItem>
                            <SelectItem value="HIGH">高校</SelectItem>
                            <SelectItem value="UNIVERSITY">大学</SelectItem>
                            <SelectItem value="OTHER">その他</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstChoiceSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>第一志望校</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="第一志望校を入力"
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
                  name="secondChoiceSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>第二志望校</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="第二志望校を入力"
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
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>生年月日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={getBirthDateString(field.value)}
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
                  name="homePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>自宅電話</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="自宅電話を入力"
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
                  name="parentMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>保護者携帯電話</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="保護者携帯電話を入力"
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
                  name="studentMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学生携帯電話</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="学生携帯電話を入力"
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
                  name="parentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>保護者メール</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="保護者メールを入力"
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
                              autoComplete="off"
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
                              autoComplete="new-password"
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
                      render={({ field }) => <input type="hidden" {...field} />}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            新しいパスワード (変更する場合のみ)
                          </FormLabel>
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

          <TabsContent value="preferences">
            <Form {...preferencesForm}>
              <form className="space-y-4" autoComplete="off">
                {/* Subject Selector using our new component */}
                <StudentSubjectSelector
                  form={preferencesForm}
                  subjects={subjectsCompatArray}
                  initialSubjectPairs={
                    preferencesForm.getValues().preferredSubjects
                  }
                  fieldName="preferredSubjects"
                />

                {/* Teacher Selector using our new component */}
                <TeacherSelector
                  form={preferencesForm}
                  teachers={teacherList}
                  initialTeachers={
                    preferencesForm.getValues().preferredTeachers
                  }
                  fieldName="preferredTeachers"
                />

                <StudentDesiredTimeField form={desiredTimesForm} />

                <FormField
                  control={preferencesForm.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>追加メモ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="学習に関する追加情報や特記事項"
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
            type="submit"
            disabled={isSubmitting}
            onClick={() => {
              // Get time slot data from the dedicated form
              const timeSlots = desiredTimesForm.getValues().desiredTimes;

              // Ensure the day of week is in uppercase enum format (MONDAY not Monday)
              const formattedTimeSlots = timeSlots.map((time) => ({
                dayOfWeek: time.dayOfWeek.toUpperCase(), // Convert to proper enum format
                startTime: time.startTime,
                endTime: time.endTime,
              }));

              // Update the preferences form with the latest time slots
              preferencesForm.setValue("desiredTimes", formattedTimeSlots);

              // Always use the main form's submit handler
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

// Helper to safely get enum value or undefined
function safeEnum<T extends string>(
  val: unknown,
  allowed: readonly T[]
): T | undefined {
  return typeof val === "string" && allowed.includes(val as T)
    ? (val as T)
    : undefined;
}
