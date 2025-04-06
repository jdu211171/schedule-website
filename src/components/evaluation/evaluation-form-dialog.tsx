"use client"

import {useState} from "react"
import {zodResolver} from "@hookform/resolvers/zod"
import {useForm} from "react-hook-form"
import {z} from "zod"

import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {useEvaluationCreate, useEvaluationUpdate} from "@/hooks/useEvaluationMutation"
import {evaluationCreateSchema} from "@/schemas/evaluation.schema"
import {Evaluation} from "@prisma/client"

interface EvaluationFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    evaluation?: Evaluation | null
}

export function EvaluationFormDialog({open, onOpenChange, evaluation}: EvaluationFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createEvaluationMutation = useEvaluationCreate()
    const updateEvaluationMutation = useEvaluationUpdate()

    const isEditing = !!evaluation

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, {message: "Name is required"}),
            score: z.number().int().optional(),
            notes: z.string().optional(),
        })
        : evaluationCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: evaluation?.name || "",
            score: evaluation?.score || undefined,
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
            console.error("Failed to save evaluation:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Evaluation" : "Create Evaluation"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter evaluation name" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="score"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Score</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Enter score" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter notes (optional)" {...field}
                                                  value={field.value || ""}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
