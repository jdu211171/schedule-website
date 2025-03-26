'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Plus, Users, Clock, Home } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LessonCreateDialog } from './lesson-create-dialog';
import { LessonEditDialog } from './lesson-edit-dialog';
import { LessonViewDialog } from './lesson-view-dialog';

type Teacher = {
  id: string;
  name: string;
  subjects: string[];
};

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

// Mock data for lessons
const mockLessons: Lesson[] = [
  { id: 1, subject: "Mathematics", day: "01", hours: 1.0, room: "101", startTime: "09:00", endTime: "10:00", students: ["Yuki Tanaka", "Akira Suzuki"] },
  { id: 2, subject: "Mathematics", day: "01", hours: 1.0, room: "105", startTime: "13:00", endTime: "14:00", students: ["Mika Watanabe"] },
  { id: 3, subject: "Mathematics", day: "01", hours: 1.0, room: "102", startTime: "15:00", endTime: "16:00", students: ["Group 3-B"] },
  { id: 4, subject: "Mathematics", day: "03", hours: 0.5, room: "103", startTime: "10:30", endTime: "11:00", students: ["Hiroshi Kimura"] },
  { id: 5, subject: "Physics", day: "02", hours: 1.5, room: "104", startTime: "13:00", endTime: "14:30", students: ["Group 4-A"] },
  { id: 6, subject: "Physics", day: "05", hours: 1.0, room: "106", startTime: "09:00", endTime: "10:00", students: ["Yuta Takahashi"] },
  { id: 7, subject: "Physics", day: "08", hours: 0.5, room: "107", startTime: "11:30", endTime: "12:00", students: ["Hana Sato"] },
  { id: 8, subject: "Computer Science", day: "06", hours: 2.0, room: "108", startTime: "14:00", endTime: "16:00", students: ["Group 3-A"] },
  { id: 9, subject: "Computer Science", day: "10", hours: 1.0, room: "101", startTime: "10:00", endTime: "11:00", students: ["Takeshi Yamada"] },
  { id: 10, subject: "Computer Science", day: "15", hours: 1.5, room: "105", startTime: "13:30", endTime: "15:00", students: ["Group 2-B"] },
  { id: 11, subject: "Mathematics", day: "14", hours: 0.5, room: "101", startTime: "11:30", endTime: "12:00", students: ["Hiromi Saito"] },
  { id: 12, subject: "Physics", day: "16", hours: 1.0, room: "102", startTime: "14:00", endTime: "15:00", students: ["Group 4-C"] },
  { id: 13, subject: "Computer Science", day: "19", hours: 1.0, room: "103", startTime: "09:00", endTime: "10:00", students: ["Ryo Tanaka"] },
  { id: 14, subject: "Mathematics", day: "22", hours: 1.5, room: "104", startTime: "13:00", endTime: "14:30", students: ["Group 2-C"] },
  { id: 15, subject: "Physics", day: "26", hours: 0.5, room: "105", startTime: "10:30", endTime: "11:00", students: ["Mei Suzuki"] },
  { id: 16, subject: "Mathematics", day: "27", hours: 1.0, room: "106", startTime: "14:00", endTime: "15:00", students: ["Group 4-D"] },
  { id: 17, subject: "Physics", day: "28", hours: 1.0, room: "107", startTime: "09:00", endTime: "10:00", students: ["Haruki Yamamoto"] },
  { id: 18, subject: "Computer Science", day: "30", hours: 0.5, room: "108", startTime: "11:30", endTime: "12:00", students: ["Miki Kato"] },
];

// Subject colors
const subjectColors: Record<string, string> = {
  "Mathematics": "#d4e5ff",
  "Physics": "#ffecd4",
  "Computer Science": "#d4ffdc",
  "Chemistry": "#ffe6e6",
  "Biology": "#e1ffdb",
  "English": "#efe0ff",
  "Japanese Literature": "#ffd6e0",
  "History": "#ffecb3",
  "Social Studies": "#e5e5e5",
  "Physical Education": "#cce5ff",
  "Health Science": "#dcffd1",
  "Art": "#ffdae0",
  "Music": "#d4f7ff"
};

type TeacherClockworkProps = {
  teacher: Teacher;
};

