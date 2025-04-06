"use client"

import {useState} from "react"
import type {ColumnDef} from "@tanstack/react-table"
import {Pencil, Trash2} from "lucide-react"

import {Button} from "@/components/ui/button"
import {DataTable} from "@/components/data-table"
import {useStudents} from "@/hooks/useStudentQuery"
import {useStudentDelete} from "@/hooks/useStudentMutation"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {Student} from "@prisma/client"
import {StudentFormDialog} from "@/components/student/student-form-dialog"

export function StudentTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const {data: students = [], isLoading} = useStudents()
    const deleteStudentMutation = useStudentDelete()

    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredStudents = searchTerm
        ? students.filter(
            (student) =>
                student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.notes && student.notes.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        : students

    const columns: ColumnDef<Student>[] = [
        {
            accessorKey: "studentId",
            header: "ID",
        },
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "schoolName",
            header: "School",
        },
        {
            accessorKey: "notes",
            header: "Notes",
        },
        {
            id: "actions",
            header: "Operations",
            cell: ({row}) => {
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setStudentToEdit(row.original)}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteStudent = async () => {
        if (studentToDelete) {
            try {
                await deleteStudentMutation.mutateAsync(studentToDelete.studentId)
                setStudentToDelete(null)
            } catch (error) {
                console.error("Failed to delete student:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredStudents}
                isLoading={isLoading}
                searchPlaceholder="Search students..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="New Student"
            />

            {/* Edit Student Dialog */}
            {studentToEdit && (
                <StudentFormDialog
                    open={!!studentToEdit}
                    onOpenChange={(open) => !open && setStudentToEdit(null)}
                    student={studentToEdit}
                />
            )}

            {/* Create Student Dialog */}
            <StudentFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} student={null}/>

            {/* Delete Student Confirmation Dialog */}
            <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Student</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this student? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudent}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
