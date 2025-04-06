"use client"

import {useState} from "react"
import type {ColumnDef} from "@tanstack/react-table"
import {Pencil, Trash2} from "lucide-react"

import {Button} from "@/components/ui/button"
import {DataTable} from "@/components/data-table"
import {useEvaluations} from "@/hooks/useEvaluationQuery"
import {useEvaluationDelete} from "@/hooks/useEvaluationMutation"
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
import {Evaluation} from "@prisma/client"
import {EvaluationFormDialog} from "@/components/evaluation/evaluation-form-dialog"

export function EvaluationTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const {data: evaluations = [], isLoading} = useEvaluations()
    const deleteEvaluationMutation = useEvaluationDelete()

    const [evaluationToEdit, setEvaluationToEdit] = useState<Evaluation | null>(null)
    const [evaluationToDelete, setEvaluationToDelete] = useState<Evaluation | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredEvaluations = searchTerm
        ? evaluations.filter(
            (evaluation) =>
                evaluation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (evaluation.notes && evaluation.notes.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        : evaluations

    const columns: ColumnDef<Evaluation>[] = [
        {
            accessorKey: "name",
            header: "名前",
        },
        {
            accessorKey: "score",
            header: "スコア",
        },
        {
            accessorKey: "notes",
            header: "メモ",
        },
        {
            id: "actions",
            header: "操作",
            cell: ({row}) => {
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEvaluationToEdit(row.original)}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEvaluationToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteEvaluation = async () => {
        if (evaluationToDelete) {
            try {
                await deleteEvaluationMutation.mutateAsync(evaluationToDelete.evaluationId)
                setEvaluationToDelete(null)
            } catch (error) {
                console.error("評価の削除に失敗しました:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredEvaluations}
                isLoading={isLoading}
                searchPlaceholder="評価を検索..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="新しい評価"
            />

            {/* Edit Evaluation Dialog */}
            {evaluationToEdit && (
                <EvaluationFormDialog
                    open={!!evaluationToEdit}
                    onOpenChange={(open) => !open && setEvaluationToEdit(null)}
                    evaluation={evaluationToEdit}
                />
            )}

            {/* Create Evaluation Dialog */}
            <EvaluationFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}/>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!evaluationToDelete} onOpenChange={(open) => !open && setEvaluationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は元に戻せません。評価「{evaluationToDelete?.name}」を永久に削除します。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEvaluation}>削除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
