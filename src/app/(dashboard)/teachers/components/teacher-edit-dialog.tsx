'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Available subjects for selection
const availableSubjects = [
  "Mathematics", "Physics", "Computer Science", "Chemistry", "Biology",
  "English", "Japanese Literature", "History", "Social Studies",
  "Physical Education", "Health Science", "Art", "Music"
];

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
};

type TeacherEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
  onTeacherUpdated: (teacher: Teacher) => void;
};

export function TeacherEditDialog({ 
  open, 
  onOpenChange,
  teacher,
  onTeacherUpdated 
}: TeacherEditDialogProps) {
  const [teacherName, setTeacherName] = useState(teacher.name);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(teacher.subjects);

  // Update state when teacher prop changes
  useEffect(() => {
    setTeacherName(teacher.name);
    setSelectedSubjects(teacher.subjects);
  }, [teacher]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create updated teacher object
    const updatedTeacher = {
      ...teacher,
      name: teacherName,
      subjects: selectedSubjects
    };
    
    // Call the callback
    onTeacherUpdated(updatedTeacher);
  };

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update the teacher's information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacherId" className="text-right">
                ID
              </Label>
              <Input
                id="teacherId"
                value={teacher.id}
                className="col-span-3"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teacherName" className="text-right">
                Name
              </Label>
              <Input
                id="teacherName"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Subjects
              </Label>
              <div className="col-span-3">
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {availableSubjects.map(subject => (
                    <div key={subject} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`subject-${subject}`}
                        checked={selectedSubjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                        className="mr-2"
                      />
                      <label htmlFor={`subject-${subject}`}>
                        {subject}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedSubjects.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Please select at least one subject
                  </p>
                )}
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
              type="submit" 
              disabled={!teacherName || selectedSubjects.length === 0}
            >
              Update Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}