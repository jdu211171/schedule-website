'use client';

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ClassSessionProcessed } from '@/components/match/hooks/useClassSessions';

interface EditableClassSession extends ClassSessionProcessed {
  templateId: string | null;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  boothId?: string;
  classTypeId?: string;
  notes?: string;
}

interface EditClassSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: EditableClassSession;
  onSessionUpdated: () => void;
}

interface UpdateClassSessionPayload {
  classId: string;
  startTime: string;
  endTime: string;
  boothId?: string | null;
  notes?: string | null;
  date?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  classTypeId?: string;
}

const formSchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "時間は HH:MM 形式である必要があります",
  }),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "時間は HH:MM 形式である必要があります",
  }),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  boothId: z.string().optional(),
  classTypeId: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

interface Teacher {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Booth {
  id: string;
  name: string;
}

interface ClassType {
  id: string;
  name: string;
}

export function EditClassSessionForm({
                                       open,
                                       onOpenChange,
                                       session,
                                       onSessionUpdated,
                                     }: EditClassSessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isStandalone = session?.status === 'rare';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startTime: session?.startTime || '',
      endTime: session?.endTime || '',
      teacherId: session?.teacher || '',
    studentId: session?.studentId || '',
    subjectId: session?.subjectId || '',
    boothId: session?.boothId || '',
    classTypeId: session?.classTypeId || '',
    notes: session?.notes || '',
    date: session?.date ? format(new Date(session.date), 'yyyy-MM-dd') : undefined,
  },
});

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const teachersResponse = await fetch('/api/teacher');
        if (teachersResponse.ok) {
          const teachersData = await teachersResponse.json();
          setTeachers(teachersData.data as Teacher[] || []);
        }

        const studentsResponse = await fetch('/api/student');
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          setStudents(studentsData.data as Student[] || []);
        }

        const subjectsResponse = await fetch('/api/subjects');
        if (subjectsResponse.ok) {
          const subjectsData = await subjectsResponse.json();
          setSubjects(subjectsData.data as Subject[] || []);
        }

        const boothsResponse = await fetch('/api/booth');
        if (boothsResponse.ok) {
          const boothsData = await boothsResponse.json();
          setBooths(boothsData.data as Booth[] || []);
        }

        const classTypesResponse = await fetch('/api/class-type');
        if (classTypesResponse.ok) {
          const classTypesData = await classTypesResponse.json();
          setClassTypes(classTypesData.data as ClassType[] || []);
        }
      } catch (error) {
        console.error('Error fetching reference data:', error);
        setErrorMessage('参照データの取得中にエラーが発生しました。');
      }
    };

    void fetchReferenceData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formattedStartTime = values.startTime + ':00';
      const formattedEndTime = values.endTime + ':00';

      let requestBody: UpdateClassSessionPayload = {
        classId: session.classId,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        boothId: values.boothId,
        notes: values.notes,
      };

      if (isStandalone) {
        requestBody = {
          ...requestBody,
          date: values.date,
          teacherId: values.teacherId,
          studentId: values.studentId,
          subjectId: values.subjectId,
          classTypeId: values.classTypeId,
        };
      }

      const response = await fetch('/api/class-session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '授業セッションの更新中にエラーが発生しました。');
      }

      onSessionUpdated();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '授業セッションの更新中に予期しないエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>授業セッションを編集</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>開始時間</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HH:MM" />
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
                      <Input {...field} placeholder="HH:MM" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="boothId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ブース</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ブースを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {booths.map((booth: Booth) => (
                        <SelectItem key={booth.id} value={booth.id}>
                          {booth.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isStandalone && (
              <>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日付</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>教師</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="教師を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teachers.map((teacher: Teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>生徒</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="生徒を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student: Student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>科目</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="科目を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject: Subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>授業タイプ</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="授業タイプを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classTypes.map((type: ClassType) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Textarea {...field} placeholder="授業に関するメモ" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && (
              <div className="text-red-500 text-sm">{errorMessage}</div>
            )}

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '更新中...' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
