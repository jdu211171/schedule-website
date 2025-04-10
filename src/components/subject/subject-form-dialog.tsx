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
import { useSubjectCreate, useSubjectUpdate } from "@/hooks/useSubjectMutation"
import { subjectCreateSchema } from "@/schemas/subject.schema"
import { Subject } from "@prisma/client"

interface SubjectFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subject?: Subject | null
}

export function SubjectFormDialog({ open, onOpenChange, subject }: SubjectFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createSubjectMutation = useSubjectCreate()
    const updateSubjectMutation = useSubjectUpdate()

    const isEditing = !!subject

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, { message: "名前は必須です" }),
            subjectTypeId: z.string().optional(),
            notes: z.string().optional(),
        })
        : subjectCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: subject?.name || "",
            subjectTypeId: subject?.subjectTypeId || "",
            notes: subject?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && subject) {
                await updateSubjectMutation.mutateAsync({
                    subjectId: subject.subjectId,
                    ...values,
                    subjectTypeId: values.subjectTypeId ?? undefined,
                    notes: values.notes ?? undefined,
                })
            } else {
                await createSubjectMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("科目の保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "科目の編集" : "新しい科目を作成"}</DialogTitle>
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
                                        <Input placeholder="科目名を入力" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subjectTypeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>科目タイプ</FormLabel>
                                    <FormControl>
                                        <Input placeholder="科目タイプを入力" {...field} value={field.value || ""} />
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
                                        <Textarea placeholder="追加のメモを入力" {...field} value={field.value || ""} />
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
