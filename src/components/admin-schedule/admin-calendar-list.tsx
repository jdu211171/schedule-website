"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClassSessions, ClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { EditTemplateClassSessionForm } from "./edit-template-class-session-form";
import { EditStandaloneClassSessionForm } from "./edit-standalone-class-session-form";
import { UpdateStandaloneClassSessionSchema, UpdateTemplateClassSessionSchema } from "@/schemas/class-session.schema";
import { z } from "zod";

// Define specific session types for the edit forms
type EditTemplateClassSessionFormSession = z.infer<typeof UpdateTemplateClassSessionSchema>;
type EditStandaloneClassSessionFormSession = z.infer<typeof UpdateStandaloneClassSessionSchema>;

// Define SortConfig type
type SortConfig = {
  key: keyof ClassSessionWithRelations | "boothName" | "subjectName"; // Updated to ClassSessionWithRelations
  direction: "ascending" | "descending";
};

// Props for the dialogs that wrap the forms
// These props are for the dialog components themselves, not the forms directly.
// The forms will receive a subset of ClassSessionWithRelations.
type EditTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: EditTemplateClassSessionFormSession | null; // Specific session type
  onSessionUpdated: () => void;
};

type EditStandaloneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: EditStandaloneClassSessionFormSession | null; // Specific session type
  onSessionUpdated: () => void;
};

// Define the FormConfig discriminated union
type FormConfig =
  | {
      type: "template";
      component: React.FC<EditTemplateDialogProps>;
      props: EditTemplateDialogProps;
    }
  | {
      type: "standalone";
      component: React.FC<EditStandaloneDialogProps>;
      props: EditStandaloneDialogProps;
    }
  | {
      type: null;
      component: null;
      props: { // Common props for the null state
          open: boolean;
          onOpenChange: (open: boolean) => void;
          session: null; // Explicitly null
          onSessionUpdated: () => void;
      };
    };

