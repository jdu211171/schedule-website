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
import {useClassTypeCreate, useClassTypeUpdate} from "@/hooks/useClassTypeMutation"
import {classTypeCreateSchema} from "@/schemas/classType.schema"
import {ClassType} from "@prisma/client"

interface ClassFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    classType?: ClassType | null
}

export function ClassFormDialog({open, onOpenChange, classType}: ClassFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createClassTypeMutation = useClassTypeCreate()
    const updateClassTypeMutation = useClassTypeUpdate()

    const isEditing = !!classType

    // Create a form schema based on our Zod schema
    const formSchema = isEditing
        ? z.object({
            name: z.string().min(1, {message: "Name is required"}),
            notes: z.string().optional(),
        })
        : classTypeCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: classType?.name || "",
            notes: classType?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && classType) {
                await updateClassTypeMutation.mutateAsync({
                    classTypeId: classType.classTypeId,
                    ...values,
                })
            } else {
                await createClassTypeMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("Failed to save class:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Class Type" : "Create Class Type"}</DialogTitle>
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
                                        <Input placeholder="Enter class type name" {...field} />
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
