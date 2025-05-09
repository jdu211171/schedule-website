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

  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  // New state variables for subject preferences
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedSubjectType, setSelectedSubjectType] = useState<string>("");

  // Add this effect to filter subject types when a subject is selected
  const availableSubjectTypes = useMemo(() => {
    if (!selectedSubject) return [];
    const subject = subjectsCompatArray.find(
      (s) => s.subjectId === selectedSubject
    );
    if (!subject) return [];
    return (subject.subjectToSubjectTypes || []).map((rel) => ({
      subjectTypeId: rel.subjectType.subjectTypeId,
      name: rel.subjectType.name,
    }));
  }, [selectedSubject, subjectsCompatArray]);

  useEffect(() => {
    setSelectedSubjectType("");
  }, [selectedSubject]);

  const formSchema = CreateUserStudentSchema;

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
      // Only set examSchoolType if it matches the correct API enum, otherwise undefined
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

      username: "",
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

  // Helper to format date input to YYYY-MM-DD
  const formatDateInput = (date: string | Date | undefined | null) => {
    if (!date) return "";
    if (typeof date === "string") {
      // If it's already YYYY-MM-DD, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      // If it's ISO string, extract date part
      if (/^\d{4}-\d{2}-\d{2}T/.test(date)) return date.slice(0, 10);
      // Otherwise, try to parse
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return "";
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
    return "";
  };

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
        dayOfWeek: time.dayOfWeek.toUpperCase(), // Ensure uppercase enum format
        startTime: time.startTime,
        endTime: time.endTime,
      })),
      notes: preference.additionalNotes || undefined,
      classTypeId: preference.classTypeId || undefined,
    };
  };

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Get the latest time slots from the desiredTimesForm
      const timeSlots = desiredTimesForm.getValues().desiredTimes;

      // Ensure the day of week is in uppercase enum format (MONDAY not Monday)
      const formattedTimeSlots = timeSlots.map((time) => ({
        dayOfWeek: time.dayOfWeek.toUpperCase(), // Convert to proper enum format
        startTime: time.startTime,
        endTime: time.endTime,
      }));

      // Update the preferencesForm with these values
      preferencesForm.setValue("desiredTimes", formattedTimeSlots);

      const preferenceData = preferencesForm.getValues();
      const preferences = mapPreferencesForApi(preferenceData);

      // Log the actual data being sent to verify
      console.log("Submitting with time slots:", preferences.timeSlots);

      // Convert Date objects to string (YYYY-MM-DD) for API
      const formatDateString = (d: string | Date | undefined) => {
        if (!d) return undefined;
        if (typeof d === "string") return d;
        if (d instanceof Date && !isNaN(d.getTime()))
          return d.toISOString().slice(0, 10);
        return undefined;
      };
      // Convert nulls to undefined for all string fields to match schema types
      const cleanString = (v: string | null | undefined) =>
        v == null ? undefined : v;
      // Helper to cast enum fields safely
      const castEnum = <T extends string>(
        val: unknown,
        allowed: readonly T[]
      ): T | undefined =>
        typeof val === "string" && allowed.includes(val as T)
          ? (val as T)
          : undefined;
      const payload = {
        ...values,
        gradeId: cleanString(values.gradeId),
        kanaName: cleanString(values.kanaName),
        schoolName: cleanString(values.schoolName),
        schoolType: castEnum(values.schoolType, ["PUBLIC", "PRIVATE"]) as
          | "PUBLIC"
          | "PRIVATE"
          | undefined,
        examSchoolType: castEnum(values.examSchoolType, [
          "PUBLIC",
          "PRIVATE",
        ]) as "PUBLIC" | "PRIVATE" | undefined,
        examSchoolCategoryType: castEnum(values.examSchoolCategoryType, [
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
          | undefined,
        firstChoiceSchool: cleanString(values.firstChoiceSchool),
        secondChoiceSchool: cleanString(values.secondChoiceSchool),
        homePhone: cleanString(values.homePhone),
        parentMobile: cleanString(values.parentMobile),
        studentMobile: cleanString(values.studentMobile),
        parentEmail: cleanString(values.parentEmail),
        notes: cleanString(values.notes),
        birthDate: formatDateString(values.birthDate),
        enrollmentDate: formatDateString(values.enrollmentDate ?? undefined),
        preferences,
      };

      if (isEditing && student) {
        const { username, ...updatePayload } = payload;
        await updateStudentMutation.mutateAsync({
          studentId: student.studentId,
          ...updatePayload,
        });
      } else {
        await createStudentMutation.mutateAsync(payload);
      }
      onOpenChange(false);
      form.reset();
      preferencesForm.reset();
      desiredTimesForm.reset();
    } catch (error) {
      console.error("Failed to save student:", error);
    } finally {
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
              <form className="space-y-4">
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
                          value={formatDateInput(field.value)}
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
              <form className="space-y-4">
                {/* Updated subject preference field */}
                <FormField
                  control={preferencesForm.control}
                  name="preferredSubjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>希望科目と科目種別</FormLabel>
                      <div className="space-y-4">
                        <div className="flex items-end gap-2">
                          {/* Subject selection */}
                          <div className="flex-1">
                            <FormLabel className="text-sm">科目</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder="科目を検索..."
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
                                  {subjectsCompatArray
                                    .filter((subject) =>
                                      subject.name
                                        .toLowerCase()
                                        .includes(
                                          subjectSearchTerm.toLowerCase()
                                        )
                                    )
                                    .map((subject) => (
                                      <div
                                        key={subject.subjectId}
                                        className="p-2 hover:bg-accent cursor-pointer"
                                        onClick={() => {
                                          setSelectedSubject(subject.subjectId);
                                          setSubjectSearchTerm(subject.name);
                                          setShowSubjectDropdown(false);
                                        }}
                                      >
                                        {subject.name}
                                      </div>
                                    ))}
                                  {subjectsCompatArray.filter((subject) =>
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
                          </div>

                          {/* Subject Type selection */}
                          <div className="flex-1">
                            <FormLabel className="text-sm">科目種別</FormLabel>
                            <Select
                              value={selectedSubjectType}
                              onValueChange={setSelectedSubjectType}
                              disabled={
                                !selectedSubject ||
                                availableSubjectTypes.length === 0
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="科目種別を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSubjectTypes.map((type) => (
                                  <SelectItem
                                    key={type.subjectTypeId}
                                    value={type.subjectTypeId}
                                  >
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            onClick={() => {
                              if (!selectedSubject || !selectedSubjectType)
                                return;

                              // Check if this pair already exists
                              const pairExists = (field.value || []).some(
                                (pair) =>
                                  pair.subjectId === selectedSubject &&
                                  pair.subjectTypeId === selectedSubjectType
                              );

                              if (pairExists) {
                                alert(
                                  "この科目と科目種別の組み合わせは既に追加されています"
                                );
                                return;
                              }

                              const newPair = {
                                subjectId: selectedSubject,
                                subjectTypeId: selectedSubjectType,
                              };

                              const updatedSubjects = [
                                ...(field.value || []),
                                newPair,
                              ];
                              field.onChange(updatedSubjects);

                              // Reset selections
                              setSelectedSubject("");
                              setSelectedSubjectType("");
                              setSubjectSearchTerm("");
                            }}
                            disabled={!selectedSubject || !selectedSubjectType}
                          >
                            追加
                          </Button>
                        </div>

                        {/* Display selected subject-type pairs */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(field.value || []).map((pair, index) => {
                            const subject = subjectsCompatArray.find(
                              (s) => s.subjectId === pair.subjectId
                            );

                            // Find the subject type name - could be in the available types or need to be found elsewhere
                            let subjectTypeName = "";
                            // First check if it's in available types
                            const typeInAvailable = availableSubjectTypes.find(
                              (t) => t.subjectTypeId === pair.subjectTypeId
                            );
                            if (typeInAvailable) {
                              subjectTypeName = typeInAvailable.name;
                            } else {
                              // Look through all subjects to find this type
                              for (const s of subjectsCompatArray) {
                                if (s.subjectToSubjectTypes) {
                                  const foundType =
                                    s.subjectToSubjectTypes.find(
                                      (rel) =>
                                        rel.subjectType.subjectTypeId ===
                                        pair.subjectTypeId
                                    );
                                  if (foundType) {
                                    subjectTypeName =
                                      foundType.subjectType.name;
                                    break;
                                  }
                                }
                              }
                              // If still not found, just use the ID
                              if (!subjectTypeName) {
                                subjectTypeName = pair.subjectTypeId;
                              }
                            }

                            return (
                              <div
                                key={index}
                                className="flex items-center bg-accent rounded-md px-3 py-1"
                              >
                                <span>
                                  {subject?.name || pair.subjectId} -{" "}
                                  {subjectTypeName}
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

                <FormField
                  control={preferencesForm.control}
                  name="preferredTeachers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>希望講師</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="講師名を検索..."
                            className="w-full"
                            value={teacherSearchTerm}
                            onChange={(e) => {
                              setTeacherSearchTerm(e.target.value);
                              setShowTeacherDropdown(
                                e.target.value.trim() !== ""
                              );
                            }}
                            onFocus={() => {
                              if (teacherSearchTerm.trim() !== "") {
                                setShowTeacherDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(
                                () => setShowTeacherDropdown(false),
                                200
                              );
                            }}
                          />
                        </FormControl>
                        {showTeacherDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredTeachers
                              .filter((teacher) =>
                                teacher.name
                                  .toLowerCase()
                                  .includes(teacherSearchTerm.toLowerCase())
                              )
                              .map((teacher) => (
                                <div
                                  key={teacher.teacherId}
                                  className="p-2 hover:bg-accent cursor-pointer"
                                  onClick={() => {
                                    const currentValues = field.value || [];
                                    if (
                                      !currentValues.includes(teacher.teacherId)
                                    ) {
                                      field.onChange([
                                        ...currentValues,
                                        teacher.teacherId,
                                      ]);
                                    }
                                    setTeacherSearchTerm("");
                                    setShowTeacherDropdown(false);
                                  }}
                                >
                                  {teacher.name}
                                </div>
                              ))}
                            {filteredTeachers.filter((teacher) =>
                              teacher.name
                                .toLowerCase()
                                .includes(teacherSearchTerm.toLowerCase())
                            ).length === 0 && (
                              <div className="p-2 text-muted-foreground">
                                該当する講師が見つかりません
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(field.value || []).map((teacherId, index) => {
                          const teacher = teacherList.find(
                            (t) => t.teacherId === teacherId
                          );
                          return (
                            <div
                              key={index}
                              className="flex items-center bg-accent rounded-md px-2 py-1"
                            >
                              <span>{teacher ? teacher.name : teacherId}</span>
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
