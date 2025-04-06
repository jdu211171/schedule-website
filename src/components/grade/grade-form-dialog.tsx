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
import { useGradeCreate, useGradeUpdate } from "@/hooks/useGradeMutation"
import { gradeCreateSchema } from "@/schemas/grade.schema"
import { Grade } from "@prisma/client"

interface GradeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    grade?: Grade | null
}

export function GradeFormDialog({ open, onOpenChange, grade }: GradeFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createGradeMutation = useGradeCreate()
    const updateGradeMutation = useGradeUpdate()

    const isEditing = !!grade

    const formSchema = isEditing
        ? z.object({
            name: z.string().max(100, { message: "名前は100文字以内で入力してください" }),
            studentTypeId: z.string().nullable().optional(),
            gradeYear: z.number().int().nullable().optional(),
            notes: z.string().nullable().optional(),
        })
        : gradeCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: grade?.name || "",
            studentTypeId: grade?.studentTypeId || null,
            gradeYear: grade?.gradeYear || null,
            notes: grade?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && grade) {
                await updateGradeMutation.mutateAsync({
                    gradeId: grade.gradeId,
                    ...values,
                })
            } else {
                await createGradeMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("成績の保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "成績の編集" : "成績の作成"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>名前</FormLabel>
                                    <FormControl>
                                        <Input placeholder="成績名を入力" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="studentTypeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>学生タイプID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="学生タイプIDを入力" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gradeYear"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>学年</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="学年を入力" {...field} value={field.value ?? ""} />
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
                                        <Textarea placeholder="メモを入力（任意）" {...field} value={field.value || ""} />
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
