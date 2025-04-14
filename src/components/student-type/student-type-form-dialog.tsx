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
import { useStudentTypeCreate, useStudentTypeUpdate } from "@/hooks/useStudentTypeMutation"
import { studentTypeCreateSchema } from "@/schemas/studentType.schema"
import { StudentType } from "@prisma/client"

interface StudentTypeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    studentType?: StudentType | null
}

export function StudentTypeFormDialog({ open, onOpenChange, studentType }: StudentTypeFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createStudentTypeMutation = useStudentTypeCreate()
    const updateStudentTypeMutation = useStudentTypeUpdate()

    const isEditing = !!studentType

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, { message: "名前は必須です" }),
            description: z.string().optional(),
        })
        : studentTypeCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: studentType?.name || "",
            description: studentType?.description || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && studentType) {
                await updateStudentTypeMutation.mutateAsync({
                    studentTypeId: studentType.studentTypeId,
                    ...values,
                })
            } else {
                await createStudentTypeMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("学生タイプの保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "学生タイプの編集" : "学生タイプの作成"}</DialogTitle>
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
                                        <Input placeholder="学生タイプ名を入力" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>説明</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="説明を入力（任意）" {...field} value={field.value || ""} />
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