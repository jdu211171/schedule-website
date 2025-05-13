"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useStudents } from "@/hooks/useStudentQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useStudentPreferenceSubjectCreate,
  useStudentPreferenceSubjectUpdate,
} from "@/hooks/useStudentPreferenceSubjectMutation";
import { StudentPreferenceSubjectWithRelations } from "@/hooks/useStudentPreferenceSubjectQuery";

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
  subjectTypeId: z
    .string({
      required_error: "科目タイプを選択してください",
    })
    .min(1, "科目タイプを選択してください"),
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
  const createStudentSubjectMutation = useStudentPreferenceSubjectCreate();
  const updateStudentSubjectMutation = useStudentPreferenceSubjectUpdate();

  const isEditing = !!studentSubject;
  const { data: students } = useStudents();
  const { data: subjects } = useSubjects();
  const { data: subjectTypesResponse } = useSubjectTypes();

  const form = useForm<FormValues>({
    resolver: zodResolver(StudentSubjectFormSchema),
    defaultValues: {
      studentId: "",
      subjectId: "",
      subjectTypeId: "",
      notes: "",
    },
    mode: "onSubmit", // Validate on submit
  });

  // Reset form when dialog opens/closes or editing subject changes
  useEffect(() => {
    if (open) {
      if (studentSubject) {
        form.reset({
          studentId: studentSubject.studentPreference.student.studentId,
          subjectId: studentSubject.subjectId,
          subjectTypeId: studentSubject.subjectTypeId,
          notes: studentSubject.notes || "",
        });
      } else {
        form.reset({
          studentId: "",
          subjectId: "",
          subjectTypeId: "",
          notes: "",
        });
      }
    }
  }, [studentSubject, form, open]);

  // Clear form state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      // Don't reset the form here to avoid potential flicker
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

  // Handle form submission with validation first
  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Check form validity first without triggering validation messages
    const isValid = await form.trigger();
    if (!isValid) {
      // Let React Hook Form display the validation errors
      form.handleSubmit(() => {})();
      return;
    }

    // If form is valid, proceed with submission
    setIsSubmitting(true);

    const values = form.getValues();

    // Get the data for optimistic UI
    const selectedStudent = students?.data?.find(
      (s) => s.studentId === values.studentId
    );
    const selectedSubject = subjects?.data?.find(
      (s) => s.subjectId === values.subjectId
    );
    const selectedSubjectType = subjectTypesResponse?.data?.find(
      (st) => st.subjectTypeId === values.subjectTypeId
    );

    // Close the dialog first for better user experience
    onOpenChange(false);

    try {
      if (isEditing && studentSubject) {
        updateStudentSubjectMutation.mutate({
          id: studentSubject.id,
          notes: values.notes,
        });
      } else {
        createStudentSubjectMutation.mutate({
          ...values,
          _studentName: selectedStudent?.name,
          _subjectName: selectedSubject?.name,
          _subjectTypeName: selectedSubjectType?.name,
        });
      }
    } catch (error) {
      console.error("生徒科目割り当ての保存に失敗しました:", error);
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
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>生徒</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="生徒を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {students?.data?.map((student) => (
                          <SelectItem
                            key={student.studentId}
                            value={student.studentId}
                          >
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>科目</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset subject type when subject changes
                        form.setValue("subjectTypeId", "");
                      }}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.data?.map((subject) => (
                          <SelectItem
                            key={subject.subjectId}
                            value={subject.subjectId}
                          >
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subjectTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>科目タイプ</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={
                        isEditing ||
                        !selectedSubjectId ||
                        availableSubjectTypes.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjectTypes.map((type) => (
                          <SelectItem
                            key={type.subjectTypeId}
                            value={type.subjectTypeId}
                          >
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
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
