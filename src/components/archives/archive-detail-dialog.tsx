"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Archive } from "@/hooks/useArchiveQuery";
import { 
  Calendar, 
  Clock, 
  User, 
  Users, 
  BookOpen, 
  MapPin, 
  Building2,
  Tag,
  FileText,
  Archive as ArchiveIcon
} from "lucide-react";

interface ArchiveDetailDialogProps {
  archive: Archive | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchiveDetailDialog({
  archive,
  open,
  onOpenChange,
}: ArchiveDetailDialogProps) {
  if (!archive) return null;

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return format(time, "HH:mm");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "yyyy年MM月dd日 (E)", { locale: ja });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "yyyy年MM月dd日 HH:mm", { locale: ja });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveIcon className="h-5 w-5" />
            アーカイブ詳細
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">基本情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">日付</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(archive.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">時間</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(archive.startTime)} - {formatTime(archive.endTime)}
                      {archive.duration && ` (${archive.duration}分)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">支店</p>
                    <p className="text-sm text-muted-foreground">
                      {archive.branchName || "未設定"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">ブース</p>
                    <p className="text-sm text-muted-foreground">
                      {archive.boothName || "未設定"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Class Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">授業情報</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">講師</p>
                    <p className="text-sm text-muted-foreground">
                      {archive.teacherName || "未設定"}
                    </p>
                  </div>
                </div>

                {archive.studentName && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">生徒</p>
                      <p className="text-sm text-muted-foreground">
                        {archive.studentName}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">科目</p>
                    <p className="text-sm text-muted-foreground">
                      {archive.subjectName || "未設定"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">クラスタイプ</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {archive.classTypeName || "未設定"}
                      </p>
                      {archive.enrolledStudents ? (
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          グループクラス
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" />
                          個別クラス
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Students (if group class) */}
            {archive.enrolledStudents && Array.isArray(archive.enrolledStudents) && archive.enrolledStudents.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    参加生徒 ({archive.enrolledStudents.length}名)
                  </h3>
                  <div className="space-y-2">
                    {archive.enrolledStudents.map((student: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm">{student.student_name}</span>
                        {student.status && (
                          <Badge variant="outline" className="text-xs">
                            {student.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {archive.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    備考
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {archive.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Archive Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">アーカイブ情報</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">クラスID</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {archive.classId}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">アーカイブ日時</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(archive.archivedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}