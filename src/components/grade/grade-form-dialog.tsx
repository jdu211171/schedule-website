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
import {useGradeCreate, useGradeUpdate} from "@/hooks/useGradeMutation"
import {gradeCreateSchema} from "@/schemas/grade.schema"
import {Grade} from "@prisma/client"

interface GradeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    grade?: Grade | null
}

export function GradeFormDialog({open, onOpenChange, grade}: GradeFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createGradeMutation = useGradeCreate()
    const updateGradeMutation = useGradeUpdate()

    const isEditing = !!grade

    const formSchema = isEditing
        ? z.object({
            name: z.string().max(100, {message: "Name must be 100 characters or less"}),
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
            console.error("Failed to save grade:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Grade" : "Create Grade"}</DialogTitle>
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
                                        <Input placeholder="Enter grade name" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="studentTypeId"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Student Type ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter student type ID" {...field}
                                               value={field.value || ""}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gradeYear"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Grade Year</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Enter grade year" {...field}
                                               value={field.value ?? ""}/>
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