export default function AdminCalendarList() {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSessionWithRelations | null>( // Updated type
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ClassSessionWithRelations | null>( // Updated type
    null
  );

  const { data: sessionsData, isLoading } = useClassSessions();
  const classSessions = useMemo(() => sessionsData?.data || [], [sessionsData]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "ascending",
  });

  const handleSort = useCallback((key: SortConfig["key"]) => {
    setSortConfig((prevConfig: SortConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }, []);

  const getSortValue = useCallback(
    (session: ClassSessionWithRelations, key: SortConfig["key"]) => {
      if (key === "boothName") {
        return session.booth?.name || "";
      }
      if (key === "subjectName") {
        return session.subject?.name || ""; // Assuming subject is available
      }
      // Ensure other keys are valid for ClassSessionWithRelations
      if (key in session) {
        const value = session[key as keyof ClassSessionWithRelations];
        // Handle cases where value might be a Date object for sorting
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value as string | number | null | undefined;
      }
      return ""; // Fallback for keys not directly on session
    },
    [] // Removed booths from dependency array
  );

  const sortedSessions = useMemo(() => {
    return [...classSessions].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [classSessions, sortConfig, getSortValue]);

  const openEditDialog = (session: ClassSessionWithRelations) => { // Updated type
    setEditingSession(session);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (session: ClassSessionWithRelations) => { // Updated type
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete) return;
    console.log("Deleting session:", sessionToDelete.classId);
    // TODO: Implement actual delete mutation
    // For example: await deleteClassSessionMutation.mutateAsync(sessionToDelete.classId);
    // For now, just invalidating queries and closing dialog
    // await fetcher(`/api/class-session/${sessionToDelete.classId}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ["classSessions"] });
    closeDeleteDialog();
  }, [sessionToDelete, queryClient]);

  const handleSessionUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["classSessions"] });
    setIsEditDialogOpen(false);
    setEditingSession(null);
  }, [queryClient]);

  const formatTimeForSchema = (date: Date | string | null | undefined): string | undefined => {
    if (!date) return undefined;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return undefined;
      return format(d, "HH:mm");
    } catch {
      return undefined;
    }
  };

  const formConfig = useMemo<FormConfig>(() => {
    if (!isEditDialogOpen || !editingSession) {
      return {
        type: null,
        component: null,
        props: {
          open: false,
          onOpenChange: setIsEditDialogOpen,
          session: null,
          onSessionUpdated: handleSessionUpdated,
        },
      };
    }

    if (typeof editingSession.templateId === "string" && editingSession.templateId !== null) {
      const sessionForTemplateForm: EditTemplateClassSessionFormSession = {
        classId: editingSession.classId,
        startTime: formatTimeForSchema(editingSession.startTime),
        endTime: formatTimeForSchema(editingSession.endTime),
        boothId: editingSession.boothId ?? undefined,
        subjectTypeId: editingSession.subjectTypeId ?? undefined,
        notes: editingSession.notes ?? undefined,
      };
      return {
        type: "template",
        component: EditTemplateClassSessionForm as React.FC<EditTemplateDialogProps>,
        props: {
          open: isEditDialogOpen,
          onOpenChange: setIsEditDialogOpen,
          session: sessionForTemplateForm,
          onSessionUpdated: handleSessionUpdated,
        },
      };
    } else {
      const sessionForStandaloneForm: EditStandaloneClassSessionFormSession = {
        classId: editingSession.classId,
        // date is Date | undefined in inferred type due to .transform()
        date: editingSession.date ? (editingSession.date instanceof Date ? editingSession.date : new Date(editingSession.date)) : undefined,
        startTime: formatTimeForSchema(editingSession.startTime),
        endTime: formatTimeForSchema(editingSession.endTime),
        boothId: editingSession.boothId ?? undefined,
        classTypeId: editingSession.classTypeId ?? undefined,
        teacherId: editingSession.teacherId ?? undefined,
        studentId: editingSession.studentId ?? undefined,
        subjectId: editingSession.subjectId ?? undefined, // Ensure this is correctly handled if optional in schema
        subjectTypeId: editingSession.subjectTypeId ?? undefined,
        notes: editingSession.notes ?? undefined,
      };
      return {
        type: "standalone",
        component: EditStandaloneClassSessionForm as React.FC<EditStandaloneDialogProps>,
        props: {
          open: isEditDialogOpen,
          onOpenChange: setIsEditDialogOpen,
          session: sessionForStandaloneForm,
          onSessionUpdated: handleSessionUpdated,
        },
      };
    }
  }, [isEditDialogOpen, editingSession, handleSessionUpdated]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const formatDate = (d: Date | string | null) => {
    if (!d) return "N/A";
    return format(new Date(d), "dd.MM.yy");
  };

  const formatTime = (t: Date | string | null) => {
    if (!t) return "N/A";
    // Check if it's already a Date object, if not, try to parse it
    // The data from API (ClassSessionWithRelations) will have date strings
    const dateObj = t instanceof Date ? t : new Date(t);
    if (isNaN(dateObj.getTime())) return "Invalid time"; // Check if date parsing was successful
    return format(dateObj, "HH:mm");
  };

  const ActiveForm = formConfig.component;

  return (
    <div>
      {ActiveForm && formConfig.props.open && (
        <ActiveForm {...formConfig.props} />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => handleSort("date")}>日付</TableHead>
            <TableHead onClick={() => handleSort("startTime")}>開始</TableHead>
            <TableHead onClick={() => handleSort("endTime")}>終了</TableHead>
            <TableHead onClick={() => handleSort("teacherId")}>講師</TableHead>
            <TableHead onClick={() => handleSort("studentId")}>生徒</TableHead>
            <TableHead onClick={() => handleSort("subjectId")}>科目</TableHead>
            <TableHead onClick={() => handleSort("subjectTypeId")}>科目タイプ</TableHead>
            <TableHead onClick={() => handleSort("boothId")}>ブース</TableHead>
            <TableHead onClick={() => handleSort("classTypeId")}>授業タイプ</TableHead>
            <TableHead>備考</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSessions.map((session) => (
            <TableRow key={session.classId}>
              <TableCell>{formatDate(session.date)}</TableCell>
              <TableCell>{formatTime(session.startTime)}</TableCell>
              <TableCell>{formatTime(session.endTime)}</TableCell>
              <TableCell>{session.teacher?.name || session.teacherId || "N/A"}</TableCell>
              <TableCell>{session.student?.name || session.studentId || "N/A"}</TableCell>
              <TableCell>{session.subject?.name || session.subjectId || "N/A"}</TableCell>
              <TableCell>{session.subjectType?.name || session.subjectTypeId || "N/A"}</TableCell>
              <TableCell>{session.booth?.name || session.boothId || "N/A"}</TableCell>
              <TableCell>{session.classType?.name || session.classTypeId || "N/A"}</TableCell>
              <TableCell>{session.notes || ""}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(session)}>
                  編集
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(session)} style={{ marginLeft: '8px' }}>
                  削除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {isDeleteDialogOpen && sessionToDelete && (
        <AlertDialog open onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>削除の確認</AlertDialogTitle>
              <AlertDialogDescription>
                {formatDate(sessionToDelete.date)}の{formatTime(sessionToDelete.startTime)}の授業を本当に削除しますか？この操作は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSession}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
