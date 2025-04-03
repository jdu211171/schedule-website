"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useBooths } from "@/hooks/useBoothQuery"
import { useBoothDelete } from "@/hooks/useBoothMutation"
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
import {Booth} from "@prisma/client";
import {BoothFormDialog} from "@/components/booth/booth-form-dialog";

export function BoothTable() {
    const [searchTerm, setSearchTerm] = useState("")
    const { data: booths = [], isLoading } = useBooths()
    const deleteBoothMutation = useBoothDelete()

    const [boothToEdit, setBoothToEdit] = useState<Booth | null>(null)
    const [boothToDelete, setBoothToDelete] = useState<Booth | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

    const filteredBooths = searchTerm
        ? booths.filter(
            (booth) =>
                booth.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (booth.notes && booth.notes.toLowerCase().includes(searchTerm.toLowerCase())),
        )
        : booths

    const columns: ColumnDef<Booth>[] = [
        {
            accessorKey: "id",
            header: "ID",
        },
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <div>{row.original.status ? "Active" : "Inactive"}</div>,
        },
        {
            accessorKey: "notes",
            header: "Notes",
        },
        {
            id: "actions",
            header: "Operations",
            cell: ({ row }) => {
                return (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setBoothToEdit(row.original)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setBoothToDelete(row.original)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                )
            },
        },
    ]

    const handleDeleteBooth = async () => {
        if (boothToDelete) {
            try {
                await deleteBoothMutation.mutateAsync(boothToDelete.boothId)
                setBoothToDelete(null)
            } catch (error) {
                console.error("Failed to delete booth:", error)
            }
        }
    }

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredBooths}
                isLoading={isLoading}
                searchPlaceholder="Search booths..."
                onSearch={setSearchTerm}
                searchValue={searchTerm}
                onCreateNew={() => setIsCreateDialogOpen(true)}
                createNewLabel="New Creation"
            />

            {/* Edit Booth Dialog */}
            {boothToEdit && (
                <BoothFormDialog
                    open={!!boothToEdit}
                    onOpenChange={(open) => !open && setBoothToEdit(null)}
                    booth={boothToEdit}
                />
            )}

            {/* Create Booth Dialog */}
            <BoothFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!boothToDelete} onOpenChange={(open) => !open && setBoothToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the booth &#34;{boothToDelete?.name}&#34;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBooth}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
