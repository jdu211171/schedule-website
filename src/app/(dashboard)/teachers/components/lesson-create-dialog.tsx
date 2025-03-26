'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Available rooms for selection
const availableRooms = [
  "101", "102", "103", "104", "105", "106", "107", "108", "109", "110"
];

// Available time slots
const availableTimeSlots = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

// Mock students for selection
const availableStudents = [
  "Yuki Tanaka", "Akira Suzuki", "Mika Watanabe", "Hiroshi Kimura",
  "Yuta Takahashi", "Hana Sato", "Takeshi Yamada", "Hiromi Saito",
  "Ryo Tanaka", "Mei Suzuki", "Haruki Yamamoto", "Miki Kato",
  "Group 2-A", "Group 2-B", "Group 2-C", "Group 3-A",
  "Group 3-B", "Group 3-C", "Group 4-A", "Group 4-B",
  "Group 4-C", "Group 4-D"
];

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

type LessonCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number;
  subject: string;
  onLessonCreated: (lesson: Lesson) => void;
};

export function LessonCreateDialog({
  open,
  onOpenChange,
  day,
  subject,
  onLessonCreated
}: LessonCreateDialogProps) {
  const [timeSlot, setTimeSlot] = useState("");
  const [room, setRoom] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // Parse the selected time slot to get start, end and hours
  const getTimeDetails = () => {
    const selectedSlot = availableTimeSlots.find(
      slot => `${slot.start}-${slot.end}` === timeSlot
    );
    
    if (!selectedSlot) return { startTime: "", endTime: "", hours: 0 };
    
    // Calculate hours (assuming format HH:MM)
    const startHour = parseInt(selectedSlot.start.split(':')[0]);
    const startMin = parseInt(selectedSlot.start.split(':')[1]);
    const endHour = parseInt(selectedSlot.end.split(':')[0]);
    const endMin = parseInt(selectedSlot.end.split(':')[1]);
    
    const totalStartMinutes = startHour * 60 + startMin;
    const totalEndMinutes = endHour * 60 + endMin;
    const durationMinutes = totalEndMinutes - totalStartMinutes;
    const hours = durationMinutes / 60;
    
    return {
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      hours
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { startTime, endTime, hours } = getTimeDetails();
    
    if (!startTime || !endTime || hours === 0) {
      alert("Please select a valid time slot");
      return;
    }
    
    // Create new lesson object
    const newLesson: Lesson = {
      id: 0, // Will be set by parent component
      subject,
      day: day.toString().padStart(2, '0'),
      hours,
      room,
      startTime,
      endTime,
      students: selectedStudents
    };
    
    // Call the callback
    onLessonCreated(newLesson);
    
    // Reset form
    setTimeSlot("");
    setRoom("");
    setSelectedStudents([]);
  };

  const toggleStudent = (student: string) => {
    if (selectedStudents.includes(student)) {
      setSelectedStudents(selectedStudents.filter(s => s !== student));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
          <DialogDescription>
            Create a new lesson for {subject} on day {day.toString().padStart(2, '0')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Input
                id="subject"
                value={subject}
                className="col-span-3"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="day" className="text-right">
                Day
              </Label>
              <Input
                id="day"
                value={day.toString().padStart(2, '0')}
                className="col-span-3"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="timeSlot" className="text-right">
                Time
              </Label>
              <Select 
                value={timeSlot} 
                onValueChange={setTimeSlot}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.map((slot, index) => (
                    <SelectItem 
                      key={index} 
                      value={`${slot.start}-${slot.end}`}
                    >
                      {slot.start} - {slot.end}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="room" className="text-right">
                Room
              </Label>
              <Select 
                value={room} 
                onValueChange={setRoom}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map(room => (
                    <SelectItem key={room} value={room}>
                      Room {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Students
              </Label>
              <div className="col-span-3">
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {availableStudents.map(student => (
                    <div key={student} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`student-${student}`}
                        checked={selectedStudents.includes(student)}
                        onChange={() => toggleStudent(student)}
                        className="mr-2"
                      />
                      <label htmlFor={`student-${student}`}>
                        {student}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedStudents.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Please select at least one student
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
              disabled={!timeSlot || !room || selectedStudents.length === 0}
            >
              Create Lesson
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}