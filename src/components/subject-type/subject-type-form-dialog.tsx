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
import {useSubjectTypeCreate, useSubjectTypeUpdate} from "@/hooks/useSubjectTypeMutation"
import {subjectTypeCreateSchema} from "@/schemas/subjectType.schema"
import {SubjectType} from "@prisma/client"

interface SubjectTypeFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subjectType?: SubjectType | null
}

export function SubjectTypeFormDialog({open, onOpenChange, subjectType}: SubjectTypeFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createSubjectTypeMutation = useSubjectTypeCreate()
    const updateSubjectTypeMutation = useSubjectTypeUpdate()

    const isEditing = !!subjectType

    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, {message: "Name is required"}),
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
            console.error("Failed to save subject type:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Subject Type" : "Create Subject Type"}</DialogTitle>
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
                                        <Input placeholder="Enter subject type name" {...field} />
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
                                        <Textarea placeholder="Enter additional notes" {...field}
                                                  value={field.value ?? ""}/>
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
