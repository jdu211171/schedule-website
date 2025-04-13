"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useBooths, useBoothsCount } from "@/hooks/useBoothQuery";
import { useBoothDelete } from "@/hooks/useBoothMutation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Booth } from "@prisma/client";
import { BoothFormDialog } from "@/components/booth/booth-form-dialog";

export function BoothTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: booths = [], isLoading, isFetching } = useBooths(page, pageSize);
  const { data: totalCount = 0 } = useBoothsCount();
  const deleteBoothMutation = useBoothDelete();

  const [boothToEdit, setBoothToEdit] = useState<Booth | null>(null);
  const [boothToDelete, setBoothToDelete] = useState<Booth | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredBooths = searchTerm
    ? booths.filter(
        (booth) =>
          booth.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (booth.notes &&
            booth.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : booths;

  const columns: ColumnDef<Booth>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "status",
      header: "ステータス",
      cell: ({ row }) => <div>{row.original.status ? "使用可" : "使用不可"}</div>,
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBoothToEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBoothToDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDeleteBooth = async () => {
    if (boothToDelete) {
      try {
        await deleteBoothMutation.mutateAsync(boothToDelete.boothId);
        setBoothToDelete(null);
      } catch (error) {
        console.error("ブースの削除に失敗しました:", error);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredBooths}
        isLoading={isLoading || isFetching}
        searchPlaceholder="ブースを検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
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
      <BoothFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!boothToDelete}
        onOpenChange={(open) => !open && setBoothToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。ブース「{boothToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBooth}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
