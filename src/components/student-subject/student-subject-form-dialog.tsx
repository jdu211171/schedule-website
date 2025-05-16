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
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useStudentPreferenceSubjectCreate,
  useStudentPreferenceSubjectUpdate,
} from "@/hooks/useStudentPreferenceSubjectMutation";
import { StudentPreferenceSubjectWithRelations } from "@/hooks/useStudentPreferenceSubjectQuery";
import { Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Create a custom schema that enforces required fields with custom error messages
const StudentSubjectFormSchema = z.object({
  studentId: z
    .string({
      required_error: "生徒を選択してください",
    })
    .min(1, "生徒を選択してください"),
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

type FormValues = z.infer<typeof StudentSubjectFormSchema>;

interface StudentSubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentSubject?: StudentPreferenceSubjectWithRelations | null;
}

export function StudentSubjectFormDialog({
  open,
  onOpenChange,
  studentSubject,
}: StudentSubjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createStudentSubjectMutation = useStudentPreferenceSubjectCreate();
  const updateStudentSubjectMutation = useStudentPreferenceSubjectUpdate();

  // Searchable select states
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

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

  const isEditing = !!studentSubject;
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    limit: 20,
  });
  const { data: subjects } = useSubjects();
  const { data: subjectTypesResponse } = useSubjectTypes();

  // Log students data to debug
  console.log("Raw students data:", studentsData);

  // Extract the actual students array from the response
  const students = studentsData?.data || [];
  console.log("Extracted students:", students);

  const form = useForm<FormValues>({
    resolver: zodResolver(StudentSubjectFormSchema),
    defaultValues: {
      studentId: "",
      subjectId: "",
      subjectTypeIds: [],
      notes: "",
    },
    mode: "onSubmit", // Validate on submit
  });

  // Set form values when editing
  useEffect(() => {
    if (studentSubject && open) {
      form.reset({
        studentId: studentSubject.studentPreference.student.studentId,
        subjectId: studentSubject.subjectId,
        subjectTypeIds: [studentSubject.subjectTypeId],
        notes: studentSubject.notes || "",
      });
      setSelectedSubjectTypeIds([studentSubject.subjectTypeId]);

      // Set search terms based on selected values
      const selectedStudent = students?.find(
        (s) =>
          s.studentId === studentSubject.studentPreference.student.studentId
      );
      if (selectedStudent) {
        setStudentSearchTerm(selectedStudent.name);
      }

      const selectedSubject = subjects?.data?.find(
        (s) => s.subjectId === studentSubject.subjectId
      );
      if (selectedSubject) {
        setSubjectSearchTerm(selectedSubject.name);
      }
    } else if (!studentSubject && open) {
      // Reset form when creating new
      form.reset({
        studentId: "",
        subjectId: "",
        subjectTypeIds: [],
        notes: "",
      });
      setSelectedSubjectTypeIds([]);
      setStudentSearchTerm("");
      setSubjectSearchTerm("");
      setSubjectTypeSearchTerm("");
      setError(null);
    }
  }, [studentSubject, form, open, students, subjects]);

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
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStudentDropdown(false);
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

  // Clear form state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setError(null);
    }
  }, [open]);

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
  const filteredStudents =
    students?.filter(
      (student) =>
        !studentSearchTerm ||
        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
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
  const handleStudentSelect = (student: any) => {
    form.setValue("studentId", student.studentId);
    setStudentSearchTerm(student.name);
    setShowStudentDropdown(false);
  };

  const handleSubjectSelect = (subject: any) => {
    form.setValue("subjectId", subject.subjectId);
    setSelectedSubjectTypeIds([]); // Reset when subject changes
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

  // Handle form submission
  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Check form validity first without triggering validation messages
    const isValid = await form.trigger();
    if (!isValid) {
      // Let React Hook Form display the validation errors
      form.handleSubmit(() => {})();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const values = form.getValues();

      // Get data for optimistic UI
      const selectedStudent = students?.find(
        (s) => s.studentId === values.studentId
      );

      const selectedSubject = subjects?.data?.find(
        (s) => s.subjectId === values.subjectId
      );

      // Prepare subject type names for optimistic UI
      const subjectTypeNames: Record<string, string> = {};
      values.subjectTypeIds.forEach((typeId) => {
        const type = subjectTypesResponse?.data?.find(
          (t) => t.subjectTypeId === typeId
        );
        subjectTypeNames[typeId] = type?.name || "Unknown";
      });

      // Close the dialog first for better user experience
      onOpenChange(false);

      if (isEditing && studentSubject) {
        // When editing, we can only update the notes
        await updateStudentSubjectMutation.mutate({
          id: studentSubject.id,
          notes: values.notes,
        });
      } else {
        // When creating, submit with multiple subject types
        await createStudentSubjectMutation.mutate({
          studentId: values.studentId,
          subjectId: values.subjectId,
          subjectTypeIds: values.subjectTypeIds,
          notes: values.notes,
          _studentName: selectedStudent?.name,
          _subjectName: selectedSubject?.name,
          _subjectTypeNames: subjectTypeNames,
        });
      }
    } catch (error) {
      console.error("生徒科目割り当ての保存に失敗しました:", error);
      setError("生徒科目割り当ての保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Only allow closing if not submitting
        if (!isSubmitting || !newOpen) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "生徒科目割り当ての編集" : "生徒科目割り当ての作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4">
            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {studentsLoading ? (
              <div className="text-center py-2">生徒情報を読み込み中...</div>
            ) : (
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                      生徒
                    </FormLabel>
                    <div ref={studentDropdownRef} className="relative">
                      <div className="flex w-full items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          className="flex-1 h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          placeholder="生徒を検索..."
                          value={studentSearchTerm}
                          onChange={(e) => {
                            setStudentSearchTerm(e.target.value);
                            setShowStudentDropdown(true);
                          }}
                          onFocus={() => setShowStudentDropdown(true)}
                          disabled={isEditing}
                        />
                      </div>

                      {/* Student Dropdown */}
                      {showStudentDropdown && !isEditing && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                          <div className="max-h-[200px] overflow-auto p-1">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.map((student) => (
                                <div
                                  key={student.studentId}
                                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  onClick={() => handleStudentSelect(student)}
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
                                      field.value === student.studentId
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  >
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  {student.name}
                                </div>
                              ))
                            ) : (
                              <div className="py-4 text-center text-sm">
                                生徒が見つかりません
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
            )}

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
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
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
