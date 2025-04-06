"use client"

import {useState} from "react"
import type {ColumnDef} from "@tanstack/react-table"
import {Pencil, Trash2} from "lucide-react"

import {Button} from "@/components/ui/button"
import {DataTable} from "@/components/data-table"
import {useGrades} from "@/hooks/useGradeQuery"
import {useGradeDelete} from "@/hooks/useGradeMutation"
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
import {Grade} from "@prisma/client"
import {GradeFormDialog} from "@/components/grade/grade-form-dialog"

export function GradeTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const {data: grades = [], isLoading} = useGrades()
    const deleteGradeMutation = useGradeDelete()

    const [gradeToEdit, setGradeToEdit] = useState<Grade | null>(null)
    const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredGrades = searchTerm
        ? grades.filter(
            (grade) =>
                grade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (grade.notes && grade.notes.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        : grades

    const columns: ColumnDef<Grade>[] = [
        {
            accessorKey: "gradeId",
            header: "ID",
        },
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "gradeYear",
            header: "Grade Year",
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
                        <Button variant="ghost" size="icon" onClick={() => setGradeToEdit(row.original)}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setGradeToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteGrade = async () => {
        if (gradeToDelete) {
            try {
                await deleteGradeMutation.mutateAsync(gradeToDelete.gradeId)
                setGradeToDelete(null)
            } catch (error) {
                console.error("Failed to delete grade:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredGrades}
                isLoading={isLoading}
                searchPlaceholder="Search grades..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="New Grade"
            />

            {/* Edit Grade Dialog */}
            {gradeToEdit && (
                <GradeFormDialog
                    open={!!gradeToEdit}
                    onOpenChange={(open) => !open && setGradeToEdit(null)}
                    grade={gradeToEdit}
                />
            )}

            {/* Create Grade Dialog */}
            <GradeFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}/>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!gradeToDelete} onOpenChange={(open) => !open && setGradeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            grade &#34;{gradeToDelete?.name}&#34;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGrade}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
