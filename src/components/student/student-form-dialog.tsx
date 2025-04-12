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
import { useGrades } from "@/hooks/useGradeQuery"
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation"
import { studentCreateSchema } from "@/schemas/student.schema"
import { Student } from "@prisma/client"

interface StudentFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    student?: Student | null
}

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
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

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && student) {
                await updateStudentMutation.mutateAsync({
                    studentId: student.studentId,
                    ...values,
                })
            } else {
                await createStudentMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("学生の保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
