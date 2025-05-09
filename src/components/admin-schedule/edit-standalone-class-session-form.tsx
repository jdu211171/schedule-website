// EditStandaloneClassSessionForm.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { cn } from "@/lib/utils";
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

// Определите Zod-схему, если она у вас есть для редактирования standalone session
const EditStandaloneClassSessionSchema = z.object({
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

// Helper function to convert 24h format to 12h AM/PM format
function formatTo12Hour(time24: string): string {
  if (!time24) return "";

  const [hour, minute] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

// Helper function to convert 12h AM/PM format to 24h format
function formatTo24Hour(time12: string): string {
  if (!time12) return "";

  const [timePart, period] = time12.split(" ");
  const [hour, minute] = timePart.split(":").map(Number);

  let hour24 = hour;
  if (period === "PM" && hour !== 12) hour24 += 12;
  if (period === "AM" && hour === 12) hour24 = 0;

  return `${hour24.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

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

  // Format the time from ISO to 12h AM/PM format for display
  const formatTimeFromISOTo12Hour = (isoTime: string | undefined): string => {
    if (!isoTime) return "";
    const timePart = isoTime.split("T")[1]?.slice(0, 5) || "";
    return formatTo12Hour(timePart);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(EditStandaloneClassSessionSchema),
    defaultValues: {
      startTime: formatTimeFromISOTo12Hour(session?.startTime),
      endTime: formatTimeFromISOTo12Hour(session?.endTime),
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
          teachersData.data.map((t: any) => ({
            teacherId: t.teacherId,
            name: t.name,
          }))
        );

        // Fetch students
        const studentsResponse = await fetch("/api/student");
        if (!studentsResponse.ok)
          throw new Error(
            `Failed to fetch students: ${studentsResponse.status}`
          );
        const studentsData = await studentsResponse.json();
        setStudents(
          studentsData.data.map((s: any) => ({
            studentId: s.studentId,
            name: s.name,
          }))
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
            subjectsData.data.map((s: any) => ({
              subjectId: s.subjectId,
              name: s.name,
            }))
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
            classTypesData.data.map((ct: any) => ({
              classTypeId: ct.classTypeId,
              name: ct.name,
            }))
          );
        } else {
          console.error("Unexpected class types data format:", classTypesData);
          throw new Error("Unexpected class types data format");
        }

        if (session) {
          // Значения устанавливаются через defaultValues в useForm
        }
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить данные для формы.");
        console.error("Ошибка загрузки данных формы:", err);
      }
    };

    if (open) {
      fetchFormData();
    } else {
      setError(null);
      setSuccessMsg(null);
      form.reset({
        startTime: "",
        endTime: "",
        notes: "",
        teacherId: null,
        studentId: null,
        subjectId: null,
        classTypeId: null,
      });
    }
  }, [open, session, form]);

  const onSubmit = async (data: FormData) => {
    if (!session) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Convert time from 12h AM/PM format to 24h format before sending to server
    const startTime24 = data.startTime ? formatTo24Hour(data.startTime) : null;
    const endTime24 = data.endTime ? formatTo24Hour(data.endTime) : null;

    const updatedSessionData = {
      classId: session.classId,
      startTime: startTime24,
      endTime: endTime24,
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
        setSuccessMsg("Занятие успешно обновлено.");
        setTimeout(() => {
          onOpenChange(false);
          onSessionUpdated();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData?.message || "Не удалось обновить занятие.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError("Произошла ошибка при обновлении занятия.");
      setIsLoading(false);
      console.error("Ошибка обновления занятия:", err);
    }
  };

  // Generate time options for dropdown
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hour12 = hour % 12 || 12;
        const period = hour >= 12 ? "PM" : "AM";
        const timeString = `${hour12}:${minute
          .toString()
          .padStart(2, "0")} ${period}`;
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
          <AlertDialogTitle>Редактировать занятие</AlertDialogTitle>
          <AlertDialogDescription>
            Измените детали занятия.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Дата - только для отображения */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Дата
            </Label>
            <Input
              id="date"
              value={session?.date?.split("T")[0] || ""}
              type="date"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Начало
            </Label>
            <Select
              value={form.watch("startTime")}
              onValueChange={(value) => setValue("startTime", value)}
            >
              <SelectTrigger className="col-span-3 w-full">
                <SelectValue placeholder="Выберите время начала" />
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
              Конец
            </Label>
            <Select
              value={form.watch("endTime")}
              onValueChange={(value) => setValue("endTime", value)}
            >
              <SelectTrigger className="col-span-3 w-full">
                <SelectValue placeholder="Выберите время окончания" />
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
              Преподаватель
            </Label>
            <Select
              value={selectedTeacherId || "none"}
              onValueChange={(value) =>
                setValue("teacherId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите преподавателя" />
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
              Студент
            </Label>
            <Select
              value={selectedStudentId || "none"}
              onValueChange={(value) =>
                setValue("studentId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите студента" />
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
              Предмет
            </Label>
            <Select
              value={selectedSubjectId || "none"}
              onValueChange={(value) =>
                setValue("subjectId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите предмет" />
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
              Тип занятия
            </Label>
            <Select
              value={selectedClassTypeId || "none"}
              onValueChange={(value) =>
                setValue("classTypeId", value === "none" ? null : value)
              }
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите тип занятия" />
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
              Заметки
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
              Отмена
            </AlertDialogCancel>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default EditStandaloneClassSessionForm;
