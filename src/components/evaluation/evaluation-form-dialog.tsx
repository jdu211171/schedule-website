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
import { useEvaluationCreate, useEvaluationUpdate } from "@/hooks/useEvaluationMutation"
import { evaluationCreateSchema } from "@/schemas/evaluation.schema"
import { Evaluation } from "@prisma/client"

interface EvaluationFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    evaluation?: Evaluation | null
}

export function EvaluationFormDialog({ open, onOpenChange, evaluation }: EvaluationFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createEvaluationMutation = useEvaluationCreate()
    const updateEvaluationMutation = useEvaluationUpdate()

    const isEditing = !!evaluation

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, { message: "名前は必須です" }),
            score: z.number().int().optional(),
            notes: z.string().optional(),
        })
        : evaluationCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: evaluation?.name || "",
            score: evaluation?.score ?? undefined,
            notes: evaluation?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && evaluation) {
                await updateEvaluationMutation.mutateAsync({
                    evaluationId: evaluation.evaluationId,
                    ...values,
                })
            } else {
                await createEvaluationMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("評価の保存に失敗しました:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "評価の編集" : "評価の作成"}</DialogTitle>
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
                                        <Input placeholder="評価の名前を入力" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="score"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>スコア</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="スコアを入力"
                                            value={field.value === undefined ? "" : field.value}
                                            onChange={e => {
                                                const value = e.target.value === ""
                                                    ? undefined
                                                    : parseInt(e.target.value, 10);
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
