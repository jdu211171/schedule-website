"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTeachers } from "@/hooks/useTeacherQuery"
import { useSubjects } from "@/hooks/useSubjectQuery"
import { useTeacherSubjectCreate, useTeacherSubjectUpdate } from "@/hooks/useTeacherSubjectMutation"
import { desiredTimeSchema } from "@/schemas/desiredTime.schema"

interface TeacherSubjectWithDetails {
    teacherId: string;
    subjectId: string;
    notes?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    teacher?: { name: string };
    subject?: { name: string };
    desiredTimes?: Array<{
        dayOfWeek: string;
        startTime: string;
        endTime: string;
    }>;
}

interface TeacherSubjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teacherSubject?: TeacherSubjectWithDetails | null;
}

export function TeacherSubjectFormDialog({ 
    open, 
    onOpenChange, 
    teacherSubject 
}: TeacherSubjectFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createTeacherSubjectMutation = useTeacherSubjectCreate()
    const updateTeacherSubjectMutation = useTeacherSubjectUpdate()

    const isEditing = !!teacherSubject
    const { data: teachers = [] } = useTeachers({})
    const { data: subjects = [] } = useSubjects()

    const [selectedWeekday, setSelectedWeekday] = useState<string>("")
    const [startTime, setStartTime] = useState<string>("")
    const [endTime, setEndTime] = useState<string>("")
    const [desiredTimes, setDesiredTimes] = useState<Array<z.infer<typeof desiredTimeSchema>>>(
        teacherSubject?.desiredTimes || []
    )

    const formSchema = z.object({
        teacherId: z.string().min(1, { message: "講師を選択してください" }),
        subjectId: z.string().min(1, { message: "科目を選択してください" }),
        notes: z.string().optional(),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teacherId: teacherSubject?.teacherId || "",
            subjectId: teacherSubject?.subjectId || "",
            notes: teacherSubject?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const dataWithDesiredTimes = {
                ...values,
                desiredTimes
            }
            
            if (isEditing && teacherSubject) {
                const updateData = {
                    teacherId: teacherSubject.teacherId,
                    subjectId: teacherSubject.subjectId,
                    notes: values.notes,
                    desiredTimes
                }
                await updateTeacherSubjectMutation.mutateAsync(updateData)
            } else {
                await createTeacherSubjectMutation.mutateAsync(dataWithDesiredTimes)
            }
            onOpenChange(false)
            form.reset()
            setDesiredTimes([])
        } catch (error) {
            console.error("Failed to save teacher subject assignment:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAddDesiredTime = () => {
        if (!selectedWeekday || !startTime || !endTime) return
        
        if (startTime >= endTime) {
            alert("開始時間は終了時間より前にしてください")
            return
        }
        
        // Check if weekday already exists
        const weekdayExists = desiredTimes.some(time => time.dayOfWeek === selectedWeekday)
        if (weekdayExists) {
            alert("この曜日の希望時間は既に追加されています")
            return
        }
        
        const newTime = {
            dayOfWeek: selectedWeekday,
            startTime,
            endTime
        }
        
        setDesiredTimes([...desiredTimes, newTime])
        setSelectedWeekday("")
        setStartTime("")
        setEndTime("")
    }

    const handleRemoveDesiredTime = (index: number) => {
        const newTimes = [...desiredTimes]
        newTimes.splice(index, 1)
        setDesiredTimes(newTimes)
    }

    const formatWeekday = (weekday: string) => {
        switch(weekday) {
            case "Monday": return "月曜日"
            case "Tuesday": return "火曜日"
            case "Wednesday": return "水曜日"
            case "Thursday": return "木曜日"
            case "Friday": return "金曜日"
            default: return weekday
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? "講師科目割り当ての編集" : "講師科目割り当ての作成"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="teacherId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>講師</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="講師を選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teachers.map((teacher) => (
                                                    <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                                                        {teacher.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subjectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>科目</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="科目を選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subjects.map((subject) => (
                                                    <SelectItem key={subject.subjectId} value={subject.subjectId}>
                                                        {subject.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="space-y-2">
                            <FormLabel>希望時間</FormLabel>
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Select 
                                        onValueChange={(value) => setSelectedWeekday(value)}
                                        value={selectedWeekday}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="曜日を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                                                .filter(day => !desiredTimes.some(time => time.dayOfWeek === day))
                                                .map(day => (
                                                    <SelectItem key={day} value={day}>
                                                        {formatWeekday(day)}
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="flex items-center">
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-28"
                                        style={{ appearance: "none", WebkitAppearance: "none" }}
                                    />
                                    
                                    <span className="mx-2 text-sm font-medium">〜</span>
                                    
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-28"
                                        style={{ appearance: "none", WebkitAppearance: "none" }}
                                    />
                                </div>
                                
                                <Button 
                                    type="button"
                                    onClick={handleAddDesiredTime}
                                    disabled={!selectedWeekday || !startTime || !endTime}
                                >
                                    追加
                                </Button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                                {desiredTimes.map((time, index) => (
                                    <div key={index} className="flex items-center bg-accent rounded-md px-3 py-1">
                                        <span>
                                            {formatWeekday(time.dayOfWeek)}: {time.startTime}〜{time.endTime}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-1 cursor-pointer hover:bg-muted"
                                            aria-label="削除"
                                            onClick={() => handleRemoveDesiredTime(index)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>メモ</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="メモを入力" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}