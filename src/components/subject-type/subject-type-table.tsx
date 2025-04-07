"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery"
import { useSubjectTypeDelete } from "@/hooks/useSubjectTypeMutation"
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
import { SubjectType } from "@prisma/client"
import { SubjectTypeFormDialog } from "@/components/subject-type/subject-type-form-dialog"

export function SubjectTypeTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const { data: subjectTypes = [], isLoading } = useSubjectTypes()
    const deleteSubjectTypeMutation = useSubjectTypeDelete()

    const [subjectTypeToEdit, setSubjectTypeToEdit] = useState<SubjectType | null>(null)
    const [subjectTypeToDelete, setSubjectTypeToDelete] = useState<SubjectType | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredSubjectTypes = searchTerm
        ? subjectTypes.filter(
            (subjectType) =>
                subjectType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (subjectType.notes && subjectType.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : subjectTypes

    const columns: ColumnDef<SubjectType>[] = [
        {
            accessorKey: "subjectTypeId",
            header: "subjectTypeId",
        },
        {
            accessorKey: "name",
            header: "名前",
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
                    <Button variant="ghost" size="icon" onClick={() => setSubjectTypeToEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSubjectTypeToDelete(row.original)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ]

    const handleDeleteSubjectType = async () => {
        if (subjectTypeToDelete) {
            try {
                await deleteSubjectTypeMutation.mutateAsync(subjectTypeToDelete.subjectTypeId)
                setSubjectTypeToDelete(null)
            } catch (error) {
                console.error("科目タイプの削除に失敗しました:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredSubjectTypes}
                isLoading={isLoading}
                searchPlaceholder="科目タイプを検索..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="新しい科目タイプ"
            />

            {/* Edit Subject Type Dialog */}
            {subjectTypeToEdit && (
                <SubjectTypeFormDialog
                    open={!!subjectTypeToEdit}
                    onOpenChange={(open) => !open && setSubjectTypeToEdit(null)}
                    subjectType={subjectTypeToEdit}
                />
            )}

            {/* Create Subject Type Dialog */}
            <SubjectTypeFormDialog open={isCreateDialogOpen} onOpenChange={(open) => setIsCreateDialogOpen(open)}
                                   subjectType={null}/>

            {/* Delete Subject Type Confirmation Dialog */}
            <AlertDialog open={!!subjectTypeToDelete} onOpenChange={(open) => !open && setSubjectTypeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>科目タイプの削除</AlertDialogTitle>
                        <AlertDialogDescription>
                            この科目タイプを削除してもよろしいですか？ この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSubjectTypeToDelete(null)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSubjectType}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
