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
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
// import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useTeacherSubjectCreate,
  useTeacherSubjectUpdate,
} from "@/hooks/useTeacherSubjectMutation";
import { TeacherSubject } from "@prisma/client";
import { CreateTeacherSubjectSchema } from "@/schemas/teacher-subject.schema";
import { fetcher } from "@/lib/fetcher";
import { SubjectType } from "@/schemas/subject-type.schema";

interface TeacherSubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherSubject?: TeacherSubject | null;
}

export function TeacherSubjectFormDialog({
  open,
  onOpenChange,
  teacherSubject,
}: TeacherSubjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [existingRelationships, setExistingRelationships] = useState<TeacherSubject[]>([]);

  const createTeacherSubjectMutation = useTeacherSubjectCreate();
  const updateTeacherSubjectMutation = useTeacherSubjectUpdate();

  const isEditing = !!teacherSubject;
  const { data: teachers } = useTeachers();
  const { data: subjects } = useSubjects();

  console.log(updateTeacherSubjectMutation.error);

  const form = useForm<z.infer<typeof CreateTeacherSubjectSchema>>({
    resolver: zodResolver(CreateTeacherSubjectSchema),
    defaultValues: {
      teacherId: teacherSubject?.teacherId || "",
      subjectId: teacherSubject?.subjectId || "",
      subjectTypeId: teacherSubject?.subjectTypeId || "",
      notes: teacherSubject?.notes || "",
    },
  });

  // Fetch existing relationships for the selected teacher
  useEffect(() => {
    if (selectedTeacher) {
      const fetchExistingRelationships = async () => {
        try {
          const response = await fetcher<{data: TeacherSubject[]}>(`/api/teacher-subjects?teacherId=${selectedTeacher}&limit=100`);
          setExistingRelationships(response.data);
        } catch (error) {
          console.error("Failed to fetch existing relationships:", error);
          setExistingRelationships([]);
        }
      };

      fetchExistingRelationships();
    } else {
      setExistingRelationships([]);
    }
  }, [selectedTeacher]);

  // Update available subject types when selected subject changes
  useEffect(() => {
    if (selectedSubject && subjects?.data) {
      const subject = subjects.data.find(s => s.subjectId === selectedSubject);
      if (subject && subject.subjectToSubjectTypes) {
        // Filter out subject types that already have a relationship with this teacher and subject
        const availableSubjectTypes = subject.subjectToSubjectTypes
          .map(st => st.subjectType)
          .filter((subjectType): subjectType is SubjectType => !!subjectType)
          .filter(subjectType => {
            // If we're editing, allow the current subject type
            if (isEditing && teacherSubject &&
                teacherSubject.subjectId === selectedSubject &&
                teacherSubject.subjectTypeId === (subjectType as SubjectType)?.subjectTypeId) {
              return true;
            }

            // Filter out subject types that already have a relationship
            return !existingRelationships.some(rel =>
              rel.subjectId === selectedSubject &&
              rel.subjectTypeId === (subjectType as SubjectType)?.subjectTypeId
            );
          });

        setSubjectTypes(availableSubjectTypes);
      } else {
        setSubjectTypes([]);
      }
    } else {
      setSubjectTypes([]);
    }
  }, [selectedSubject, subjects?.data, existingRelationships, isEditing, teacherSubject]);

  // Get available subjects (filter out subjects that have all their subject types assigned)
  const getAvailableSubjects = () => {
    if (!subjects?.data) return [];

    return subjects.data.filter(subject => {
      // If we're editing, always include the current subject
      if (isEditing && teacherSubject && teacherSubject.subjectId === subject.subjectId) {
        return true;
      }

      // Check if there are any subject types available for this subject
      if (!subject.subjectToSubjectTypes || subject.subjectToSubjectTypes.length === 0) {
        return false;
      }

      // Check if all subject types for this subject are already assigned to this teacher
      const allTypesAssigned = subject.subjectToSubjectTypes.every(st =>
        existingRelationships.some(rel =>
          rel.subjectId === subject.subjectId &&
          rel.subjectTypeId === st.subjectTypeId
        )
      );

      // Return true if not all types are assigned (meaning there's at least one available)
      return !allTypesAssigned;
    });
  };

  // Watch for changes to form fields
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "teacherId") {
        setSelectedTeacher(value.teacherId || "");
        // Reset subject and subject type when teacher changes
        if (!isEditing) {
          form.setValue("subjectId", "");
          form.setValue("subjectTypeId", "");
        }
      }
      if (name === "subjectId") {
        setSelectedSubject(value.subjectId || "");
        // Reset subject type when subject changes
        if (!isEditing) {
          form.setValue("subjectTypeId", "");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isEditing]);

  async function onSubmit(values: z.infer<typeof CreateTeacherSubjectSchema>) {
    setIsSubmitting(true);
    try {
      if (isEditing && teacherSubject) {
        await updateTeacherSubjectMutation.mutateAsync(values);
      } else {
        await createTeacherSubjectMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("講師科目割り当ての保存に失敗しました:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const availableSubjects = getAvailableSubjects();

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
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>講師</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedTeacher(value);
                      }}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="講師を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.data?.map((teacher) => (
                          <SelectItem
                            key={teacher.teacherId}
                            value={teacher.teacherId}
                          >
                            {teacher.name}
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
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing || !selectedTeacher || availableSubjects.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map((subject) => (
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
                  {selectedTeacher && availableSubjects.length === 0 && (
                    <p className="text-sm text-yellow-600">この講師に対して追加可能な科目がありません</p>
                  )}
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
                      disabled={isEditing || !selectedSubject || subjectTypes.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="科目タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectTypes.map((type) => (
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
                  {selectedSubject && subjectTypes.length === 0 && (
                    <p className="text-sm text-yellow-600">この科目に対して追加可能な科目タイプがありません</p>
                  )}
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
                    <Input placeholder="メモを入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
