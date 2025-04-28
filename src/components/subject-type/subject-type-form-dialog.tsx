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
import { useSubjectTypeCreate, useSubjectTypeUpdate } from "@/hooks/useSubjectTypeMutation"
import { subjectTypeCreateSchema } from "@/schemas/subject-type.schema"
import { SubjectType } from "@prisma/client"

interface SubjectTypeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subjectType?: SubjectType | null
}

export function SubjectTypeFormDialog({ open, onOpenChange, subjectType }: SubjectTypeFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createSubjectTypeMutation = useSubjectTypeCreate()
    const updateSubjectTypeMutation = useSubjectTypeUpdate()

    const isEditing = !!subjectType

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, { message: "名前は必須です" }),
            notes: z.string().optional(),
        })
        : subjectTypeCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: subjectType?.name || "",
            notes: subjectType?.notes ?? undefined,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && subjectType) {
                await updateSubjectTypeMutation.mutateAsync({
                    subjectTypeId: subjectType.subjectTypeId,
                    ...values,
                    notes: values.notes ?? undefined,
                })
            } else {
                await createSubjectTypeMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("科目タイプの保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "科目タイプの編集" : "新しい科目タイプを作成"}</DialogTitle>
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
                                        <Input placeholder="科目タイプ名を入力" {...field} />
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
                                        <Textarea placeholder="追加のメモを入力" {...field} value={field.value ?? ""} />
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
