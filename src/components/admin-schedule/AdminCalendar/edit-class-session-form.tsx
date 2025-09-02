"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon } from 'lucide-react'
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Define interfaces for API responses
interface ApiResponse<T> {
  data: T[]
}

interface Teacher {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
}

interface Booth {
  id: string
  name: string
}

interface ClassSession {
  classId: string
  teacherId: string
  teacherName: string
  studentId: string
  studentName: string
  subjectId: string
  subjectName: string
  classTypeId: string
  classTypeName: string
  boothId: string
  boothName: string
  branchId: string
  branchName: string
  date: string
  startTime: string
  endTime: string
  duration: number
  notes: string
  createdAt: string
  updatedAt: string
  seriesId: string | null
}

interface EditClassSessionFormProps {
  session: ClassSession
  onComplete: () => void
  onError: (error: Error) => void
}

export function EditClassSessionForm({ session, onComplete, onError }: EditClassSessionFormProps) {
  const [formData, setFormData] = useState<ClassSession>({ ...session })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    session.date ? new Date(session.date) : undefined
  )
  // Edit scope: single instance or from this instance forward (if part of a series)
  const [editScope, setEditScope] = useState<'single' | 'future'>("single")

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

  // Log API base URL for debugging
  useEffect(() => {
    console.log("API Base URL:", baseUrl || "(empty)");
    console.log("Editing session with classId:", session.classId);
    console.log("Current session data:", session);
  }, [baseUrl, session]);

  // Fetch teachers data
  const { data: teachersResponse, isLoading: isLoadingTeachers } = useQuery<ApiResponse<Teacher>>({
    queryKey: ["teachers"],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/api/teachers`)
      if (!response.ok) throw new Error("Failed to fetch teachers")
      const result = await response.json()
      return Array.isArray(result) ? { data: result } : result
    },
  })

  // Fetch students data
  const { data: studentsResponse, isLoading: isLoadingStudents } = useQuery<ApiResponse<Student>>({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/api/students`)
      if (!response.ok) throw new Error("Failed to fetch students")
      const result = await response.json()
      return Array.isArray(result) ? { data: result } : result
    },
  })

  // Fetch booths data
  const { data: boothsResponse, isLoading: isLoadingBooths } = useQuery<ApiResponse<Booth>>({
    queryKey: ["booths"],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/api/booths`)
      if (!response.ok) throw new Error("Failed to fetch booths")
      const result = await response.json()
      return Array.isArray(result) ? { data: result } : result
    },
  })

  // Fetch subjects data
  const { data: subjectsResponse, isLoading: isLoadingSubjects } = useQuery<ApiResponse<Subject>>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/api/subjects`)
      if (!response.ok) throw new Error("Failed to fetch subjects")
      const result = await response.json()
      return Array.isArray(result) ? { data: result } : result
    },
  })

  // Submit: update single or future-in-series based on scope
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data - still validate but don't use required attribute
    if (!formData.teacherId || !formData.studentId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("必須項目をすべて入力してください");
      return;
    }

    // Calculate duration if needed
    if (!formData.duration) {
      const start = formData.startTime.split(":").map(Number);
      const end = formData.endTime.split(":").map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      const duration = endMinutes - startMinutes;

      if (duration <= 0) {
        toast.error("終了時間は開始時間より後である必要があります");
        return;
      }

      formData.duration = duration;
    }

    // Decide endpoint based on scope
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      if (editScope === 'future' && session.seriesId) {
        // Build minimal series update payload
        const payload: any = {
          teacherId: formData.teacherId || undefined,
          studentId: formData.studentId || undefined,
          subjectId: formData.subjectId || undefined,
          classTypeId: formData.classTypeId || undefined,
          boothId: formData.boothId || undefined,
          startTime: formData.startTime,
          endTime: formData.endTime,
          duration: formData.duration,
          notes: formData.notes,
          fromClassId: session.classId,
        };

        const url = `${baseUrl}/api/class-sessions/series/${session.seriesId}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          let msg = "授業シリーズの更新に失敗しました";
          try {
            const data = await res.json();
            console.error("Series update failed:", data);
            msg = `${msg}: ${res.status} ${JSON.stringify(data)}`;
          } catch {}
          toast.error(msg);
          onError(new Error(msg));
          return;
        }
        toast.success("この回以降の授業を更新しました");
        onComplete();
        return;
      }

      // Fallback: single instance update
      const updateUrl = `${baseUrl}/api/class-sessions/${formData.classId}`;
      const response = await fetch(updateUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        let errorMessage = "授業の更新に失敗しました";
        try {
          const errorData = await response.json();
          console.error("Direct update failed with data:", errorData);
          errorMessage = `授業の更新に失敗しました: ${response.status} ${JSON.stringify(errorData)}`;
        } catch {}
        toast.error(errorMessage);
        onError(new Error(errorMessage));
        return;
      }
      toast.success("授業情報が正常に更新されました");
      onComplete();
    } catch (error) {
      console.error("Update error:", error);
      const errorMessage = error instanceof Error ? error.message : "授業の更新に失敗しました";
      toast.error(errorMessage);
      onError(new Error(errorMessage));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    // Update both ID and Name fields based on selection
    if (name === 'teacherId') {
      const selectedTeacher = teachersResponse?.data.find(teacher => teacher.id === value);
      setFormData(prev => ({
        ...prev,
        teacherId: value,
        teacherName: selectedTeacher?.name || prev.teacherName
      }));
    } else if (name === 'studentId') {
      const selectedStudent = studentsResponse?.data.find(student => student.id === value);
      setFormData(prev => ({
        ...prev,
        studentId: value,
        studentName: selectedStudent?.name || prev.studentName
      }));
    } else if (name === 'subjectId') {
      const selectedSubject = subjectsResponse?.data.find(subject => subject.id === value);
      setFormData(prev => ({
        ...prev,
        subjectId: value,
        subjectName: selectedSubject?.name || prev.subjectName
      }));
    } else if (name === 'boothId') {
      const selectedBooth = boothsResponse?.data.find(booth => booth.id === value);
      setFormData(prev => ({
        ...prev,
        boothId: value,
        boothName: selectedBooth?.name || prev.boothName
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      // Format date as YYYY-MM-DD
      const formattedDate = format(date, "yyyy-MM-dd");
      setFormData((prev) => ({ ...prev, date: formattedDate }))
    }
  }

  const isLoading = isLoadingTeachers || isLoadingStudents || isLoadingBooths || isLoadingSubjects;

  if (isLoading) {
    return <div className="flex justify-center py-6">データを読み込み中...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {session.seriesId && (
        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Label className="text-sm font-medium text-foreground">編集範囲を選択</Label>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="editScope"
                value="single"
                checked={editScope === 'single'}
                onChange={() => setEditScope('single')}
              />
              この授業のみ編集
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="editScope"
                value="future"
                checked={editScope === 'future'}
                onChange={() => setEditScope('future')}
              />
              この回以降を編集
            </label>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="teacherId">講師</Label>
          <Select
            defaultValue={session.teacherId}
            value={formData.teacherId}
            onValueChange={(value) => handleSelectChange('teacherId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="講師を選択" />
            </SelectTrigger>
            <SelectContent>
              {teachersResponse?.data.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentId">生徒</Label>
          <Select
            defaultValue={session.studentId}
            value={formData.studentId}
            onValueChange={(value) => handleSelectChange('studentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="生徒を選択" />
            </SelectTrigger>
            <SelectContent>
              {studentsResponse?.data.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subjectId">科目</Label>
          <Select
            defaultValue={session.subjectId}
            value={formData.subjectId}
            onValueChange={(value) => handleSelectChange('subjectId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="科目を選択" />
            </SelectTrigger>
            <SelectContent>
              {subjectsResponse?.data.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="boothId">ブース</Label>
          <Select
            defaultValue={session.boothId}
            value={formData.boothId}
            onValueChange={(value) => handleSelectChange('boothId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="ブースを選択" />
            </SelectTrigger>
            <SelectContent>
              {boothsResponse?.data.map((booth) => (
                <SelectItem key={booth.id} value={booth.id}>
                  {booth.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>日付</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "yyyy年MM月dd日", { locale: ja }) : "日付を選択"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
              locale={ja}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">開始時間</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            value={formData.startTime}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">終了時間</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            value={formData.endTime}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">メモ</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onComplete}>
          キャンセル
        </Button>
        <Button type="submit">
          更新
        </Button>
      </div>
    </form>
  )
}

export default EditClassSessionForm
