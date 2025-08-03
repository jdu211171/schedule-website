"use client";

import { useState, useEffect } from "react";
import { Users, GraduationCap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLineChannels } from "@/hooks/useLineChannelQuery";
import { useLineChannelSetType } from "@/hooks/useLineChannelMutation";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchChannelAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  currentTeacherChannelId?: string;
  currentStudentChannelId?: string;
}

export function BranchChannelAssignment({
  open,
  onOpenChange,
  branchId,
  branchName,
  currentTeacherChannelId,
  currentStudentChannelId,
}: BranchChannelAssignmentProps) {
  const [teacherChannelId, setTeacherChannelId] = useState<string>("none");
  const [studentChannelId, setStudentChannelId] = useState<string>("none");
  
  const { data: channelsData, isLoading } = useLineChannels({ limit: 100 });
  const setChannelTypeMutation = useLineChannelSetType();
  
  // Initialize with current values when dialog opens
  useEffect(() => {
    if (open) {
      setTeacherChannelId(currentTeacherChannelId || "none");
      setStudentChannelId(currentStudentChannelId || "none");
    }
  }, [open, currentTeacherChannelId, currentStudentChannelId]);
  
  // Filter active channels
  const activeChannels = channelsData?.data.filter(channel => channel.isActive) || [];
  
  const handleSave = async () => {
    const mutations = [];
    
    // Update teacher channel if changed
    if (teacherChannelId !== "none" && teacherChannelId !== currentTeacherChannelId) {
      mutations.push(
        setChannelTypeMutation.mutateAsync({
          branchId,
          channelId: teacherChannelId,
          channelType: 'TEACHER'
        })
      );
    }
    
    // Update student channel if changed
    if (studentChannelId !== "none" && studentChannelId !== currentStudentChannelId) {
      mutations.push(
        setChannelTypeMutation.mutateAsync({
          branchId,
          channelId: studentChannelId,
          channelType: 'STUDENT'
        })
      );
    }
    
    if (mutations.length > 0) {
      try {
        await Promise.all(mutations);
        onOpenChange(false);
      } catch (error) {
        // Errors are handled by the mutation hooks
      }
    } else {
      onOpenChange(false);
    }
  };
  
  const isSubmitting = setChannelTypeMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>チャンネル設定 - {branchName}</DialogTitle>
          <DialogDescription>
            この校舎の講師用・生徒用LINEチャンネルを設定します。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Teacher Channel Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              講師用チャンネル
            </Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={teacherChannelId}
                onValueChange={setTeacherChannelId}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="講師用チャンネルを選択..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {activeChannels.map((channel) => (
                    <SelectItem 
                      key={channel.id} 
                      value={channel.id}
                      disabled={channel.id === studentChannelId}
                    >
                      {channel.name}
                      {channel.id === studentChannelId && " (生徒用に使用中)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-muted-foreground">
              講師への通知送信に使用されるチャンネルです
            </p>
          </div>
          
          {/* Student Channel Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              生徒用チャンネル
            </Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={studentChannelId}
                onValueChange={setStudentChannelId}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="生徒用チャンネルを選択..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {activeChannels.map((channel) => (
                    <SelectItem 
                      key={channel.id} 
                      value={channel.id}
                      disabled={channel.id === teacherChannelId}
                    >
                      {channel.name}
                      {channel.id === teacherChannelId && " (講師用に使用中)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-muted-foreground">
              生徒への通知送信に使用されるチャンネルです
            </p>
          </div>
          
          {/* Warning if same channel selected for both */}
          {teacherChannelId !== "none" && studentChannelId !== "none" && teacherChannelId === studentChannelId && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ 同じチャンネルを講師用と生徒用の両方に設定することはできません
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isSubmitting ||
              isLoading ||
              (teacherChannelId === (currentTeacherChannelId || "none") && 
               studentChannelId === (currentStudentChannelId || "none")) ||
              (teacherChannelId !== "none" && studentChannelId !== "none" && 
               teacherChannelId === studentChannelId)
            }
          >
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}