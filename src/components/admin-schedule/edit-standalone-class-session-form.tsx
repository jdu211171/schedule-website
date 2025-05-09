"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClassSession } from '@/schemas/class-session.schema';
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils"

interface EditStandaloneClassSessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ClassSession | null;
  onSessionUpdated: () => void;
}

// ... (интерфейсы Teacher, Student, Subject, ClassType остаются без изменений)

const Dropdown = ({
                    label,
                    options,
                    value,
                    onChange,
                    placeholder,
                    id
                  }: {
  label: string;
  options: { id: string; name: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  id: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);

  const handleOptionClick = useCallback((optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className="relative">
      <Label htmlFor={id} className="text-right block mb-2">
        {label}
      </Label>
      <div
        className={cn(
          "flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer",
          "bg-background text-foreground",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "w-full"
        )}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Select ${label}`}
      >
        <span>{selectedOption ? selectedOption.name : placeholder}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-card rounded-md shadow-lg border border-border" role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = value === option.id;
            return (
              <div
                key={option.id}
                className={cn(
                  "px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                  "transition-colors duration-200",
                  isSelected && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleOptionClick(option.id)}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
              >
                {option.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [classTypeId, setClassTypeId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const teachersResponse = await fetch('/api/teacher');
        if (!teachersResponse.ok) {
          throw new Error(`Failed to fetch teachers: ${teachersResponse.status}`);
        }
        const teachersData = await teachersResponse.json();
        if (teachersData && Array.isArray(teachersData.data)) {
          setTeachers(teachersData.data.map(teacher => ({ teacherId: teacher.teacherId, name: teacher.name })));
        } else {
          console.error('Invalid data format for teachers:', teachersData);
          setError('Invalid data format for teachers.');
          setTeachers([]);
        }

        const studentsResponse = await fetch('/api/student');
        if (!studentsResponse.ok) {
          throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
        }
        const studentsData = await studentsResponse.json();
        if (studentsData && Array.isArray(studentsData.data)) {
          setStudents(studentsData.data.map(student => ({ studentId: student.studentId, name: student.name })));
        } else {
          console.error('Invalid data format for students:', studentsData);
          setError('Invalid data format for students.');
          setStudents([]);
        }

        const subjectsResponse = await fetch('/api/subjects');
        if (!subjectsResponse.ok) {
          throw new Error(`Failed to fetch subjects: ${subjectsResponse.status}`);
        }
        const subjectsData = await subjectsResponse.json();
        if (subjectsData && Array.isArray(subjectsData.data)) {
          setSubjects(subjectsData.data.map(subject => ({ subjectId: subject.subjectId, name: subject.name })));
        } else {
          console.error('Invalid data format for subjects:', subjectsData);
          setError('Invalid data format for subjects.');
          setSubjects([]);
        }

        const classTypesResponse = await fetch('/api/class-type');
        if (!classTypesResponse.ok) {
          throw new Error(`Failed to fetch class types: ${classTypesResponse.status}`);
        }
        const classTypesData = await classTypesResponse.json();
        if (classTypesData && Array.isArray(classTypesData.data)) {
          setClassTypes(classTypesData.data.map(classType => ({ classTypeId: classType.classTypeId, name: classType.name })));
        } else {
          console.error('Invalid data format for class types:', classTypesData);
          setError('Invalid data format for class types.');
          setClassTypes([]);
        }

        if (session) {
          setDate(session.date ? session.date.split('T')[0] : '');
          setStartTime(session.startTime ? session.startTime.split('T')[1].slice(0, 5) : '');
          setEndTime(session.endTime ? session.endTime.split('T')[1].slice(0, 5) : '');
          setTeacherId(session.teacherId || null);
          setStudentId(session.studentId || null);
          setSubjectId(session.subjectId || null);
          setClassTypeId(session.classTypeId || null);
          setNotes(session.notes || '');
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить данные для формы.');
        console.error('Ошибка загрузки данных формы:', err);
      }
    };

    if (open) {
      fetchFormData();
    } else {
      // Сброс состояния при закрытии формы
      setDate('');
      setStartTime('');
      setEndTime('');
      setTeacherId(null);
      setStudentId(null);
      setSubjectId(null);
      setClassTypeId(null);
      setNotes('');
      setError(null);
    }
  }, [open, session]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;

    setIsLoading(true);
    setError(null);

    const updatedSessionData = {
      classId: session.classId,
      startTime: startTime || null,
      endTime: endTime || null,
      notes: notes,
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
        onOpenChange(false);
        onSessionUpdated();
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

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать занятие</DialogTitle>
          <DialogDescription>Измените детали занятия.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Эти поля будут отображаться, но не будут отправляться для обновления */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Дата
            </Label>
            <Input
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="col-span-3"
              disabled // Поле заблокировано для редактирования
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Начало
            </Label>
            <Input
              id="start-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              type="time"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              Конец
            </Label>
            <Input
              id="end-time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              type="time"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacher" className="text-right">
              Преподаватель
            </Label>
            <Dropdown
              key="teacher-dropdown"
              id="teacher"
              label="Преподаватель"
              options={teachers}
              value={teacherId}
              onChange={setTeacherId}
              placeholder="Выберите преподавателя"
              disabled // Поле заблокировано для редактирования
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              Студент
            </Label>
            <Dropdown
              key="student-dropdown"
              id="student"
              label="Студент"
              options={students}
              value={studentId}
              onChange={setStudentId}
              placeholder="Выберите студента"
              disabled // Поле заблокировано для редактирования
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Предмет
            </Label>
            <Dropdown
              key="subject-dropdown"
              id="subject"
              label="Предмет"
              options={subjects}
              value={subjectId}
              onChange={setSubjectId}
              placeholder="Выберите предмет"
              disabled // Поле заблокировано для редактирования
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class-type" className="text-right">
              Тип занятия
            </Label>
            <Dropdown
              key="class-type-dropdown"
              id="class-type"
              label="Тип занятия"
              options={classTypes}
              value={classTypeId}
              onChange={setClassTypeId}
              placeholder="Выберите тип занятия"
              disabled // Поле заблокировано для редактирования
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              Заметки
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditStandaloneClassSessionForm;
