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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  key: keyof ClassSessionWithRelations | "boothName" | "subjectName";
  direction: "ascending" | "descending";
};

// Define FilterState type
type FilterState = {
  teacherId: string | null;
  studentId: string | null;
  subjectId: string | null;
  subjectTypeId: string | null;
  boothId: string | null;
  classTypeId: string | null;
};

// Props for the dialogs that wrap the forms
type EditTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: EditTemplateClassSessionFormSession | null;
  onSessionUpdated: () => void;
};

type EditStandaloneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: EditStandaloneClassSessionFormSession | null;
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
  props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: null;
    onSessionUpdated: () => void;
  };
};

export default function AdminCalendarList() {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSessionWithRelations | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ClassSessionWithRelations | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "ascending",
  });
  // Initialize filter state
  const [filters, setFilters] = useState<FilterState>({
    teacherId: null,
    studentId: null,
    subjectId: null,
    subjectTypeId: null,
    boothId: null,
    classTypeId: null,
  });

  const { data: sessionsData, isLoading } = useClassSessions();
  const classSessions = useMemo(() => sessionsData?.data || [], [sessionsData]);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const teachers = Array.from(
      new Set(classSessions.map((s) => s.teacherId).filter((id): id is string => !!id))
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.teacherId === id)?.teacher?.name || id,
    }));

    const students = Array.from(
      new Set(classSessions.map((s) => s.studentId).filter((id): id is string => !!id))
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.studentId === id)?.student?.name || id,
    }));

    const subjects = Array.from(
      new Set(classSessions.map((s) => s.subjectId).filter((id): id is string => !!id))
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.subjectId === id)?.subject?.name || id,
    }));

    const subjectTypes = Array.from(
      new Set(classSessions.map((s) => s.subjectTypeId).filter((id): id is string => !!id))
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.subjectTypeId === id)?.subjectType?.name || id,
    }));

    const booths = Array.from(
      new Set(classSessions.map((s) => s.boothId).filter((id): id is string => !!id))
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.boothId === id)?.booth?.name || id,
    }));

    const classTypes = Array.from(
      new Set(classSessions.map((s) => s.classTypeId).filter((id): id is string => !!id))
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.classTypeId === id)?.classType?.name || id,
    }));

    return { teachers, students, subjects, subjectTypes, booths, classTypes };
  }, [classSessions]);

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
        return session.subject?.name || "";
      }
      if (key in session) {
        const value = session[key as keyof ClassSessionWithRelations];
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value as string | number | null | undefined;
      }
      return "";
    },
    []
  );

  // Apply filters before sorting
  const filteredSessions = useMemo(() => {
    return classSessions.filter((session) => {
      return (
        (!filters.teacherId || session.teacherId === filters.teacherId) &&
        (!filters.studentId || session.studentId === filters.studentId) &&
        (!filters.subjectId || session.subjectId === filters.subjectId) &&
        (!filters.subjectTypeId || session.subjectTypeId === filters.subjectTypeId) &&
        (!filters.boothId || session.boothId === filters.boothId) &&
        (!filters.classTypeId || session.classTypeId === filters.classTypeId)
      );
    });
  }, [classSessions, filters]);

  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
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
  }, [filteredSessions, sortConfig, getSortValue]);

  const openEditDialog = (session: ClassSessionWithRelations) => {
    setEditingSession(session);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (session: ClassSessionWithRelations) => {
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
        date: editingSession.date ? (editingSession.date instanceof Date ? editingSession.date : new Date(editingSession.date)) : undefined,
        startTime: formatTimeForSchema(editingSession.startTime),
        endTime: formatTimeForSchema(editingSession.endTime),
        boothId: editingSession.boothId ?? undefined,
        classTypeId: editingSession.classTypeId ?? undefined,
        teacherId: editingSession.teacherId ?? undefined,
        studentId: editingSession.studentId ?? undefined,
        subjectId: editingSession.subjectId ?? undefined,
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
    const dateObj = t instanceof Date ? t : new Date(t);
    if (isNaN(dateObj.getTime())) return "Invalid time";
    return format(dateObj, "HH:mm");
  };

  // Combobox component for filters
  type ComboboxProps = {
    options: { value: string; label: string }[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder: string;
  };

  const Combobox: React.FC<ComboboxProps> = ({ options, value, onChange, placeholder }) => {
    const [open, setOpen] = useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-[200px] justify-between", !value && "text-muted-foreground")}
          >
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search..." className="h-9" />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  Clear
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const ActiveForm = formConfig.component;

  return (
    <div>
      {ActiveForm && formConfig.props.open && <ActiveForm {...formConfig.props} />}
      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="text-sm font-medium">講師</label>
          <Combobox
            options={filterOptions.teachers}
            value={filters.teacherId}
            onChange={(value) => setFilters((prev) => ({ ...prev, teacherId: value }))}
            placeholder="Select teacher"
          />
        </div>
        <div>
          <label className="text-sm font-medium">生徒</label>
          <Combobox
            options={filterOptions.students}
            value={filters.studentId}
            onChange={(value) => setFilters((prev) => ({ ...prev, studentId: value }))}
            placeholder="Select student"
          />
        </div>
        <div>
          <label className="text-sm font-medium">科目</label>
          <Combobox
            options={filterOptions.subjects}
            value={filters.subjectId}
            onChange={(value) => setFilters((prev) => ({ ...prev, subjectId: value }))}
            placeholder="Select subject"
          />
        </div>
        <div>
          <label className="text-sm font-medium">科目タイプ</label>
          <Combobox
            options={filterOptions.subjectTypes}
            value={filters.subjectTypeId}
            onChange={(value) => setFilters((prev) => ({ ...prev, subjectTypeId: value }))}
            placeholder="Select subject type"
          />
        </div>
        <div>
          <label className="text-sm font-medium">ブース</label>
          <Combobox
            options={filterOptions.booths}
            value={filters.boothId}
            onChange={(value) => setFilters((prev) => ({ ...prev, boothId: value }))}
            placeholder="Select booth"
          />
        </div>
        <div>
          <label className="text-sm font-medium">授業タイプ</label>
          <Combobox
            options={filterOptions.classTypes}
            value={filters.classTypeId}
            onChange={(value) => setFilters((prev) => ({ ...prev, classTypeId: value }))}
            placeholder="Select class type"
          />
        </div>
      </div>
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDeleteDialog(session)}
                  style={{ marginLeft: "8px" }}
                >
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
