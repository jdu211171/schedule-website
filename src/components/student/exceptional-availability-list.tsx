"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";

interface ExceptionalAvailability {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  fullDay: boolean | null;
  reason?: string | null;
  notes?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface ExceptionalAvailabilityListProps {
  studentId: string;
  filters: {
    status: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

interface AvailabilityResponse {
  data: ExceptionalAvailability[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function ExceptionalAvailabilityList({
  studentId,
  filters,
}: ExceptionalAvailabilityListProps) {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch availability data
  const { data: response, isLoading } = useQuery<AvailabilityResponse>({
    queryKey: ["user-availability", studentId, "EXCEPTION", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: studentId,
        type: "EXCEPTION",
        ...(filters.status !== "all" && {
          status: filters.status.toUpperCase(),
        }),
        ...(filters.dateRange.start && { startDate: filters.dateRange.start }),
        ...(filters.dateRange.end && { endDate: filters.dateRange.end }),
        limit: "50",
      });
      return await fetcher(`/api/user-availability?${params}`);
    },
    enabled: !!studentId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: "APPROVED" | "REJECTED";
    }) => {
      return await fetcher("/api/user-availability/batch", {
        method: "PATCH",
        body: JSON.stringify({
          availabilityIds: ids,
          status,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-availability", studentId, "EXCEPTION"],
      });
      toast.success("ステータスを更新しました");
    },
    onError: () => {
      toast.error("ステータスの更新に失敗しました");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await fetcher(`/api/user-availability/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-availability", studentId, "EXCEPTION"],
      });
      toast.success("利用可能時間を削除しました");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("削除に失敗しました");
      setDeleteId(null);
    },
  });

  const data = response?.data || [];

  // Handle status update
  function handleStatusUpdate(id: string, status: "APPROVED" | "REJECTED") {
    updateStatusMutation.mutate({ ids: [id], status });
  }

  // Handle delete
  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  // Get status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            保留中
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default" className="bg-green-600">
            承認済み
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">拒否</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // Format date
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }

  // Format time range
  function formatTimeRange(item: ExceptionalAvailability) {
    if (item.fullDay) {
      return "終日利用可能";
    }
    if (!item.startTime && !item.endTime) {
      return "利用不可";
    }
    return `${item.startTime} - ${item.endTime}`;
  }

  // Get availability icon
  function getAvailabilityIcon(item: ExceptionalAvailability) {
    if (item.fullDay) {
      return <Clock className="h-4 w-4 text-green-600" />;
    }
    if (!item.startTime && !item.endTime) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <Clock className="h-4 w-4 text-blue-600" />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">例外的な利用可能時間が見つかりません</p>
        <p className="text-xs mt-1">
          フィルターを調整するか、新しい例外的な利用可能時間を追加してください
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>利用可能時間</TableHead>
              <TableHead>理由</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(item.date)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getAvailabilityIcon(item)}
                    <span>{formatTimeRange(item)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.reason || "理由なし"}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={
                          updateStatusMutation.isPending ||
                          deleteMutation.isPending
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      {item.status === "PENDING" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusUpdate(item.id, "APPROVED")
                            }
                            className="text-green-600"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            承認
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusUpdate(item.id, "REJECTED")
                            }
                            className="text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            拒否
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteId(item.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>例外的な利用可能時間を削除</AlertDialogTitle>
            <AlertDialogDescription>
              この例外的な利用可能時間設定を削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  削除中...
                </>
              ) : (
                "削除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
