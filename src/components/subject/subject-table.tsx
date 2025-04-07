"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useSubjects } from "@/hooks/useSubjectQuery"
import { useSubjectDelete } from "@/hooks/useSubjectMutation"
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
import { Subject } from "@prisma/client"
import { SubjectFormDialog } from "@/components/subject/subject-form-dialog"

export function SubjectTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const { data: subjects = [], isLoading } = useSubjects()
    const deleteSubjectMutation = useSubjectDelete()

    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null)
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredSubjects = searchTerm
        ? subjects.filter(
            (subject) =>
                subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (subject.notes && subject.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : subjects

    const columns: ColumnDef<Subject>[] = [
        {
            accessorKey: "subjectId",
            header: "科目ID",
        },
        {
            accessorKey: "name",
            header: "名前",
        },
        {
            accessorKey: "subjectTypeId",
            header: "科目タイプ",
        },
        {
            accessorKey: "notes",
            header: "メモ",
        },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setSubjectToEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSubjectToDelete(row.original)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ]

    const handleDeleteSubject = async () => {
        if (subjectToDelete) {
            try {
                await deleteSubjectMutation.mutateAsync(subjectToDelete.subjectId)
                setSubjectToDelete(null)
            } catch (error) {
                console.error("科目の削除に失敗しました:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredSubjects}
                isLoading={isLoading}
                searchPlaceholder="科目を検索..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="新しい科目"
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
                        <AlertDialogTitle>科目の削除</AlertDialogTitle>
                        <AlertDialogDescription>
                            本当にこの科目を削除しますか？ この操作は元に戻せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSubjectToDelete(null)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubject}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
