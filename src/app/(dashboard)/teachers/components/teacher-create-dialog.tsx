'use client';

import React, { useState } from 'react';
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

type TeacherCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeacherCreated: (teacher: {
    id: string;
    name: string;
    subjects: string[];
  }) => void;
};

export function TeacherCreateDialog({ 
  open, 
  onOpenChange,
  onTeacherCreated 
}: TeacherCreateDialogProps) {
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new teacher object
    const newTeacher = {
      id: teacherId,
      name: teacherName,
      subjects: selectedSubjects
    };
    
    // Call the callback
    onTeacherCreated(newTeacher);
    
    // Reset form
    setTeacherId("");
    setTeacherName("");
    setSelectedSubjects([]);
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
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogDescription>
            Enter the details for the new teacher.
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
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="T001"
                className="col-span-3"
                required
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
                placeholder="John Doe"
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
              disabled={!teacherId || !teacherName || selectedSubjects.length === 0}
            >
              Create Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}