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
import { useTeacherCreate, useTeacherUpdate } from "@/hooks/useTeacherMutation"
import { teacherCreateSchema } from "@/schemas/teacher.schema"
import { Teacher, TeacherWithPreference } from "@/schemas/teacher.schema"
import { useEvaluations } from "@/hooks/useEvaluationQuery"
import { teacherShiftPreferencesSchema, TeacherShiftPreferencesInput } from "@/schemas/teacher-preferences.schema"
import { TeacherDesiredTimeField } from "./teacher-desired-time-field"

interface TeacherFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teacher?: Teacher | TeacherWithPreference | null
}

export function TeacherFormDialog({ open, onOpenChange, teacher }: TeacherFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState("basic")
    const createTeacherMutation = useTeacherCreate()
    const updateTeacherMutation = useTeacherUpdate()
    const { data: evaluations = [] } = useEvaluations()

    const isEditing = !!teacher

    // Check if teacher has preference property to determine if it's TeacherWithPreference
    const hasPreference = teacher && "preference" in teacher

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, { message: "名前は必須です" }),
            evaluationId: z.string().nullable().optional(),
            birthDate: z.date().nullable().optional(),
            mobileNumber: z.string().max(20).nullable().optional(),
            email: z.string().email().optional(),
            highSchool: z.string().max(100).nullable().optional(),
            university: z.string().max(100).nullable().optional(),
            faculty: z.string().max(100).nullable().optional(),
            department: z.string().max(100).nullable().optional(),
            enrollmentStatus: z.string().max(50).nullable().optional(),
            otherUniversities: z.string().max(255).nullable().optional(),
            englishProficiency: z.string().max(50).nullable().optional(),
            toeic: z.number().int().nullable().optional(),
            toefl: z.number().int().nullable().optional(),
            mathCertification: z.string().max(50).nullable().optional(),
            kanjiCertification: z.string().max(50).nullable().optional(),
            otherCertifications: z.string().max(255).nullable().optional(),
            notes: z.string().optional(),
            username: z.string().min(1, { message: "ユーザー名は必須です" }).optional(),
            password: z.string().min(6, { message: "パスワードは6文字以上である必要があります" }).optional(),
        })
        : teacherCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: teacher?.name || "",
            evaluationId: teacher?.evaluationId || null,
            birthDate: teacher?.birthDate || null,
            mobileNumber: teacher?.mobileNumber || "",
            email: teacher?.email || "",
            highSchool: teacher?.highSchool || "",
            university: teacher?.university || "",
            faculty: teacher?.faculty || "",
            department: teacher?.department || "",
            enrollmentStatus: teacher?.enrollmentStatus || "",
            otherUniversities: teacher?.otherUniversities || "",
            englishProficiency: teacher?.englishProficiency || "",
            toeic: teacher?.toeic || null,
            toefl: teacher?.toefl || null,
            mathCertification: teacher?.mathCertification || "",
            kanjiCertification: teacher?.kanjiCertification || "",
            otherCertifications: teacher?.otherCertifications || "",
            notes: teacher?.notes || "",

            username: "",
            password: "",
        },
    })

    // Get preference data safely
    const teacherPreference = hasPreference ? (teacher as TeacherWithPreference).preference : null

    // Preferences form
    const preferencesForm = useForm<TeacherShiftPreferencesInput>({
        resolver: zodResolver(teacherShiftPreferencesSchema),
        defaultValues: {
            desiredTimes: Array.isArray(teacherPreference?.desiredTimes) ? teacherPreference!.desiredTimes : [],
            additionalNotes: teacherPreference?.additionalNotes || "",
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
            if (isEditing && teacher) {
                await updateTeacherMutation.mutateAsync({
                    teacher: {
                        teacherId: teacher.teacherId,
                        ...values,
                    },
                    preferences: preferencesForm.getValues()
                })
            } else {
                await createTeacherMutation.mutateAsync({
                    teacher: {
                        ...values as z.infer<typeof teacherCreateSchema>,
                        username: values.email || "",
                    },
                    preferences: preferencesForm.getValues()
                })
              }
            onOpenChange(false)
            form.reset()
            preferencesForm.reset()
        } catch (error) {
            console.error("講師の保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(open) => {
                if (!open) {
                    form.reset()
                    preferencesForm.reset()
                }
                onOpenChange(open)
            }}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "講師の編集" : "講師の作成"}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">基本情報</TabsTrigger>
                        <TabsTrigger value="preferences">シフト設定</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic">
                        <Form {...form}>
                            <form className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>名前</FormLabel>
                                            <FormControl>
                                                <Input placeholder="講師の名前を入力" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="evaluationId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>評価</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                                    value={field.value || "none"}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="評価を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">未選択</SelectItem>
                                                        {evaluations.map((evaluation) => (
                                                            <SelectItem key={evaluation.evaluationId} value={evaluation.evaluationId}>
                                                                {evaluation.name}
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
                                    name="birthDate"
                                    render={({ field }) => (
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
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mobileNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>携帯電話番号</FormLabel>
                                            <FormControl>
                                                <Input placeholder="携帯電話番号を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>メールアドレス</FormLabel>
                                            <FormControl>
                                                <Input placeholder="メールアドレスを入力" type="email" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="highSchool"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>出身高校</FormLabel>
                                            <FormControl>
                                                <Input placeholder="出身高校を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="university"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>大学</FormLabel>
                                            <FormControl>
                                                <Input placeholder="大学を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="faculty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>学部</FormLabel>
                                            <FormControl>
                                                <Input placeholder="学部を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="department"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>学科</FormLabel>
                                            <FormControl>
                                                <Input placeholder="学科を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="enrollmentStatus"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>在籍状況</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value || ""}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="在籍状況を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="在学中">在学中</SelectItem>
                                                        <SelectItem value="卒業">卒業</SelectItem>
                                                        <SelectItem value="休学中">休学中</SelectItem>
                                                        <SelectItem value="中退">中退</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="otherUniversities"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>その他の大学</FormLabel>
                                            <FormControl>
                                                <Input placeholder="その他の大学を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="englishProficiency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>英語能力</FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value || ""}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="英語能力を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ネイティブ">ネイティブ</SelectItem>
                                                        <SelectItem value="ビジネス">ビジネス</SelectItem>
                                                        <SelectItem value="日常会話">日常会話</SelectItem>
                                                        <SelectItem value="基礎">基礎</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="toeic"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>TOEIC</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="TOEICスコアを入力"
                                                    value={field.value === null ? "" : field.value}
                                                    onChange={e => {
                                                        const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                                        field.onChange(value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="toefl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>TOEFL</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="TOEFLスコアを入力"
                                                    value={field.value === null ? "" : field.value}
                                                    onChange={e => {
                                                        const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                                        field.onChange(value);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mathCertification"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>数学検定</FormLabel>
                                            <FormControl>
                                                <Input placeholder="数学検定を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="kanjiCertification"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>漢字検定</FormLabel>
                                            <FormControl>
                                                <Input placeholder="漢字検定を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="otherCertifications"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>その他資格</FormLabel>
                                            <FormControl>
                                                <Input placeholder="その他の資格を入力" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                  control={form.control}
                                  name="username"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>ユーザー名</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="ユーザー名を入力"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="password"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>パスワード</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="password"
                                          placeholder="パスワードを入力"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
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
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="preferences">
                        <Form {...preferencesForm}>
                            <form className="space-y-4">
                                <TeacherDesiredTimeField form={preferencesForm} />

                                <FormField
                                    control={preferencesForm.control}
                                    name="additionalNotes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>追加メモ</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="シフトに関する追加情報や特記事項" {...field} value={field.value || ""} />
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
