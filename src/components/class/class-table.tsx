"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useClassTypes } from "@/hooks/useClassTypeQuery"
import { useClassTypeDelete } from "@/hooks/useClassTypeMutation"
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
import { ClassType } from "@prisma/client"
import { ClassFormDialog } from "@/components/class/class-form-dialog"

export function ClassTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const { data: classTypes = [], isLoading } = useClassTypes()
    const deleteClassTypeMutation = useClassTypeDelete()

    const [classTypeToEdit, setClassTypeToEdit] = useState<ClassType | null>(null)
    const [classTypeToDelete, setClassTypeToDelete] = useState<ClassType | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredClassTypes = searchTerm
        ? classTypes.filter(
            (classType) =>
                classType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (classType.notes && classType.notes.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        : classTypes

    const columns: ColumnDef<ClassType>[] = [
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
            cell: ({ row }) => {
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setClassTypeToEdit(row.original)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setClassTypeToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteClassType = async () => {
        if (classTypeToDelete) {
            try {
                await deleteClassTypeMutation.mutateAsync(classTypeToDelete.classTypeId)
                setClassTypeToDelete(null)
            } catch (error) {
                console.error("クラスの種類の削除に失敗しました:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredClassTypes}
                isLoading={isLoading}
                searchPlaceholder="クラスの種類を検索..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="新しいクラスの種類"
            />

            {/* Edit Class Type Dialog */}
            {classTypeToEdit && (
                <ClassFormDialog
                    open={!!classTypeToEdit}
                    onOpenChange={(open) => !open && setClassTypeToEdit(null)}
                    classType={classTypeToEdit}
                />
            )}

            {/* Create Class Type Dialog */}
            <ClassFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!classTypeToDelete} onOpenChange={(open) => !open && setClassTypeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除してもよろしいですか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は元に戻せません。このクラスの種類「{classTypeToDelete?.name}」を完全に削除します。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClassType}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
