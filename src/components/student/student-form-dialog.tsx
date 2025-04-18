"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGrades } from "@/hooks/useGradeQuery"
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation"
import { studentCreateSchema } from "@/schemas/student.schema"
import { Student } from "@prisma/client"
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

interface StudentFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    student?: Student | null
}

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState("basic")
    const createStudentMutation = useStudentCreate()
    const updateStudentMutation = useStudentUpdate()

    const isEditing = !!student
    const { data: grades = [] } = useGrades()

    const formSchema = isEditing
        ? z.object({
            name: z.string().max(100),
            kanaName: z.string().max(100).nullable(),
            gradeId: z.string().max(50).nullable(),
            schoolName: z.string().max(100).nullable(),
            schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
            examSchoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
            examSchoolCategoryType: z.enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"]).nullable(),
            firstChoiceSchool: z.string().max(100).nullable(),
            secondChoiceSchool: z.string().max(100).nullable(),
            enrollmentDate: z.date().nullable(),
            birthDate: z.date().nullable(),
            homePhone: z.string().max(20).nullable(),
            parentMobile: z.string().max(20).nullable(),
            studentMobile: z.string().max(20).nullable(),
            parentEmail: z.string().max(100).nullable(),
            notes: z.string().nullable(),
        })
        : studentCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: student?.name || "",
            kanaName: student?.kanaName || "",
            gradeId: student?.gradeId || "",
            schoolName: student?.schoolName || "",
            schoolType: student?.schoolType || undefined,
            examSchoolType: student?.examSchoolType || undefined,
            examSchoolCategoryType: student?.examSchoolCategoryType || null,
            firstChoiceSchool: student?.firstChoiceSchool || "",
            secondChoiceSchool: student?.secondChoiceSchool || "",
            enrollmentDate: student?.enrollmentDate || null,
            birthDate: student?.birthDate || null,
            homePhone: student?.homePhone || "",
            parentMobile: student?.parentMobile || "",
            studentMobile: student?.studentMobile || "",
            parentEmail: student?.parentEmail || "",
            notes: student?.notes || "",
        },
    })

    // Preferences form
    const preferencesForm = useForm<z.infer<typeof studentPreferencesSchema>>({
        resolver: zodResolver(studentPreferencesSchema),
        defaultValues: {
            preferredSubjects: [],
            preferredTeachers: [],
            preferredWeekdays: [],
            preferredHours: [],
            additionalNotes: "",
        },
    })

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            // Combine values from both forms
            const combinedValues = {
                ...values,
                ...preferencesForm.getValues(),
            };

            if (isEditing && student) {
                await updateStudentMutation.mutateAsync({
                    studentId: student.studentId,
                    ...combinedValues,
                })
            } else {
                await createStudentMutation.mutateAsync(combinedValues)
            }
            onOpenChange(false)
            form.reset()
            preferencesForm.reset()
        } catch (error) {
            console.error("学生の保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(open) => {
            if (!open) {
                // Reset forms only when dialog is properly closed
                form.reset()
                preferencesForm.reset()
            }
            onOpenChange(open)
        }}>
            <DialogContent
                className="sm:max-w-[600px] max-h-[80vh] overflow-auto"
                style={{
                    overflowY: "auto",
                    height: "80vh",
                    maxHeight: "80vh",
                    paddingRight: "10px"
                }}
            >
                <DialogHeader>
                    <DialogTitle>{isEditing ? "学生の編集" : "学生の作成"}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">基本情報</TabsTrigger>
                        <TabsTrigger value="preferences">学習設定</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic">
                        <Form {...form}>
                            <form className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>名前</FormLabel>
                                        <FormControl>
                                            <Input placeholder="学生の名前を入力" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="kanaName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>カナ名</FormLabel>
                                        <FormControl>
                                            <Input placeholder="カナ名を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField
                                    control={form.control}
                                    name="gradeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>学年</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value as string}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="学年を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {grades.map((grade) => (
                                                            <SelectItem key={grade.gradeId} value={grade.gradeId}>
                                                                {grade.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="schoolName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>学校名</FormLabel>
                                        <FormControl>
                                            <Input placeholder="学校名を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="schoolType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>学校タイプ</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="学校タイプを選択" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PUBLIC">公立</SelectItem>
                                                    <SelectItem value="PRIVATE">私立</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="examSchoolType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>受験校タイプ</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="受験校タイプを選択" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PUBLIC">公立</SelectItem>
                                                    <SelectItem value="PRIVATE">私立</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="examSchoolCategoryType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>受験校カテゴリータイプ</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={(value) => field.onChange(value || null)} value={field.value || ""}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="受験校カテゴリーを選択" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ELEMENTARY">小学校</SelectItem>
                                                    <SelectItem value="MIDDLE">中学校</SelectItem>
                                                    <SelectItem value="HIGH">高校</SelectItem>
                                                    <SelectItem value="UNIVERSITY">大学</SelectItem>
                                                    <SelectItem value="OTHER">その他</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="firstChoiceSchool" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>第一志望校</FormLabel>
                                        <FormControl>
                                            <Input placeholder="第一志望校を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="secondChoiceSchool" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>第二志望校</FormLabel>
                                        <FormControl>
                                            <Input placeholder="第二志望校を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="enrollmentDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>入学日</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                value={field.value instanceof Date ? formatDate(field.value) : ""}
                                                onChange={(e) => {
                                                    const dateValue = e.target.value ? new Date(e.target.value) : null;
                                                    field.onChange(dateValue);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="birthDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>生年月日</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                value={field.value instanceof Date ? formatDate(field.value) : ""}
                                                onChange={(e) => {
                                                    const dateValue = e.target.value ? new Date(e.target.value) : null;
                                                    field.onChange(dateValue);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="homePhone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>自宅電話</FormLabel>
                                        <FormControl>
                                            <Input placeholder="自宅電話を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="parentMobile" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>保護者携帯電話</FormLabel>
                                        <FormControl>
                                            <Input placeholder="保護者携帯電話を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="studentMobile" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>学生携帯電話</FormLabel>
                                        <FormControl>
                                            <Input placeholder="学生携帯電話を入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="parentEmail" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>保護者メール</FormLabel>
                                        <FormControl>
                                            <Input placeholder="保護者メールを入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>メモ</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="メモを入力" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="preferences">
                        <Form {...preferencesForm}>
                            <form className="space-y-4">
                                <FormField
                                    control={preferencesForm.control}
                                    name="preferredSubjects"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>希望科目</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={(value) => {
                                                        const currentValues = field.value || []
                                                        if (!currentValues.includes(value)) {
                                                            field.onChange([...currentValues, value])
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="科目を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="math">数学</SelectItem>
                                                        <SelectItem value="japanese">国語</SelectItem>
                                                        <SelectItem value="english">英語</SelectItem>
                                                        <SelectItem value="science">理科</SelectItem>
                                                        <SelectItem value="social">社会</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(field.value || []).map((subject, index) => (
                                                    <div key={index} className="flex items-center bg-accent rounded-md px-2 py-1">
                                                        <span>
                                                            {subject === "math"
                                                                ? "数学"
                                                                : subject === "japanese"
                                                                    ? "国語"
                                                                    : subject === "english"
                                                                        ? "英語"
                                                                        : subject === "science"
                                                                            ? "理科"
                                                                            : subject === "social"
                                                                                ? "社会"
                                                                                : subject}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-4 w-4 p-0 ml-1"
                                                            onClick={() => {
                                                                const newValues = [...(field.value || [])]
                                                                newValues.splice(index, 1)
                                                                field.onChange(newValues)
                                                            }}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={preferencesForm.control}
                                    name="preferredTeachers"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>希望講師</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="講師名を入力して Enter キーを押す"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                                            e.preventDefault()
                                                            const newValue = e.currentTarget.value.trim()
                                                            const currentValues = field.value || []
                                                            if (!currentValues.includes(newValue)) {
                                                                field.onChange([...currentValues, newValue])
                                                                e.currentTarget.value = ""
                                                            }
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(field.value || []).map((teacher, index) => (
                                                    <div key={index} className="flex items-center bg-accent rounded-md px-2 py-1">
                                                        <span>{teacher}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-4 w-4 p-0 ml-1"
                                                            onClick={() => {
                                                                const newValues = [...(field.value || [])]
                                                                newValues.splice(index, 1)
                                                                field.onChange(newValues)
                                                            }}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={preferencesForm.control}
                                    name="preferredWeekdays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>希望曜日</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={(value) => {
                                                        const currentValues = field.value || []
                                                        if (!currentValues.includes(value)) {
                                                            field.onChange([...currentValues, value])
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="曜日を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="monday">月曜日</SelectItem>
                                                        <SelectItem value="tuesday">火曜日</SelectItem>
                                                        <SelectItem value="wednesday">水曜日</SelectItem>
                                                        <SelectItem value="thursday">木曜日</SelectItem>
                                                        <SelectItem value="friday">金曜日</SelectItem>
                                                        <SelectItem value="saturday">土曜日</SelectItem>
                                                        <SelectItem value="sunday">日曜日</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(field.value || []).map((day, index) => (
                                                    <div key={index} className="flex items-center bg-accent rounded-md px-2 py-1">
                                                        <span>
                                                            {day === "monday"
                                                                ? "月曜日"
                                                                : day === "tuesday"
                                                                    ? "火曜日"
                                                                    : day === "wednesday"
                                                                        ? "水曜日"
                                                                        : day === "thursday"
                                                                            ? "木曜日"
                                                                            : day === "friday"
                                                                                ? "金曜日"
                                                                                : day === "saturday"
                                                                                    ? "土曜日"
                                                                                    : day === "sunday"
                                                                                        ? "日曜日"
                                                                                        : day}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-4 w-4 p-0 ml-1"
                                                            onClick={() => {
                                                                const newValues = [...(field.value || [])]
                                                                newValues.splice(index, 1)
                                                                field.onChange(newValues)
                                                            }}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={preferencesForm.control}
                                    name="preferredHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>希望時間帯</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={(value) => {
                                                        const currentValues = field.value || []
                                                        if (!currentValues.includes(value)) {
                                                            field.onChange([...currentValues, value])
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="時間帯を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="morning">午前 (9:00-12:00)</SelectItem>
                                                        <SelectItem value="afternoon">午後 (13:00-17:00)</SelectItem>
                                                        <SelectItem value="evening">夕方 (17:00-19:00)</SelectItem>
                                                        <SelectItem value="night">夜間 (19:00-21:00)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {(field.value || []).map((time, index) => (
                                                    <div key={index} className="flex items-center bg-accent rounded-md px-2 py-1">
                                                        <span>
                                                            {time === "morning"
                                                                ? "午前 (9:00-12:00)"
                                                                : time === "afternoon"
                                                                    ? "午後 (13:00-17:00)"
                                                                    : time === "evening"
                                                                        ? "夕方 (17:00-19:00)"
                                                                        : time === "night"
                                                                            ? "夜間 (19:00-21:00)"
                                                                            : time}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-4 w-4 p-0 ml-1"
                                                            onClick={() => {
                                                                const newValues = [...(field.value || [])]
                                                                newValues.splice(index, 1)
                                                                field.onChange(newValues)
                                                            }}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={preferencesForm.control}
                                    name="additionalNotes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>追加メモ</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="学習に関する追加情報や特記事項" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
                        {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}