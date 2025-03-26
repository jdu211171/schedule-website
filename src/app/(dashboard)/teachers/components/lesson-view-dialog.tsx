'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Clock, Home, Users } from 'lucide-react';
import { Plus } from 'lucide-react';

// Types
type Lesson = {
  id: number;
  subject: string;
  day: string;
  hours: number;
  room: string;
  startTime: string;
  endTime: string;
  students: string[];
};

type LessonViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number;
  subject: string;
  lessons: Lesson[];
  onEditLesson: (lesson: Lesson) => void;
  onCreateLesson: (day: number, subject: string) => void;
};

export function LessonViewDialog({
  open,
  onOpenChange,
  day,
  subject,
  lessons,
  onEditLesson,
  onCreateLesson
}: LessonViewDialogProps) {
  // Format hours for display
  const formatHours = (hours: number) => {
    if (hours === 0) return "";
    return hours.toString().replace('.5', ':30').replace('.0', ':00');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lessons: {subject} ({day.toString().padStart(2, '0')})</DialogTitle>
          <DialogDescription>
            All lessons for the selected subject on this day
          </DialogDescription>
        </DialogHeader>

        {lessons.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            No lessons scheduled for this subject on this day.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {lessons.map(lesson => (
              <Card 
                key={lesson.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onEditLesson(lesson)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-base">{lesson.subject}</CardTitle>
                    <span className="text-sm font-medium">{lesson.startTime} - {lesson.endTime}</span>
                  </div>
                  <CardDescription>Lesson #{lesson.id}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Home className="h-4 w-4 text-gray-500" />
                      <span>Room {lesson.room}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{formatHours(lesson.hours)} hrs</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{lesson.students.join(", ")}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 text-xs text-gray-500">
                  Click to edit
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
          <Button 
            type="button"
            onClick={() => onCreateLesson(day, subject)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}