"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Pencil,
  Trash2,
  BadgeCheck,
  XCircle,
  Building2,
  Copy,
  ShieldCheck
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
import { useToast } from "@/hooks/use-toast";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

export function LineChannelTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const pageSize = 10;
  const { toast } = useToast();

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

  const copyToClipboard = async (channelId: string, webhookUrl: string) => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedId(channelId);
      toast({
        title: "コピーしました",
        description: "Webhook URLをクリップボードにコピーしました。",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "コピーに失敗しました",
        description: "クリップボードへのアクセスが拒否されました。",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<LineChannelResponse>[] = [
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
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
            <><BadgeCheck className="mr-1 h-3 w-3" /> 有効</>
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
            {branches.slice(0, 3).map((branch) => {
              const isTeacher = branch.channelType === 'TEACHER';
              const isStudent = branch.channelType === 'STUDENT';

              return (
                <div key={branch.id} className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="mr-1 h-3 w-3" />
                    {branch.branch.name}
                  </Badge>
                  <Badge
                    variant={isTeacher ? "default" : isStudent ? "secondary" : "outline"}
                    className={`text-xs ${
                      isTeacher
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : isStudent
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                    }`}
                  >
                    {isTeacher ? "講師" : isStudent ? "生徒" : "未設定"}
                  </Badge>
                </div>
              );
            })}
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
        const isCopied = copiedId === row.original.id;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyToClipboard(row.original.id, webhookUrl)}
                  className="relative group flex items-center gap-1 text-left"
                >
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[250px] block cursor-pointer transition-colors group-hover:bg-muted/80">
                    {webhookUrl}
                  </code>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCopied ? (
                      <BadgeCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-none">
                <div className="space-y-2">
                  <p className="font-mono text-xs">{webhookUrl}</p>
                  <p className="text-xs text-muted-foreground">
                    クリックしてコピー • LINE Developer ConsoleでこのURLを設定してください
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
            <BadgeCheck className="h-4 w-4" />
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
