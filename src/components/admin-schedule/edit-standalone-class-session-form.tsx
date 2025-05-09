// EditStandaloneClassSessionForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClassSession } from "@/schemas/class-session.schema";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the Zod schema if you have one for editing standalone session
const EditStandaloneClassSessionSchema = z.object({
  date: z.string().optional(), // Added date field
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  teacherId: z.string().nullable().optional(),
  studentId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  classTypeId: z.string().nullable().optional(),
});

type FormData = z.infer<typeof EditStandaloneClassSessionSchema>;

interface EditStandaloneClassSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ClassSession | null;
  onSessionUpdated: () => void;
}

interface Teacher {
  teacherId: string;
  name: string;
}

interface Student {
  studentId: string;
  name: string;
}

interface Subject {
  subjectId: string;
  name: string;
}

interface ClassType {
  classTypeId: string;
  name: string;
}

// Helper function to format a Date object to "YYYY-MM-DD" string
const formatDateToYYYYMMDD = (
  date: Date | string | undefined | null
): string => {
  if (!date) return "";
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  if (typeof date === "string") {
    const parts = date.split("T");
    if (parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      return parts[0];
    }
  }
  return "";
};

// Helper function to format time from a Date object to 24h format
const formatSessionTimeFor24Hour = (
  dateObj: Date | string | undefined | null
): string => {
  if (!dateObj) return "";

  let hours: number, minutes: number;

  if (dateObj instanceof Date) {
    hours = dateObj.getHours();
    minutes = dateObj.getMinutes();
  } else if (typeof dateObj === "string") {
    // Handle ISO string or time string format
    if (dateObj.includes("T")) {
      const d = new Date(dateObj);
      hours = d.getHours();
      minutes = d.getMinutes();
    } else {
      const parts = dateObj.split(":");
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return "";
    }
  } else {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export function EditStandaloneClassSessionForm({
  open,
  onOpenChange,
  session,
  onSessionUpdated,
}: EditStandaloneClassSessionFormProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(EditStandaloneClassSessionSchema),
    defaultValues: {
      date: formatDateToYYYYMMDD(session?.date),
      startTime: formatSessionTimeFor24Hour(session?.startTime),
      endTime: formatSessionTimeFor24Hour(session?.endTime),
      notes: session?.notes || "",
      teacherId: session?.teacherId || null,
      studentId: session?.studentId || null,
      subjectId: session?.subjectId || null,
      classTypeId: session?.classTypeId || null,
    },
    mode: "onSubmit",
  });

  const { handleSubmit, register, setValue, watch, formState } = form;
  const selectedTeacherId = watch("teacherId");
  const selectedStudentId = watch("studentId");
  const selectedSubjectId = watch("subjectId");
  const selectedClassTypeId = watch("classTypeId");

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        // Fetch teachers
        const teachersResponse = await fetch("/api/teacher");
        if (!teachersResponse.ok)
          throw new Error(
            `Failed to fetch teachers: ${teachersResponse.status}`
          );
        const teachersData = await teachersResponse.json();
        setTeachers(
          Array.isArray(teachersData.data)
            ? teachersData.data.map((t: Teacher) => ({
                teacherId: t.teacherId,
                name: t.name,
              }))
            : []
        );

        // Fetch students
        const studentsResponse = await fetch("/api/student");
        if (!studentsResponse.ok)
          throw new Error(
            `Failed to fetch students: ${studentsResponse.status}`
          );
        const studentsData = await studentsResponse.json();
        setStudents(
          Array.isArray(studentsData.data)
            ? studentsData.data.map((s: Student) => ({
                studentId: s.studentId,
                name: s.name,
              }))
            : []
        );

        // Fetch subjects - Updated API call
        const subjectsResponse = await fetch("/api/subjects");
        if (!subjectsResponse.ok)
          throw new Error(
            `Failed to fetch subjects: ${subjectsResponse.status}`
          );
        const subjectsData = await subjectsResponse.json();
        console.log("Subjects data:", subjectsData);

        if (subjectsData && Array.isArray(subjectsData.data)) {
          setSubjects(
            Array.isArray(subjectsData.data)
              ? subjectsData.data.map((s: Subject) => ({
                  subjectId: s.subjectId,
                  name: s.name,
                }))
              : []
          );
        } else {
          console.error("Unexpected subjects data format:", subjectsData);
          throw new Error("Unexpected subjects data format");
        }

        // Fetch class types - Updated API call
        const classTypesResponse = await fetch("/api/class-type");
        if (!classTypesResponse.ok)
          throw new Error(
            `Failed to fetch class types: ${classTypesResponse.status}`
          );
        const classTypesData = await classTypesResponse.json();
        console.log("Class types data:", classTypesData);

        if (classTypesData && Array.isArray(classTypesData.data)) {
          setClassTypes(
            Array.isArray(classTypesData.data)
              ? classTypesData.data.map((ct: ClassType) => ({
                  classTypeId: ct.classTypeId,
                  name: ct.name,
                }))
              : []
          );
        } else {
          console.error("Unexpected class types data format:", classTypesData);
          throw new Error("Unexpected class types data format");
        }

        if (session) {
          // Values are set via defaultValues in useForm
        }
      } catch (err) {
        setError(
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "フォームデータの読み込みに失敗しました。"
        );
        console.error("フォームデータの読み込みエラー:", err);
      }
    };

    if (open) {
      fetchFormData();
      // Reset form with session data when dialog opens or session changes
      if (session) {
        form.reset({
          date: formatDateToYYYYMMDD(session.date),
          startTime: formatSessionTimeFor24Hour(session.startTime),
          endTime: formatSessionTimeFor24Hour(session.endTime),
          notes: session.notes || "",
          teacherId: session.teacherId || null,
          studentId: session.studentId || null,
          subjectId: session.subjectId || null,
          classTypeId: session.classTypeId || null,
        });
      } else {
        // If session is null, reset to empty/default
        form.reset({
          date: "",
          startTime: "",
          endTime: "",
          notes: "",
          teacherId: null,
          studentId: null,
          subjectId: null,
          classTypeId: null,
        });
      }
    } else {
      // Reset form when dialog closes
      setError(null);
      setSuccessMsg(null);
      form.reset({
        date: "",
        startTime: "",
        endTime: "",
        notes: "",
        teacherId: null,
        studentId: null,
        subjectId: null,
        classTypeId: null,
      });
    }
  }, [open, session, form]); // Added form to dependency array

  const onSubmit = async (data: FormData) => {
    if (!session) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    let finalStartTime: string | null = null;
    if (data.date && data.startTime) {
      finalStartTime = data.startTime; // Already in 24-hour format
    }

    let finalEndTime: string | null = null;
    if (data.date && data.endTime) {
      finalEndTime = data.endTime; // Already in 24-hour format
    }

    const updatedSessionData = {
      classId: session.classId,
      date: data.date,
      startTime: finalStartTime,
      endTime: finalEndTime,
      notes: data.notes,
      teacherId: data.teacherId || null,
      studentId: data.studentId || null,
      subjectId: data.subjectId || null,
      classTypeId: data.classTypeId || null,
    };

    try {
      const response = await fetch("/api/class-session", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSessionData),
      });

      if (response.ok) {
        setIsLoading(false);
        setSuccessMsg("授業が正常に更新されました。");
        setTimeout(() => {
          onOpenChange(false);
          onSessionUpdated();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData?.message || "授業の更新に失敗しました。");
        setIsLoading(false);
      }
    } catch (err) {
      setError("授業の更新中にエラーが発生しました。");
      setIsLoading(false);
      console.error("授業の更新エラー:", err);
    }
  };

  // Generate time options for dropdown in 24-hour format
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>授業の編集</AlertDialogTitle>
          <AlertDialogDescription>
            授業の詳細を変更してください。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Date - display only */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              日付
            </Label>
            <Input
              id="date"
              type="date"
              className="col-span-3"
              {...register("date")} // Use react-hook-form register
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              開始
            </Label>
            <Select
              value={form.watch("startTime")}
              onValueChange={(value) => setValue("startTime", value)}
            >
              <SelectTrigger className="col-span-3 w-full">
                <SelectValue placeholder="開始時間を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.startTime && (
              <p className="text-sm text-red-500">
                {String(formState.errors.startTime.message)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              終了
            </Label>
            <Select
              value={form.watch("endTime")}
              onValueChange={(value) => setValue("endTime", value)}
            >
              <SelectTrigger className="col-span-3 w-full">
                <SelectValue placeholder="終了時間を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.endTime && (
              <p className="text-sm text-red-500">
                {String(formState.errors.endTime.message)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacherId" className="text-right">
              講師
            </Label>
            <Select
              value={selectedTeacherId || "none"}
              onValueChange={(value) =>
                setValue("teacherId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="講師を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.teacherId && (
              <p className="text-sm text-red-500">
                {String(formState.errors.teacherId.message)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentId" className="text-right">
              生徒
            </Label>
            <Select
              value={selectedStudentId || "none"}
              onValueChange={(value) =>
                setValue("studentId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="生徒を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.studentId && (
              <p className="text-sm text-red-500">
                {String(formState.errors.studentId.message)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subjectId" className="text-right">
              科目
            </Label>
            <Select
              value={selectedSubjectId || "none"}
              onValueChange={(value) =>
                setValue("subjectId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="科目を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.subjectId} value={subject.subjectId}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.subjectId && (
              <p className="text-sm text-red-500">
                {String(formState.errors.subjectId.message)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="classTypeId" className="text-right">
              授業タイプ
            </Label>
            <Select
              value={selectedClassTypeId || "none"}
              onValueChange={(value) =>
                setValue("classTypeId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="授業タイプを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {classTypes.map((classType) => (
                  <SelectItem
                    key={classType.classTypeId}
                    value={classType.classTypeId}
                  >
                    {classType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.classTypeId && (
              <p className="text-sm text-red-500">
                {String(formState.errors.classTypeId.message)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              備考
            </Label>
            <Textarea
              id="notes"
              className="col-span-3"
              {...register("notes")}
            />
            {formState.errors.notes && (
              <p className="text-sm text-red-500">
                {String(formState.errors.notes.message)}
              </p>
            )}
          </div>

          {successMsg && (
            <div className="p-3 rounded bg-green-50 border border-green-200 text-green-600 text-sm">
              {successMsg}
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </AlertDialogCancel>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default EditStandaloneClassSessionForm;
