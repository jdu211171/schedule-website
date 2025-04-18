"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useTeacherSubjects } from "@/hooks/useTeacherSubjectQuery"
import { useTeacherSubjectDelete } from "@/hooks/useTeacherSubjectMutation"
import { TeacherSubject as PrismaTeacherSubject } from "@prisma/client"
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
import { TeacherSubjectFormDialog } from "@/components/teacher-subject/teacher-subject-form-dialog"
import { useTeacherSubjectsCount } from "@/hooks/useTeacherSubjectQuery"

// Define the type with related teacher and subject
type TeacherSubjectWithRelations = PrismaTeacherSubject & {
    teacher: { name: string }
    subject: { name: string }
}

export function TeacherSubjectTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 10
    const { data: teacherSubjects = [] as TeacherSubjectWithRelations[], isLoading, isFetching } = useTeacherSubjects(page, pageSize)
    const { data: totalCount = 0 } = useTeacherSubjectsCount()
    const deleteTeacherSubjectMutation = useTeacherSubjectDelete()

    const [teacherSubjectToEdit, setTeacherSubjectToEdit] = useState<TeacherSubjectWithRelations | null>(null)
    const [teacherSubjectToDelete, setTeacherSubjectToDelete] = useState<TeacherSubjectWithRelations | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredTeacherSubjects = (searchTerm
        ? teacherSubjects.filter((ts) =>
            ts.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ts.subject.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : teacherSubjects) as TeacherSubjectWithRelations[];

    const columns: ColumnDef<TeacherSubjectWithRelations>[] = [
        {
            accessorKey: "teacher.name",
            header: "講師",
        },
        {
            accessorKey: "subject.name",
            header: "科目",
        },
        {
            accessorKey: "notes",
            header: "メモ",
            cell: ({ row }) => row.original.notes || "-",
        },
        {
            id: "actions",
            header: "操作",
            cell: ({ row }) => {
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setTeacherSubjectToEdit(row.original)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setTeacherSubjectToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteTeacherSubject = async () => {
        if (teacherSubjectToDelete) {
            try {
                await deleteTeacherSubjectMutation.mutateAsync({
                    teacherId: teacherSubjectToDelete.teacherId,
                    subjectId: teacherSubjectToDelete.subjectId,
                })
                setTeacherSubjectToDelete(null)
            } catch (error) {
                console.error("講師科目割り当ての削除に失敗しました:", error)
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
                data={filteredTeacherSubjects}
                isLoading={isLoading || isFetching}
                searchPlaceholder="講師または科目を検索..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="新しい講師科目割り当て"
                pageIndex={page - 1}
                pageCount={totalPages || 1}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                totalItems={totalCount}
            />

            {teacherSubjectToEdit && (
                <TeacherSubjectFormDialog
                    open={!!teacherSubjectToEdit}
                    onOpenChange={(open) => !open && setTeacherSubjectToEdit(null)}
                    teacherSubject={teacherSubjectToEdit}
                />
            )}

            <TeacherSubjectFormDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                teacherSubject={null}
            />

            <AlertDialog
                open={!!teacherSubjectToDelete}
                onOpenChange={(open) => !open && setTeacherSubjectToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>講師科目割り当ての削除</AlertDialogTitle>
                        <AlertDialogDescription>
                            本当にこの講師科目割り当てを削除しますか？ この操作は元に戻せません。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTeacherSubjectToDelete(null)}>
                            キャンセル
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTeacherSubject}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}