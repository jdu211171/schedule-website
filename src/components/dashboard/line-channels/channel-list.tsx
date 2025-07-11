"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle,
  Star,
  Building2,
  TestTube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { LineChannelResponse } from "@/types/line-channel";
import { useLineChannels, useMigrationStatus } from "@/hooks/useLineChannelQuery";
import { 
  useLineChannelDelete,
  useLineChannelMigrate
} from "@/hooks/useLineChannelMutation";
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
import { ChannelFormDialog } from "./channel-form-dialog";
import { ChannelTestDialog } from "./channel-test-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

export function LineChannelTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: channels, isLoading } = useLineChannels({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: migrationStatus } = useMigrationStatus();
  const deleteMutation = useLineChannelDelete();
  const migrateMutation = useLineChannelMigrate();

  const [channelToEdit, setChannelToEdit] = useState<LineChannelResponse | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<LineChannelResponse | null>(null);
  const [channelToTest, setChannelToTest] = useState<LineChannelResponse | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<LineChannelResponse>[] = [
    {
      accessorKey: "id",
      header: "チャンネルID",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <code className="text-xs bg-muted px-2 py-1 rounded cursor-pointer truncate max-w-[150px] block">
                {row.original.id}
              </code>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">{row.original.id}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: "name",
      header: "チャンネル名",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.isDefault && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>デフォルトチャンネル</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "説明",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "ステータス",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? (
            <><CheckCircle className="mr-1 h-3 w-3" /> 有効</>
          ) : (
            <><XCircle className="mr-1 h-3 w-3" /> 無効</>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "branches",
      header: "割り当てブランチ",
      cell: ({ row }) => {
        const branches = row.original.branches;
        if (!branches || branches.length === 0) {
          return <span className="text-muted-foreground">未割り当て</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {branches.slice(0, 3).map((branch) => (
              <Badge key={branch.id} variant="outline" className="text-xs">
                <Building2 className="mr-1 h-3 w-3" />
                {branch.branch.name}
                {branch.isPrimary && " (主)"}
              </Badge>
            ))}
            {branches.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{branches.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "webhookUrl",
      header: "Webhook URL",
      cell: ({ row }) => {
        // Generate the webhook URL using the channel ID
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXTAUTH_URL || 'https://your-domain.com';
        const webhookUrl = `${baseUrl}/api/line/webhook/${row.original.id}`;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <code className="text-xs bg-muted px-1 py-0.5 rounded truncate max-w-[250px] block cursor-pointer">
                  {webhookUrl}
                </code>
              </TooltipTrigger>
              <TooltipContent className="max-w-none">
                <div className="space-y-2">
                  <p className="font-mono text-xs">{webhookUrl}</p>
                  <p className="text-xs text-muted-foreground">
                    LINE Developer ConsoleでこのURLを設定してください
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChannelToTest(row.original)}
          >
            <TestTube className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChannelToEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChannelToDelete(row.original)}
            disabled={row.original.isDefault}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!channelToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(channelToDelete.id);
      setChannelToDelete(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleMigrate = async () => {
    try {
      await migrateMutation.mutateAsync();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={channels?.data || []}
        searchPlaceholder="チャンネル名で検索..."
        isLoading={isLoading}
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規チャンネル"
        pageIndex={page - 1}
        pageCount={channels?.pagination?.pages || 1}
        onPageChange={(pageIndex) => setPage(pageIndex + 1)}
        pageSize={pageSize}
        totalItems={channels?.pagination?.total || 0}
        filterComponent={
          migrationStatus?.canMigrate && (
            <Button
              variant="outline"
              onClick={handleMigrate}
              disabled={migrateMutation.isPending}
            >
              環境変数から移行
            </Button>
          )
        }
      />

      <ChannelFormDialog
        open={isCreateDialogOpen || !!channelToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setChannelToEdit(null);
          }
        }}
        channel={channelToEdit}
      />

      <ChannelTestDialog
        open={!!channelToTest}
        onOpenChange={(open) => {
          if (!open) {
            setChannelToTest(null);
          }
        }}
        channel={channelToTest}
      />

      <AlertDialog
        open={!!channelToDelete}
        onOpenChange={(open) => !open && setChannelToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>チャンネルを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{channelToDelete?.name}」を削除します。この操作は取り消せません。
              このチャンネルに関連付けられているブランチは影響を受けます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}