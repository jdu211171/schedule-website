"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useTeacherSubjectCreate,
  useTeacherSubjectUpdate,
} from "@/hooks/useTeacherSubjectMutation";
import { TeacherSubjectWithRelations } from "./teacher-subject-table";
import { Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Create a custom schema that enforces required fields with custom error messages
const TeacherSubjectFormSchema = z.object({
  teacherId: z
    .string({
      required_error: "講師を選択してください",
    })
    .min(1, "講師を選択してください"),
  subjectId: z
    .string({
      required_error: "科目を選択してください",
    })
    .min(1, "科目を選択してください"),
  subjectTypeIds: z
    .array(z.string())
    .min(1, "少なくとも1つの科目タイプを選択してください"),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

type FormValues = z.infer<typeof TeacherSubjectFormSchema>;

interface TeacherSubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherSubject?: TeacherSubjectWithRelations | null;
}

export function TeacherSubjectFormDialog({
  open,
  onOpenChange,
  teacherSubject,
}: TeacherSubjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTeacherSubjectMutation = useTeacherSubjectCreate();
  const updateTeacherSubjectMutation = useTeacherSubjectUpdate();
  const [error, setError] = useState<string | null>(null);

  // Searchable select states
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  const [subjectTypeSearchTerm, setSubjectTypeSearchTerm] = useState("");
  const [showSubjectTypeDropdown, setShowSubjectTypeDropdown] = useState(false);
  const subjectTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Multi-select for subject types
  const [selectedSubjectTypeIds, setSelectedSubjectTypeIds] = useState<
    string[]
  >([]);

  const isEditing = !!teacherSubject;
  const { data: teachers } = useTeachers();
  const { data: subjects } = useSubjects();
  const { data: subjectTypesResponse } = useSubjectTypes();

  const form = useForm<FormValues>({
    resolver: zodResolver(TeacherSubjectFormSchema),
    defaultValues: {
      teacherId: "",
      subjectId: "",
      subjectTypeIds: [],
      notes: "",
    },
    mode: "onSubmit", // Validate on submit
  });

  // Set form values when editing an existing teacher subject
  useEffect(() => {
    if (teacherSubject && open) {
      form.reset({
        teacherId: teacherSubject.teacherId,
        subjectId: teacherSubject.subjectId,
        subjectTypeIds: [teacherSubject.subjectTypeId], // Convert to array for the form
        notes: teacherSubject.notes || "",
      });
      setSelectedSubjectTypeIds([teacherSubject.subjectTypeId]);

      // Set search terms based on selected values
      const selectedTeacher = teachers?.data?.find(
        (t) => t.teacherId === teacherSubject.teacherId
      );
      if (selectedTeacher) {
        setTeacherSearchTerm(selectedTeacher.name);
      }

      const selectedSubject = subjects?.data?.find(
        (s) => s.subjectId === teacherSubject.subjectId
      );
      if (selectedSubject) {
        setSubjectSearchTerm(selectedSubject.name);
      }
    } else if (!teacherSubject && open) {
      // Reset form when creating a new teacher subject
      form.reset({
        teacherId: "",
        subjectId: "",
        subjectTypeIds: [],
        notes: "",
      });
      setSelectedSubjectTypeIds([]);
      setTeacherSearchTerm("");
      setSubjectSearchTerm("");
      setSubjectTypeSearchTerm("");
      setError(null);
    }
  }, [teacherSubject, form, open, teachers, subjects]);

  // Update form when selected subject types change
  useEffect(() => {
    form.setValue("subjectTypeIds", selectedSubjectTypeIds, {
      shouldValidate: true,
    });
  }, [selectedSubjectTypeIds, form]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        teacherDropdownRef.current &&
        !teacherDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTeacherDropdown(false);
      }
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSubjectDropdown(false);
      }
      if (
        subjectTypeDropdownRef.current &&
        !subjectTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSubjectTypeDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter subject types based on selected subject
  const selectedSubjectId = form.watch("subjectId");
  const availableSubjectTypes =
    selectedSubjectId && subjectTypesResponse?.data
      ? subjectTypesResponse.data.filter((type) => {
          const subject = subjects?.data.find(
            (s) => s.subjectId === selectedSubjectId
          );
          return subject?.subjectToSubjectTypes.some(
            (st) => st.subjectTypeId === type.subjectTypeId
          );
        })
      : [];

  // Filtered lists for dropdowns
  const filteredTeachers =
    teachers?.data?.filter(
      (teacher) =>
        !teacherSearchTerm ||
        teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
    ) || [];

  const filteredSubjects =
    subjects?.data?.filter(
      (subject) =>
        !subjectSearchTerm ||
        subject.name.toLowerCase().includes(subjectSearchTerm.toLowerCase())
    ) || [];

  const filteredSubjectTypes = availableSubjectTypes.filter(
    (type) =>
      !subjectTypeSearchTerm ||
      type.name.toLowerCase().includes(subjectTypeSearchTerm.toLowerCase())
  );

  // Select handlers
  const handleTeacherSelect = (teacher: any) => {
    form.setValue("teacherId", teacher.teacherId);
    setTeacherSearchTerm(teacher.name);
    setShowTeacherDropdown(false);
  };

  const handleSubjectSelect = (subject: any) => {
    form.setValue("subjectId", subject.subjectId);
    setSelectedSubjectTypeIds([]); // Reset selected subject types when subject changes
    form.setValue("subjectTypeIds", []);
    setSubjectSearchTerm(subject.name);
    setShowSubjectDropdown(false);
  };

  // Toggle subject type selection
  const toggleSubjectTypeSelection = (typeId: string) => {
    setSelectedSubjectTypeIds((prev) => {
      if (prev.includes(typeId)) {
        return prev.filter((id) => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  // Get subject type name by ID
  const getSubjectTypeNameById = (typeId: string) => {
    const type = subjectTypesResponse?.data?.find(
      (t) => t.subjectTypeId === typeId
    );
    return type ? type.name : typeId;
  };

  // Remove selected subject type
  const removeSubjectType = (typeId: string) => {
    setSelectedSubjectTypeIds((prev) => prev.filter((id) => id !== typeId));
  };

  // In teacher-subject-form-dialog.tsx - update the onSubmit function
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        // When editing, we can only update the notes for the specific teacher-subject-type trio
        const updatePayload = {
          teacherId: values.teacherId,
          subjectId: values.subjectId,
          subjectTypeId: values.subjectTypeIds[0], // In edit mode, we only have one subject type
          notes: values.notes,
        };

        // Close dialog and reset form immediately for better UX
        onOpenChange(false);
        await updateTeacherSubjectMutation.mutateAsync(updatePayload);
      } else {
        // When creating, we need to create one record per selected subject type
        const selectedTeacher = teachers?.data?.find(
          (t) => t.teacherId === values.teacherId
        );
        const selectedSubject = subjects?.data?.find(
          (s) => s.subjectId === values.subjectId
        );

        // Close dialog and reset form immediately for better UX
        onOpenChange(false);

        // Create multiple teacher-subject records (one for each selected subject type)
        for (const subjectTypeId of values.subjectTypeIds) {
          const selectedSubjectType = subjectTypesResponse?.data?.find(
            (st) => st.subjectTypeId === subjectTypeId
          );

          await createTeacherSubjectMutation.mutateAsync({
            teacherId: values.teacherId,
            subjectId: values.subjectId,
            subjectTypeId,
            notes: values.notes,
            _teacherName: selectedTeacher?.name,
            _subjectName: selectedSubject?.name,
            _subjectTypeName: selectedSubjectType?.name,
          });
        }
      }

      // Reset form
      form.reset();
      setSelectedSubjectTypeIds([]);
    } catch (error) {
      console.error("講師科目割り当ての保存に失敗しました:", error);
      setError("講師科目割り当ての保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "講師科目割り当ての編集" : "講師科目割り当ての作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Searchable Teacher Select */}
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    講師
                  </FormLabel>
                  <div ref={teacherDropdownRef} className="relative">
                    <div className="flex w-full items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        className="flex-1 h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="講師を検索..."
                        value={teacherSearchTerm}
                        onChange={(e) => {
                          setTeacherSearchTerm(e.target.value);
                          setShowTeacherDropdown(true);
                        }}
                        onFocus={() => setShowTeacherDropdown(true)}
                        disabled={isEditing}
                      />
                    </div>

                    {/* Teacher Dropdown */}
                    {showTeacherDropdown && !isEditing && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                        <div className="max-h-[200px] overflow-auto p-1">
                          {filteredTeachers.length > 0 ? (
                            filteredTeachers.map((teacher) => (
                              <div
                                key={teacher.teacherId}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={() => handleTeacherSelect(teacher)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`mr-2 h-4 w-4 ${
                                    field.value === teacher.teacherId
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                >
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                {teacher.name}
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-sm">
                              講師が見つかりません
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Searchable Subject Select */}
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    科目
                  </FormLabel>
                  <div ref={subjectDropdownRef} className="relative">
                    <div className="flex w-full items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        className="flex-1 h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="科目を検索..."
                        value={subjectSearchTerm}
                        onChange={(e) => {
                          setSubjectSearchTerm(e.target.value);
                          setShowSubjectDropdown(true);
                        }}
                        onFocus={() => setShowSubjectDropdown(true)}
                        disabled={isEditing}
                      />
                    </div>

                    {/* Subject Dropdown */}
                    {showSubjectDropdown && !isEditing && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                        <div className="max-h-[200px] overflow-auto p-1">
                          {filteredSubjects.length > 0 ? (
                            filteredSubjects.map((subject) => (
                              <div
                                key={subject.subjectId}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={() => handleSubjectSelect(subject)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`mr-2 h-4 w-4 ${
                                    field.value === subject.subjectId
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                >
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                {subject.name}
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-sm">
                              科目が見つかりません
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multi-select Subject Type Field */}
            <FormField
              control={form.control}
              name="subjectTypeIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    科目タイプ
                  </FormLabel>
                  <div ref={subjectTypeDropdownRef} className="relative">
                    <div
                      className={`flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ${
                        !isEditing &&
                        selectedSubjectId &&
                        availableSubjectTypes.length > 0
                          ? "cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (
                          !isEditing &&
                          selectedSubjectId &&
                          availableSubjectTypes.length > 0
                        ) {
                          setShowSubjectTypeDropdown(true);
                        }
                      }}
                    >
                      <span
                        className={
                          selectedSubjectTypeIds.length > 0
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {selectedSubjectTypeIds.length > 0
                          ? `${selectedSubjectTypeIds.length} 個の科目タイプを選択`
                          : "科目タイプを選択..."}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ml-2 h-4 w-4 opacity-50"
                      >
                        <path d="m7 15 5 5 5-5"></path>
                        <path d="m7 9 5-5 5 5"></path>
                      </svg>
                    </div>

                    {/* Subject Type Dropdown */}
                    {showSubjectTypeDropdown && !isEditing && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                        {/* Search Field */}
                        <div className="flex items-center border-b p-2">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <Input
                            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            placeholder="科目タイプを検索..."
                            value={subjectTypeSearchTerm}
                            onChange={(e) =>
                              setSubjectTypeSearchTerm(e.target.value)
                            }
                          />
                        </div>

                        {/* Selected Types */}
                        {selectedSubjectTypeIds.length > 0 && (
                          <div className="border-b p-2">
                            <div className="text-sm text-muted-foreground mb-1">
                              選択済み
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {availableSubjectTypes
                                .filter((type) =>
                                  selectedSubjectTypeIds.includes(
                                    type.subjectTypeId
                                  )
                                )
                                .map((type) => (
                                  <div
                                    key={type.subjectTypeId}
                                    className="flex items-center bg-accent rounded-md px-2 py-1 text-sm"
                                  >
                                    {type.name}
                                    <button
                                      type="button"
                                      className="h-4 w-4 p-0 ml-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSubjectTypeSelection(
                                          type.subjectTypeId
                                        );
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Type Checkboxes */}
                        <div className="max-h-[200px] overflow-auto p-1">
                          {filteredSubjectTypes.length > 0 ? (
                            filteredSubjectTypes.map((type) => (
                              <div
                                key={type.subjectTypeId}
                                className="flex items-center rounded-sm px-2 py-1 hover:bg-accent"
                              >
                                <label className="flex items-center w-full cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedSubjectTypeIds.includes(
                                      type.subjectTypeId
                                    )}
                                    onChange={() =>
                                      toggleSubjectTypeSelection(
                                        type.subjectTypeId
                                      )
                                    }
                                    className="mr-2 h-4 w-4 rounded border-gray-300 focus:ring-offset-background"
                                  />
                                  {type.name}
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-sm">
                              {!selectedSubjectId
                                ? "科目を選択すると、選択可能な科目タイプが表示されます"
                                : "科目タイプが見つかりません"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Subject Types Display */}
                  <div className="mt-2">
                    <div className="p-3 border rounded-md flex flex-wrap gap-2 min-h-12">
                      {selectedSubjectTypeIds.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          科目タイプが選択されていません
                        </p>
                      ) : (
                        selectedSubjectTypeIds.map((typeId) => (
                          <div
                            key={typeId}
                            className="flex items-center bg-accent rounded-md px-2 py-1 text-sm"
                          >
                            <span>{getSubjectTypeNameById(typeId)}</span>
                            {!isEditing && (
                              <button
                                type="button"
                                className="h-4 w-4 p-0 ml-1"
                                aria-label="削除"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSubjectType(typeId);
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="メモを入力"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => {
                  // Submit form without waiting for validation/submission
                  if (!form.formState.isValid) {
                    form.handleSubmit(onSubmit)();
                  } else {
                    // If form is already valid, execute submission directly
                    const values = form.getValues();
                    onSubmit(values);
                  }
                }}
              >
                {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
