'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
};

type TeacherDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
  onTeacherDeleted: (teacherId: string) => void;
};

export function TeacherDeleteDialog({ 
  open, 
  onOpenChange,
  teacher,
  onTeacherDeleted 
}: TeacherDeleteDialogProps) {
  const handleDelete = () => {
    onTeacherDeleted(teacher.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Teacher</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this teacher? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="border rounded-md p-4 bg-gray-50">
            <div className="font-medium">{teacher.name}</div>
            <div className="text-sm text-gray-500">ID: {teacher.id}</div>
            <div className="text-sm text-gray-500 mt-1">
              Subjects: {teacher.subjects.join(", ")}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleDelete}
          >
            Delete Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}