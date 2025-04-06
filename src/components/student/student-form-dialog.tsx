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
import {useStudentCreate, useStudentUpdate} from "@/hooks/useStudentMutation"
import {studentCreateSchema} from "@/schemas/student.schema"
import {Student} from "@prisma/client"

interface StudentFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    student?: Student | null
}

export function StudentFormDialog({open, onOpenChange, student}: StudentFormDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const createStudentMutation = useStudentCreate()
    const updateStudentMutation = useStudentUpdate()

    const isEditing = !!student

    const formSchema = isEditing
        ? z.object({
            name: z.string().max(100),
            kanaName: z.string().max(100).nullable(),
            gradeId: z.string().max(50).nullable(),
            schoolName: z.string().max(100).nullable(),
            schoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
            examSchoolType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
            examSchoolCategoryType: z.enum(["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"]).nullable(),
            firstChoiceSchool: z.string().max(100).nullable(),
            secondChoiceSchool: z.string().max(100).nullable(),
            enrollmentDate: z.date().nullable(),
            birthDate: z.date().nullable(),
            homePhone: z.string().max(20).nullable(),
            parentMobile: z.string().max(20).nullable(),
            studentMobile: z.string().max(20).nullable(),
            parentEmail: z.string().max(100).nullable(),
            notes: z.string().nullable(),
        })
        : studentCreateSchema

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: student?.name || "",
            kanaName: student?.kanaName || "",
            gradeId: student?.gradeId || "",
            schoolName: student?.schoolName || "",
            schoolType: student?.schoolType || undefined,
            examSchoolType: student?.examSchoolType || undefined,
            examSchoolCategoryType: student?.examSchoolCategoryType || null,
            firstChoiceSchool: student?.firstChoiceSchool || "",
            secondChoiceSchool: student?.secondChoiceSchool || "",
            enrollmentDate: student?.enrollmentDate || null,
            birthDate: student?.birthDate || null,
            homePhone: student?.homePhone || "",
            parentMobile: student?.parentMobile || "",
            studentMobile: student?.studentMobile || "",
            parentEmail: student?.parentEmail || "",
            notes: student?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            if (isEditing && student) {
                await updateStudentMutation.mutateAsync({
                    studentId: student.studentId,
                    ...values,
                })
            } else {
                await createStudentMutation.mutateAsync(values)
            }
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("Failed to save student:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Student" : "Create Student"}</DialogTitle>
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
                                        <Input placeholder="Enter student name" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="kanaName"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Kana Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter kana name" {...field} value={field.value || ""}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="schoolName"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>School Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter school name" {...field} value={field.value || ""}/>
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
