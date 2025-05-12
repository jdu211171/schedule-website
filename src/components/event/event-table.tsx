"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useEvents } from "@/hooks/useEventQuery";
import { useEventDelete, getResolvedEventId } from "@/hooks/useEventMutation";
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
import { Event } from "@prisma/client";
import { EventFormDialog } from "@/components/event/event-form-dialog";
import { format } from "date-fns";

export function EventTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: events, isLoading } = useEvents({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  // Ensure the data type returned by useEvents matches the expected type
  const typedEvents = events?.data;

  const totalCount = events?.pagination.total || 0;
  const deleteEventMutation = useEventDelete();

  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Event>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "startDate",
      header: "開始日",
      cell: ({ row }) => (
        <div>{format(new Date(row.original.startDate), "yyyy/MM/dd")}</div>
      ),
    },
    {
      accessorKey: "endDate",
      header: "終了日",
      cell: ({ row }) => (
        <div>{format(new Date(row.original.endDate), "yyyy/MM/dd")}</div>
      ),
    },
    {
      accessorKey: "isRecurring",
      header: "繰り返し",
      cell: ({ row }) => (
        <div>{row.original.isRecurring ? "あり" : "なし"}</div>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (row.original as Event & { _optimistic?: boolean })
          ._optimistic;

        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEventToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEventToDelete(row.original)}
              // disabled={isOptimistic}
            >
              <Trash2
                className={`h-4 w-4 text-destructive ${
                  isOptimistic ? "opacity-70" : ""
                }`}
              />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDeleteEvent = () => {
    if (eventToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedEventId to resolve temp/server IDs
      const id = getResolvedEventId(eventToDelete.id);
      setEventToDelete(null);
      deleteEventMutation.mutate(id);
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
        data={typedEvents || []}
        isLoading={isLoading && !typedEvents} // Only show loading state on initial load
        searchPlaceholder="イベントを検索..."
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

      {/* Edit Event Dialog */}
      {eventToEdit && (
        <EventFormDialog
          open={!!eventToEdit}
          onOpenChange={(open) => !open && setEventToEdit(null)}
          event={eventToEdit}
        />
      )}

      {/* Create Event Dialog */}
      <EventFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。イベント「{eventToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
