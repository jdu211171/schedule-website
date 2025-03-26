'use client';

import React, { useState } from 'react';
import { Search, Plus, Filter, Edit, Trash, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeacherCreateDialog } from './components/teacher-create-dialog';
import { TeacherEditDialog } from './components/teacher-edit-dialog';
import { TeacherDeleteDialog } from './components/teacher-delete-dialog';
import { TeacherClockworkDialog } from './components/teacher-clockwork-dialog';

// Define Teacher type
type Teacher = {
  id: string;
  name: string;
  subjects: string[];
};

// Mock data for teachers
const mockTeachers: Teacher[] = [
  {
    id: "T001",
    name: "Akihiko Sato", 
    subjects: ["Mathematics", "Physics", "Computer Science"],
  },
  {
    id: "T002",
    name: "Yumi Tanaka",
    subjects: ["English", "Japanese Literature"],
  },
  {
    id: "T003",
    name: "Hiroshi Yamamoto",
    subjects: ["Chemistry", "Biology"],
  },
  {
    id: "T004",
    name: "Keiko Nakamura",
    subjects: ["History", "Social Studies"],
  },
  {
    id: "T005",
    name: "Toshiro Mifune",
    subjects: ["Physical Education", "Health Science"],
  }
];

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClockworkDialog, setShowClockworkDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subjects.some(subject => 
      subject.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Handler for edit teacher
  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowEditDialog(true);
  };

  // Handler for delete teacher
  const handleDeleteTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowDeleteDialog(true);
  };

  // Handler for opening clockwork
  const handleOpenClockwork = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowClockworkDialog(true);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Teachers Management</h1>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 w-full max-w-md">
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" size="icon" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </div>
      
      {/* Teachers list */}
      <div className="space-y-4">
        {filteredTeachers.length === 0 ? (
          <div className="text-center p-6 border rounded">
            No teachers found. Try adjusting your search criteria.
          </div>
        ) : (
          filteredTeachers.map(teacher => (
            <Card key={teacher.id} className="hover:bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-lg">{teacher.id}</div>
                    <div>
                      <div className="font-medium">{teacher.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teacher.subjects.map(subject => (
                          <Badge key={subject} variant="secondary">{subject}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenClockwork(teacher)}>
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleEditTeacher(teacher)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteTeacher(teacher)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Dialogs */}
      {showCreateDialog && (
        <TeacherCreateDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          onTeacherCreated={(newTeacher) => {
            setTeachers([...teachers, newTeacher]);
            setShowCreateDialog(false);
          }}
        />
      )}
      
      {showEditDialog && selectedTeacher && (
        <TeacherEditDialog 
          open={showEditDialog} 
          onOpenChange={setShowEditDialog}
          teacher={selectedTeacher}
          onTeacherUpdated={(updatedTeacher) => {
            setTeachers(teachers.map(t => 
              t.id === updatedTeacher.id ? updatedTeacher : t
            ));
            setShowEditDialog(false);
          }}
        />
      )}
      
      {showDeleteDialog && selectedTeacher && (
        <TeacherDeleteDialog 
          open={showDeleteDialog} 
          onOpenChange={setShowDeleteDialog}
          teacher={selectedTeacher}
          onTeacherDeleted={(teacherId) => {
            setTeachers(teachers.filter(t => t.id !== teacherId));
            setShowDeleteDialog(false);
          }}
        />
      )}
      
      {showClockworkDialog && selectedTeacher && (
        <TeacherClockworkDialog 
          open={showClockworkDialog} 
          onOpenChange={setShowClockworkDialog}
          teacher={selectedTeacher}
        />
      )}
    </div>
  );
}