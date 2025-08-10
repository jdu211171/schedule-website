"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Link,
  Unlink,
  MessageSquare,
  User,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  useTeacherLineUnbind,
  useStudentLineUnbind,
  useDeleteTeacherLineLink,
  useDeleteStudentLineLink,
} from "@/hooks/useLineUnbindMutation";
import { fetcher } from "@/lib/fetcher";

interface LineManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: "teacher" | "student";
  userId: string;
  userName: string;
  lineConnections: {
    // For teacher
    lineId?: string | null;
    lineUserId?: string | null;
    lineNotificationsEnabled?: boolean | null;
    // For student
    parentLineId1?: string | null;
    parentLineUserId1?: string | null;
    parent1LineNotificationsEnabled?: boolean | null;
    
  };
  onConnectionUnbound?: (accountType: "teacher" | "student" | "parent") => void;
}

interface UnbindConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  accountLabel: string;
  userName: string;
  isLoading?: boolean;
}

function UnbindConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  accountLabel,
  userName,
  isLoading = false,
}: UnbindConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>LINE連携を解除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            {userName}さんの{accountLabel}のLINE連携を解除します。
            この操作は取り消せません。再度連携するには、ユーザーがLINEボットに連携コマンドを送信する必要があります。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                解除中...
              </>
            ) : (
              "解除する"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LineManagementDialog({
  open,
  onOpenChange,
  userType,
  userId,
  userName,
  lineConnections,
  onConnectionUnbound,
}: LineManagementDialogProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    accountType?: "teacher" | "student" | "parent";
    accountLabel?: string;
  }>({ open: false });

  const teacherUnbindMutation = useTeacherLineUnbind();
  const studentUnbindMutation = useStudentLineUnbind();
  const deleteTeacherLink = useDeleteTeacherLineLink();
  const deleteStudentLink = useDeleteStudentLineLink();

  const [teacherLinks, setTeacherLinks] = useState<any[]>([]);
  const [studentLinks, setStudentLinks] = useState<any[]>([]);
  // Local snapshot of connection fields for immediate UI updates
  const [currentConnections, setCurrentConnections] = useState(lineConnections);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linkConfirm, setLinkConfirm] = useState<{
    open: boolean;
    linkId?: string;
    channelId?: string;
    accountSlot?: "student" | "parent";
    channelName?: string;
  }>({ open: false });

  // Keep a snapshot for optimistic update fallback
  const [prevTeacherLinks, setPrevTeacherLinks] = useState<any[] | null>(null);
  const [prevStudentLinks, setPrevStudentLinks] = useState<any[] | null>(null);

  const reloadLinks = async () => {
    if (!open) return;
    try {
      setLoadingLinks(true);
      if (userType === "teacher") {
        const res: any = await fetcher(`/api/teachers/${userId}/line-links?r=${Date.now()}`, { cache: "no-store" });
        setTeacherLinks(res?.data || []);
      } else {
        const res: any = await fetcher(`/api/students/${userId}/line-links?r=${Date.now()}`, { cache: "no-store" });
        setStudentLinks(res?.data || []);
      }
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    reloadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, userType]);

  // Sync local connections when props change (e.g., dialog reopened)
  useEffect(() => {
    setCurrentConnections(lineConnections);
  }, [lineConnections, open]);

  const handleUnbind = (
    accountType: "teacher" | "student" | "parent",
    accountLabel: string
  ) => {
    setConfirmDialog({ open: true, accountType, accountLabel });
  };

  const handleConfirmUnbind = async () => {
    if (!confirmDialog.accountType) return;

    try {
      if (userType === "teacher") {
        await teacherUnbindMutation.mutateAsync({
          teacherId: userId,
          confirm: true,
        });
        // Optimistically reflect in this dialog
        setCurrentConnections((prev) => ({
          ...prev,
          lineId: null,
          lineUserId: prev.lineUserId ?? null,
        }));
      } else {
        await studentUnbindMutation.mutateAsync({
          studentId: userId,
          accountType: confirmDialog.accountType as "student" | "parent",
          confirm: true,
        });
        setCurrentConnections((prev) => ({
          ...prev,
          ...(confirmDialog.accountType === "student"
            ? { lineId: null }
            : { parentLineId1: null }),
        }));
      }
      setConfirmDialog({ open: false });
      // Notify parent to update its local state immediately
      onConnectionUnbound?.(confirmDialog.accountType);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleConfirmLinkUnbind = async () => {
    // Optimistically remove from UI
    if (userType === "teacher") {
      setPrevTeacherLinks(teacherLinks);
      setTeacherLinks((links) => links.filter((l) => l.id !== linkConfirm.linkId));
    } else {
      setPrevStudentLinks(studentLinks);
      setStudentLinks((links) => links.filter((l) => l.id !== linkConfirm.linkId));
    }

    // Close confirm immediately for better UX
    setLinkConfirm({ open: false });

    try {
      if (userType === "teacher") {
        await deleteTeacherLink.mutateAsync({
          teacherId: userId,
          linkId: linkConfirm.linkId,
          channelId: linkConfirm.channelId,
        });
      } else {
        await deleteStudentLink.mutateAsync({
          studentId: userId,
          linkId: linkConfirm.linkId,
          channelId: linkConfirm.channelId,
          accountSlot: linkConfirm.accountSlot,
        });
      }
      // Ensure UI reflects latest server state
      reloadLinks();
    } catch (_e) {
      // Revert to previous state on failure
      if (userType === "teacher" && prevTeacherLinks) {
        setTeacherLinks(prevTeacherLinks);
      }
      if (userType === "student" && prevStudentLinks) {
        setStudentLinks(prevStudentLinks);
      }
    } finally {
      // Clear snapshots
      setPrevTeacherLinks(null);
      setPrevStudentLinks(null);
    }
  };

  const isUnbinding =
    teacherUnbindMutation.isPending || studentUnbindMutation.isPending;
  const isDeletingLink = deleteTeacherLink.isPending || deleteStudentLink.isPending;

  // Prepare connection data
  const connections = [];

  if (userType === "teacher") {
    connections.push({
      type: "teacher",
      label: "講師アカウント",
      icon: <User className="h-4 w-4" />,
      lineId: currentConnections.lineId,
      lineUserId: currentConnections.lineUserId,
      notificationsEnabled: currentConnections.lineNotificationsEnabled,
    });
  } else {
    connections.push(
      {
        type: "student",
        label: "生徒アカウント",
        icon: <User className="h-4 w-4" />,
        lineId: currentConnections.lineId,
        lineUserId: currentConnections.lineUserId,
        notificationsEnabled: currentConnections.lineNotificationsEnabled,
      },
      {
        type: "parent",
        label: "保護者アカウント",
        icon: <Users className="h-4 w-4" />,
        lineId: currentConnections.parentLineId1,
        lineUserId: currentConnections.parentLineUserId1,
        notificationsEnabled: currentConnections.parent1LineNotificationsEnabled,
      }
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              LINE連携管理
            </DialogTitle>
            <DialogDescription>{userName}さんのLINE連携状況</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Channel-specific linked accounts */}
            <div className="space-y-2">
              <p className="font-medium text-sm">チャネル連携</p>
              {loadingLinks ? (
                <div className="text-sm text-muted-foreground">読み込み中...</div>
              ) : userType === "teacher" ? (
                teacherLinks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">チャネル連携がありません</div>
                ) : (
                  teacherLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium">{link.channelName}</div>
                        <div className="text-xs text-muted-foreground">LINE ID: {link.lineUserId}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={link.enabled ? "default" : "secondary"} className="text-xs">
                          {link.enabled ? "有効" : "無効"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLinkConfirm({ open: true, linkId: link.id, channelId: link.channelId, channelName: link.channelName })}
                          disabled={isDeletingLink}
                        >
                          <Unlink className="h-4 w-4" />
                          解除
                        </Button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                studentLinks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">チャネル連携がありません</div>
                ) : (
                  studentLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium">{link.channelName}（{link.accountSlot}）</div>
                        <div className="text-xs text-muted-foreground">LINE ID: {link.lineUserId}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={link.enabled ? "default" : "secondary"} className="text-xs">
                          {link.enabled ? "有効" : "無効"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLinkConfirm({ open: true, linkId: link.id, channelId: link.channelId, accountSlot: link.accountSlot, channelName: link.channelName })}
                          disabled={isDeletingLink}
                        >
                          <Unlink className="h-4 w-4" />
                          解除
                        </Button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
            {connections.map((connection) => {
              const isLinked = !!connection.lineId;

              return (
                <div
                  key={connection.type}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {connection.icon}
                    <div>
                      <p className="font-medium text-sm">{connection.label}</p>
                      {isLinked && connection.lineUserId && (
                        <p className="text-xs text-muted-foreground">
                          LINE ID: {connection.lineUserId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLinked ? (
                      <>
                        <Badge variant="default" className="text-xs">
                          <Link className="h-3 w-3 mr-1" />
                          連携済み
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleUnbind(
                              connection.type as any,
                              connection.label
                            )
                          }
                          disabled={isUnbinding}
                        >
                          <Unlink className="h-4 w-4" />
                          解除
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Unlink className="h-3 w-3 mr-1" />
                        未連携
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                LINE連携を解除すると、通知が送信されなくなります。
                再度連携するには、ユーザーがLINEボットに連携コマンドを送信する必要があります。
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnbindConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
        onConfirm={handleConfirmUnbind}
        accountLabel={confirmDialog.accountLabel || ""}
        userName={userName}
        isLoading={isUnbinding}
      />

      <UnbindConfirmDialog
        open={linkConfirm.open}
        onOpenChange={(open) => setLinkConfirm({ open })}
        onConfirm={handleConfirmLinkUnbind}
        accountLabel={linkConfirm.channelName || "チャネル連携"}
        userName={userName}
        isLoading={isDeletingLink}
      />
    </>
  );
}
