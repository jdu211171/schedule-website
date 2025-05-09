// EditStandaloneClassSessionForm.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ClassSession } from '@/schemas/class-session.schema';
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
      startTime: session?.startTime?.split('T')[1]?.slice(0, 5) || '',
      endTime: session?.endTime?.split('T')[1]?.slice(0, 5) || '',
      notes: session?.notes || '',
      teacherId: session?.teacherId || null,
      studentId: session?.studentId || null,
      subjectId: session?.subjectId || null,
      classTypeId: session?.classTypeId || null,
    },
    mode: 'onSubmit',
  });

  const { handleSubmit, register, setValue, watch, formState } = form;
  const selectedTeacherId = watch('teacherId');
  const selectedStudentId = watch('studentId');
  const selectedSubjectId = watch('subjectId');
  const selectedClassTypeId = watch('classTypeId');

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const teachersResponse = await fetch('/api/teacher');
        if (!teachersResponse.ok) throw new Error(`Failed to fetch teachers: ${teachersResponse.status}`);
        const teachersData = await teachersResponse.json();
        setTeachers(teachersData.data.map((t: any) => ({ teacherId: t.teacherId, name: t.name })));

        const studentsResponse = await fetch('/api/student');
        if (!studentsResponse.ok) throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.data.map((s: any) => ({ studentId: s.studentId, name: s.name })));

        const subjectsResponse = await fetch('/api/subjects');
        if (!subjectsResponse.ok) throw new Error(`Failed to fetch subjects: ${subjectsResponse.status}`);
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData.data.map((s: any) => ({ subjectId: s.subjectId, name: s.name })));

        const classTypesResponse = await fetch('/api/class-type');
        if (!classTypesResponse.ok) throw new Error(`Failed to fetch class types: ${classTypesResponse.status}`);
        const classTypesData = await classTypesResponse.json();
        setClassTypes(classTypesData.data.map((ct: any) => ({ classTypeId: ct.classTypeId, name: ct.name })));

        if (session) {
          // Значения устанавливаются через defaultValues в useForm
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить данные для формы.');
        console.error('Ошибка загрузки данных формы:', err);
      }
    };

    if (open) {
      fetchFormData();
    } else {
      setError(null);
      setSuccessMsg(null);
      form.reset({
        startTime: '',
        endTime: '',
        notes: '',
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

    const updatedSessionData = {
      classId: session.classId,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      notes: data.notes,
      teacherId: data.teacherId || null,
      studentId: data.studentId || null,
      subjectId: data.subjectId || null,
      classTypeId: data.classTypeId || null,
    };

    try {
      const response = await fetch('/api/class-session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSessionData),
      });

      if (response.ok) {
        setIsLoading(false);
        setSuccessMsg('Занятие успешно обновлено.');
        setTimeout(() => {
          onOpenChange(false);
          onSessionUpdated();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData?.message || 'Не удалось обновить занятие.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError('Произошла ошибка при обновлении занятия.');
      setIsLoading(false);
      console.error('Ошибка обновления занятия:', err);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Редактировать занятие</AlertDialogTitle>
          <AlertDialogDescription>Измените детали занятия.</AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Дата - только для отображения */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Дата
            </Label>
            <Input
              id="date"
              value={session?.date?.split('T')[0] || ''}
              type="date"
              className="col-span-3"
              disabled
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Начало
            </Label>
            <Input
              id="start-time"
              type="time"
              className="col-span-3"
              {...register('startTime')}
            />
            {formState.errors.startTime && (
              <p className="text-sm text-red-500">{String(formState.errors.startTime.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              Конец
            </Label>
            <Input
              id="end-time"
              type="time"
              className="col-span-3"
              {...register('endTime')}
            />
            {formState.errors.endTime && (
              <p className="text-sm text-red-500">{String(formState.errors.endTime.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacherId" className="text-right">
              Преподаватель
            </Label>
            <Select
              id="teacherId"
              onValueChange={(value) => setValue('teacherId', value === '-' ? null : value)}
              defaultValue={session?.teacherId || null}
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите преподавателя" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>-</SelectItem> {/* Изменено value="" на value={null} */}
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.teacherId && (
              <p className="text-sm text-red-500">{String(formState.errors.teacherId.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentId" className="text-right">
              Студент
            </Label>
            <Select
              id="studentId"
              onValueChange={(value) => setValue('studentId', value === '-' ? null : value)}
              defaultValue={session?.studentId || null}
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите студента" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>-</SelectItem> {/* Изменено value="" на value={null} */}
                {students.map((student) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.studentId && (
              <p className="text-sm text-red-500">{String(formState.errors.studentId.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subjectId" className="text-right">
              Предмет
            </Label>
            <Select
              id="subjectId"
              onValueChange={(value) => setValue('subjectId', value === '-' ? null : value)}
              defaultValue={session?.subjectId || null}
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>-</SelectItem> {/* Изменено value="" на value={null} */}
                {subjects.map((subject) => (
                  <SelectItem key={subject.subjectId} value={subject.subjectId}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.subjectId && (
              <p className="text-sm text-red-500">{String(formState.errors.subjectId.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="classTypeId" className="text-right">
              Тип занятия
            </Label>
            <Select
              id="classTypeId"
              onValueChange={(value) => setValue('classTypeId', value === '-' ? null : value)}
              defaultValue={session?.classTypeId || null}
            >
              <SelectTrigger className="w-full col-span-3">
                <SelectValue placeholder="Выберите тип занятия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>-</SelectItem> {/* Изменено value="" на value={null} */}
                {classTypes.map((classType) => (
                  <SelectItem key={classType.classTypeId} value={classType.classTypeId}>
                    {classType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.classTypeId && (
              <p className="text-sm text-red-500">{String(formState.errors.classTypeId.message)}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              Заметки
            </Label>
            <Textarea
              id="notes"
              className="col-span-3"
              {...register('notes')}
            />
            {formState.errors.notes && (
              <p className="text-sm text-red-500">{String(formState.errors.notes.message)}</p>
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
            <AlertDialogCancel type="button" onClick={() => onOpenChange(false)}>
              Отмена
            </AlertDialogCancel>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default EditStandaloneClassSessionForm;
