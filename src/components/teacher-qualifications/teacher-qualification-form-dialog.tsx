// src/components/teacher-qualifications/teacher-qualification-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTeacherQualificationCreate,
  useTeacherQualificationUpdate,
} from "@/hooks/useTeacherQualificationMutation";
import {
  teacherQualificationFormSchema,
  teacherQualificationCreateSchema,
  teacherQualificationUpdateSchema,
  type TeacherQualificationFormValues,
} from "@/schemas/teacher-qualification.schema";
import { TeacherQualification } from "@/hooks/useTeacherQualificationQuery";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useActiveSubjectOfferings } from "@/hooks/useSubjectOfferingQuery";
import { useSession } from "next-auth/react";

interface TeacherQualificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherQualification?: TeacherQualification | null;
}

export function TeacherQualificationFormDialog({
  open,
  onOpenChange,
  teacherQualification,
}: TeacherQualificationFormDialogProps) {
  const createTeacherQualificationMutation = useTeacherQualificationCreate();
  const updateTeacherQualificationMutation = useTeacherQualificationUpdate();
  const { data: session } = useSession();

  // Get current branch for filtering
  const currentBranchId = session?.user?.selectedBranchId;

  const { data: teachersResponse, isLoading: isTeachersLoading } = useTeachers({
    limit: 100,
  });

  const { data: subjectOfferings, isLoading: isSubjectOfferingsLoading } =
    useActiveSubjectOfferings({
      branchId: currentBranchId || undefined,
    });

  const isEditing = !!teacherQualification;

  const form = useForm<TeacherQualificationFormValues>({
    resolver: zodResolver(teacherQualificationFormSchema),
    defaultValues: {
      teacherId: "",
      subjectOfferingId: "",
      verified: true,
      notes: "",
      qualificationId: undefined,
    },
  });

  useEffect(() => {
    if (teacherQualification) {
      form.reset({
        qualificationId: teacherQualification.qualificationId,
        teacherId: teacherQualification.teacherId || "",
        subjectOfferingId: teacherQualification.subjectOfferingId || "",
        verified: teacherQualification.verified ?? true,
        notes: teacherQualification.notes || "",
      });
    } else {
      form.reset({
        teacherId: "",
        subjectOfferingId: "",
        verified: true,
        notes: "",
        qualificationId: undefined,
      });
    }
  }, [teacherQualification, form]);

  function onSubmit(values: TeacherQualificationFormValues) {
    const submissionData = { ...values };

    if (isEditing && teacherQualification) {
      const parsedData = teacherQualificationUpdateSchema.parse({
        ...submissionData,
        qualificationId: teacherQualification.qualificationId,
      });
      updateTeacherQualificationMutation.mutate(parsedData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { qualificationId, ...createValues } = submissionData;
      const parsedData = teacherQualificationCreateSchema.parse(createValues);
      createTeacherQualificationMutation.mutate(parsedData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "教師資格の編集" : "教師資格の作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    教師
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="教師を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachersResponse?.data.map((teacher) => (
                        <SelectItem
                          key={teacher.teacherId}
                          value={teacher.teacherId}
                        >
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectOfferingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    科目提供
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="科目提供を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectOfferings?.map((offering) => (
                        <SelectItem
                          key={offering.subjectOfferingId}
                          value={offering.subjectOfferingId}
                        >
                          {offering.subjectName} - {offering.subjectTypeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="verified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">認証済み</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      この教師資格を認証済みとしてマークします
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>備考</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="備考を入力してください"
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
                disabled={
                  isTeachersLoading ||
                  isSubjectOfferingsLoading ||
                  createTeacherQualificationMutation.isPending ||
                  updateTeacherQualificationMutation.isPending
                }
              >
                {isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
