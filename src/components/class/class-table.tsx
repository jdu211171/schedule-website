"use client"

import {useState} from "react"
import type {ColumnDef} from "@tanstack/react-table"
import {Pencil, Trash2} from "lucide-react"

import {Button} from "@/components/ui/button"
import {DataTable} from "@/components/data-table"
import {useClassTypes} from "@/hooks/useClassTypeQuery"
import {useClassTypeDelete} from "@/hooks/useClassTypeMutation"
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
import {ClassType} from "@prisma/client"
import {ClassFormDialog} from "@/components/class/class-form-dialog"

export function ClassTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const {data: classTypes = [], isLoading} = useClassTypes()
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
            accessorKey: "classTypeId",
            header: "ID",
        },
        {
            accessorKey: "name",
            header: "Name",
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
                        <Button variant="ghost" size="icon" onClick={() => setClassTypeToEdit(row.original)}>
                            <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setClassTypeToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
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
                console.error("Failed to delete class type:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredClassTypes}
                isLoading={isLoading}
                searchPlaceholder="Search class types..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="New Class Type"
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
            <ClassFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}/>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!classTypeToDelete} onOpenChange={(open) => !open && setClassTypeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the class
                            type &#34;{classTypeToDelete?.name}&#34;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClassType}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
