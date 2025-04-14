"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useStudentTypes } from "@/hooks/useStudentTypeQuery"
import { useStudentTypeDelete } from "@/hooks/useStudentTypeMutation"
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
import { StudentType } from "@prisma/client"
import { useStudentTypesCount } from "@/hooks/useStudentTypeQuery"
import { StudentTypeFormDialog } from "@/components/student-type/student-type-form-dialog";

export function StudentTypeTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 10
    const { data: studentTypes = [], isLoading, isFetching } = useStudentTypes(page, pageSize)
    const { data: totalCount = 0 } = useStudentTypesCount()
    const deleteStudentTypeMutation = useStudentTypeDelete()

    const [studentTypeToEdit, setStudentTypeToEdit] = useState<StudentType | null>(null)
    const [studentTypeToDelete, setStudentTypeToDelete] = useState<StudentType | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredStudentTypes = searchTerm
        ? studentTypes.filter(
            (studentType) =>
                studentType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (studentType.description && studentType.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : studentTypes

    const columns: ColumnDef<StudentType>[] = [
        {
            accessorKey: "name",
            header: "名前",
        },
        {
            accessorKey: "description",
            header: "説明",
        },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setStudentTypeToEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setStudentTypeToDelete(row.original)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ]

    const handleDeleteStudentType = async () => {
        if (studentTypeToDelete) {
            try {
                await deleteStudentTypeMutation.mutateAsync(studentTypeToDelete.studentTypeId)
                setStudentTypeToDelete(null)
            } catch (error) {
                console.error("学生タイプの削除に失敗しました:", error)
            }
        }
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage + 1)
    }

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredStudentTypes}
                isLoading={isLoading || isFetching}
                searchPlaceholder="学生タイプを検索..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="新しい学生タイプ"
                pageIndex={page - 1}
                pageCount={totalPages || 1}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                totalItems={totalCount}
            />

            {/* Edit Student Type Dialog */}
            {studentTypeToEdit && (
                <StudentTypeFormDialog
                    open={!!studentTypeToEdit}
                    onOpenChange={(open: boolean) => !open && setStudentTypeToEdit(null)}
                    studentType={studentTypeToEdit}
                />
            )}

            {/* Create Student Type Dialog */}
            <StudentTypeFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} studentType={null}/>

            {/* Delete Student Type Confirmation Dialog */}
            <AlertDialog open={!!studentTypeToDelete} onOpenChange={(open) => !open && setStudentTypeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>学生タイプの削除</AlertDialogTitle>
                        <AlertDialogDescription>
                            この学生タイプを削除してもよろしいですか？ この操作は取り消せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setStudentTypeToDelete(null)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudentType}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}