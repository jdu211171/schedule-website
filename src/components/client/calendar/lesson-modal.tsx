"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lesson } from "./lesson-card";
import { Textarea } from "@/components/ui/textarea";

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  onSaveChanges: (lesson: Lesson) => void;
}

export function LessonModal({
  isOpen,
  onClose,
  lesson,
  onSaveChanges,
}: LessonModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    lesson ? new Date(lesson.start) : undefined
  );
  const [selectedStartTime, setSelectedStartTime] = useState("09:00");
  const [selectedEndTime, setSelectedEndTime] = useState("10:30");
  const [selectedRoom, setSelectedRoom] = useState(lesson?.location || "");
  const [selectedReason, setSelectedReason] = useState("");

  // Reset state when modal opens with new lesson data
  useEffect(() => {
    if (lesson) {
      const startDate = new Date(lesson.start);
      setSelectedDate(startDate);
      setSelectedStartTime(format(startDate, "HH:mm"));
      setSelectedEndTime(format(new Date(lesson.end), "HH:mm"));
      setSelectedRoom(lesson.location);
      setSelectedReason(""); // Сбрасываем причину при открытии нового урока
    }
  }, [lesson]);

  if (!lesson) return null;

  const handleClose = () => {
    setIsEditMode(false);
    onClose();
  };

  const handleChangeTime = () => {
    setIsEditMode(true);
    console.log(lesson);
    console.log(selectedDate);
  };

  const handleSaveChanges = () => {
    if (!selectedDate) return;

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();

    const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
    const [endHour, endMinute] = selectedEndTime.split(":").map(Number);

    const startDateTime = new Date(year, month, day, startHour, startMinute);
    const endDateTime = new Date(year, month, day, endHour, endMinute);

    const updatedLesson: Lesson = {
      ...lesson,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      location: selectedRoom,
      reason: selectedReason,
    };

    onSaveChanges(updatedLesson);
    setIsEditMode(false);
  };

  // List of available rooms
  const rooms = [
    "A101",
    "A102",
    "B201",
    "B202",
    "C301",
    "C302",
    "D401",
    "D402",
  ];

  // Generate time options from 8:00 to 18:00 with 30-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 8; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 18) {
        times.push(`${hour.toString().padStart(2, "0")}:15`);
        times.push(`${hour.toString().padStart(2, "0")}:30`);
        times.push(`${hour.toString().padStart(2, "0")}:45`);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Generate date options for next 30 days
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const dateOptions = generateDateOptions();

  const getSubjectColor = (subject: string) => {
    const subjectColors: Record<string, string> = {
      math: "bg-blue-500",
      english: "bg-green-500",
      physics: "bg-red-500",
      chemistry: "bg-yellow-500",
    };
    return subjectColors[subject] || "bg-gray-500";
  };

  const formatDateForDisplay = (date: Date | undefined) => {
    if (!date) return "日付を選択";
    return format(date, "yyyy年M月d日 (eee)", { locale: ja });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {!isEditMode ? (
        // Detail view modal
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center">
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${getSubjectColor(
                    lesson.subject
                  )}`}
                />
                {lesson.title}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="font-medium">日付:</div>
              <div className="col-span-2">
                {format(new Date(lesson.start), "yyyy年M月d日")}
              </div>

              <div className="font-medium">時間:</div>
              <div className="col-span-2">
                {format(new Date(lesson.start), "HH:mm")} 〜{" "}
                {format(new Date(lesson.end), "HH:mm")}
              </div>

              <div className="font-medium">教室:</div>
              <div className="col-span-2">{lesson.location}</div>

              <div className="font-medium">先生:</div>
              <div className="col-span-2">{lesson.teacher}</div>
            </div>
          </div>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button onClick={handleChangeTime}>時間変更</Button>
            <Button variant="outline" onClick={handleClose}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        // Edit time modal
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {lesson.title}の時間変更
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="mb-2 font-medium">日付選択:</h4>
              <Select
                value={selectedDate ? selectedDate.toISOString() : ""}
                onValueChange={(value) => setSelectedDate(new Date(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {selectedDate
                      ? formatDateForDisplay(selectedDate)
                      : "日付を選択"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((date) => (
                    <SelectItem
                      key={date.toISOString()}
                      value={date.toISOString()}
                    >
                      {format(date, "yyyy年M月d日 (eee)", { locale: ja })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-2 font-medium">開始時間:</h4>
                <Select
                  value={selectedStartTime}
                  onValueChange={setSelectedStartTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="開始時間" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="mb-2 font-medium">終了時間:</h4>
                <Select
                  value={selectedEndTime}
                  onValueChange={setSelectedEndTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="終了時間" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">教室:</h4>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="教室選択" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h4 className="mb-2 font-medium">理由:</h4>
              <Textarea
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                placeholder="変更の理由を入力してください"
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button onClick={handleSaveChanges}>確認</Button>
            <Button variant="outline" onClick={() => setIsEditMode(false)}>
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}