export function TeacherClockwork({ teacher }: TeacherClockworkProps) {
  const [currentMonth, setCurrentMonth] = useState(3); // March
  const [currentYear, setCurrentYear] = useState(2025);
  const [activeView, setActiveView] = useState("month");
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons);
  
  // Filter lessons for this teacher's subjects
  const teacherLessons = lessons.filter(lesson => 
    teacher.subjects.includes(lesson.subject)
  );
  
  // States for lesson dialogs
  const [showLessonsDialog, setShowLessonsDialog] = useState(false);
  const [showLessonEditDialog, setShowLessonEditDialog] = useState(false);
  const [showLessonCreateDialog, setShowLessonCreateDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Format hours for display
  const formatHours = (hours: number) => {
    if (hours === 0) return "";
    return hours.toString().replace('.5', ':30').replace('.0', ':00');
  };

  // Get lessons for specific day and subject
  const getLessonsForDaySubject = (day: number, subject: string) => {
    const formattedDay = day.toString().padStart(2, '0');
    return teacherLessons.filter(
      lesson => lesson.day === formattedDay && lesson.subject === subject
    );
  };
  
  // Get total hours for day and subject
  const getHoursForDaySubject = (day: number, subject: string) => {
    const dayLessons = getLessonsForDaySubject(day, subject);
    return dayLessons.reduce((total, lesson) => total + lesson.hours, 0);
  };
  
  // Open lessons dialog
  const openLessonsDialog = (day: number, subject: string) => {
    setSelectedDay(day);
    setSelectedSubject(subject);
    setShowLessonsDialog(true);
  };
  
  // Open lesson edit dialog
  const openLessonEditDialog = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowLessonEditDialog(true);
    setShowLessonsDialog(false);
  };
  
  // Open lesson create dialog
  const openLessonCreateDialog = (day: number, subject: string) => {
    setSelectedDay(day);
    setSelectedSubject(subject);
    setShowLessonCreateDialog(true);
    setShowLessonsDialog(false);
  };

  // Navigate between months
  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Get month name
  const getMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month - 1];
  };

  // Handle lesson creation
  const handleLessonCreated = (newLesson: Lesson) => {
    setLessons([...lessons, { ...newLesson, id: Math.max(...lessons.map(l => l.id)) + 1 }]);
    setShowLessonCreateDialog(false);
  };
  
  // Handle lesson update
  const handleLessonUpdated = (updatedLesson: Lesson) => {
    setLessons(lessons.map(lesson => 
      lesson.id === updatedLesson.id ? updatedLesson : lesson
    ));
    setShowLessonEditDialog(false);
  };
  
  // Handle lesson deletion
  const handleLessonDeleted = (lessonId: number) => {
    setLessons(lessons.filter(lesson => lesson.id !== lessonId));
    setShowLessonEditDialog(false);
  };

  // Render month view
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Calculate total hours per subject
    const totalHoursBySubject: Record<string, number> = {};
    teacher.subjects.forEach(subject => {
      const subjectLessons = teacherLessons.filter(lesson => lesson.subject === subject);
      totalHoursBySubject[subject] = subjectLessons.reduce((total, lesson) => total + lesson.hours, 0);
    });
    
    // Calculate grand total
    const grandTotal = Object.values(totalHoursBySubject).reduce((total, hours) => total + hours, 0);
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border text-left font-medium sticky left-0 bg-gray-50 z-10 min-w-36">Subject / Total Hours</th>
              {days.map(day => (
                <th key={day} className="p-2 border text-center font-medium w-14 min-w-14">
                  {day.toString().padStart(2, '0')}
                  <div className="text-xs font-normal">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][new Date(currentYear, currentMonth - 1, day).getDay()]}
                  </div>
                </th>
              ))}
              <th className="p-2 border text-center font-medium w-20 sticky right-0 bg-gray-50 z-10">Total</th>
            </tr>
          </thead>
          <tbody>
            {teacher.subjects.map(subject => (
              <tr key={subject} className="hover:bg-gray-50">
                <td className="p-2 border font-medium sticky left-0 bg-white z-10 min-w-36">{subject}</td>
                {days.map(day => {
                  const dayLessons = getLessonsForDaySubject(day, subject);
                  const totalHours = dayLessons.reduce((total, lesson) => total + lesson.hours, 0);
                  
                  return (
                    <td 
                      key={day} 
                      className={`p-1 border text-center cursor-pointer hover:opacity-80`}
                      style={{ 
                        backgroundColor: dayLessons.length > 0 ? subjectColors[subject] : 'transparent',
                      }}
                      onClick={() => openLessonsDialog(day, subject)}
                    >
                      {totalHours > 0 ? formatHours(totalHours) : ""}
                    </td>
                  );
                })}
                <td className="p-2 border text-center font-medium sticky right-0 bg-gray-50">
                  {totalHoursBySubject[subject] || 0}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-medium">
              <td className="p-2 border sticky left-0 bg-gray-100 z-10">Total</td>
              {days.map(day => {
                const dayTotal = teacherLessons
                  .filter(lesson => lesson.day === day.toString().padStart(2, '0'))
                  .reduce((total, lesson) => total + lesson.hours, 0);
                return (
                  <td key={day} className="p-2 border text-center">
                    {dayTotal > 0 ? dayTotal : ""}
                  </td>
                );
              })}
              <td className="p-2 border text-center font-bold sticky right-0 bg-gray-100">
                {grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between bg-white p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Clockwork: {teacher.name}</h2>
          </div>
        </div>
        
        <div className="flex justify-between items-center bg-white p-4">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium px-2">
              {getMonthName(currentMonth)} {currentYear}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="month" value={activeView} onValueChange={setActiveView}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
          <TabsContent value="month" className="p-0 border">
            {renderMonthView()}
          </TabsContent>
        </Tabs>
        
        {/* Lesson View Dialog */}
        {showLessonsDialog && selectedDay !== null && selectedSubject !== null && (
          <LessonViewDialog
            open={showLessonsDialog}
            onOpenChange={setShowLessonsDialog}
            day={selectedDay}
            subject={selectedSubject}
            lessons={getLessonsForDaySubject(selectedDay, selectedSubject)}
            onEditLesson={openLessonEditDialog}
            onCreateLesson={openLessonCreateDialog}
          />
        )}
        
        {/* Lesson Edit Dialog */}
        {showLessonEditDialog && selectedLesson && (
          <LessonEditDialog
            open={showLessonEditDialog}
            onOpenChange={setShowLessonEditDialog}
            lesson={selectedLesson}
            onLessonUpdated={handleLessonUpdated}
            onLessonDeleted={handleLessonDeleted}
          />
        )}
        
        {/* Lesson Create Dialog */}
        {showLessonCreateDialog && selectedDay !== null && selectedSubject !== null && (
          <LessonCreateDialog
            open={showLessonCreateDialog}
            onOpenChange={setShowLessonCreateDialog}
            day={selectedDay}
            subject={selectedSubject}
            onLessonCreated={handleLessonCreated}
          />
        )}
      </div>
    </div>
  );
}