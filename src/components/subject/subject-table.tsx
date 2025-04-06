"use client"

import {useState} from "react"
import type {ColumnDef} from "@tanstack/react-table"
import {Pencil, Trash2} from "lucide-react"

import {Button} from "@/components/ui/button"
import {DataTable} from "@/components/data-table"
import {useSubjects} from "@/hooks/useSubjectQuery"
import {useSubjectDelete} from "@/hooks/useSubjectMutation"
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
import {Subject} from "@prisma/client"
import {SubjectFormDialog} from "@/components/subject/subject-form-dialog"

export function SubjectTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const {data: subjects = [], isLoading} = useSubjects()
    const deleteSubjectMutation = useSubjectDelete()

    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null)
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredSubjects = searchTerm
        ? subjects.filter(
            (subject) =>
                subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (subject.notes && subject.notes.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        : subjects

    const columns: ColumnDef<Subject>[] = [
        {
            accessorKey: "subjectId",
            header: "ID",
        },
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "subjectTypeId",
            header: "Subject Type",
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
                        <Button variant="ghost" size="icon" onClick={() => setSubjectToEdit(row.original)}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setSubjectToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteSubject = async () => {
        if (subjectToDelete) {
            try {
                await deleteSubjectMutation.mutateAsync(subjectToDelete.subjectId)
                setSubjectToDelete(null)
            } catch (error) {
                console.error("Failed to delete subject:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredSubjects}
                isLoading={isLoading}
                searchPlaceholder="Search subjects..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="New Subject"
            />

            {/* Edit Subject Dialog */}
            {subjectToEdit && (
                <SubjectFormDialog
                    open={!!subjectToEdit}
                    onOpenChange={(open) => !open && setSubjectToEdit(null)}
                    subject={subjectToEdit}
                />
            )}

            {/* Create Subject Dialog */}
            <SubjectFormDialog open={isCreateDialogOpen} onOpenChange={(open) => setIsCreateDialogOpen(open)}
                               subject={null}/>

            {/* Delete Subject Confirmation Dialog */}
            <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this subject? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSubjectToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubject}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
