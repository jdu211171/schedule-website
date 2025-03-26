'use client';

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TeacherClockwork } from './teacher-clockwork';

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
};

type TeacherClockworkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
};

export function TeacherClockworkDialog({ 
  open, 
  onOpenChange,
  teacher
}: TeacherClockworkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-xl">
        <TeacherClockwork teacher={teacher} />
      </DialogContent>
    </Dialog>
  );
}