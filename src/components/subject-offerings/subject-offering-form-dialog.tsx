// src/components/subject-offerings/subject-offering-form-dialog.tsx
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
import { Input } from "@/components/ui/input";
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
  useSubjectOfferingCreate,
  useSubjectOfferingUpdate,
} from "@/hooks/useSubjectOfferingMutation";
import {
  subjectOfferingFormSchema,
  subjectOfferingCreateSchema,
  subjectOfferingUpdateSchema,
  type SubjectOfferingFormValues,
} from "@/schemas/subject-offering.schema";
import { SubjectOffering } from "@/hooks/useSubjectOfferingQuery";
import { useSubjects } from "@/hooks/useSubjectQuery";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { useSession } from "next-auth/react";

interface SubjectOfferingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectOffering?: SubjectOffering | null;
}

export function SubjectOfferingFormDialog({
  open,
  onOpenChange,
  subjectOffering,
}: SubjectOfferingFormDialogProps) {
  const createSubjectOfferingMutation = useSubjectOfferingCreate();
  const updateSubjectOfferingMutation = useSubjectOfferingUpdate();
  const { data: session } = useSession();

  // Get current branch for filtering subjects
  const currentBranchId = session?.user?.selectedBranchId;

  const { data: subjectsResponse, isLoading: isSubjectsLoading } = useSubjects({
    limit: 100,
    branchId: currentBranchId || undefined,
  });

  const { data: subjectTypesResponse, isLoading: isSubjectTypesLoading } =
    useSubjectTypes({
      limit: 100,
    });

  const isEditing = !!subjectOffering;

  const form = useForm<SubjectOfferingFormValues>({
    resolver: zodResolver(subjectOfferingFormSchema),
    defaultValues: {
      subjectId: "",
      subjectTypeId: "",
      isActive: true,
      notes: "",
      subjectOfferingId: undefined,
    },
  });

  useEffect(() => {
    if (subjectOffering) {
      form.reset({
        subjectOfferingId: subjectOffering.subjectOfferingId,
        subjectId: subjectOffering.subjectId || "",
        subjectTypeId: subjectOffering.subjectTypeId || "",
        isActive: subjectOffering.isActive ?? true,
        notes: subjectOffering.notes || "",
      });
    } else {
      form.reset({
        subjectId: "",
        subjectTypeId: "",
        isActive: true,
        notes: "",
        subjectOfferingId: undefined,
      });
    }
  }, [subjectOffering, form]);

  function onSubmit(values: SubjectOfferingFormValues) {
    const submissionData = { ...values };

    if (isEditing && subjectOffering) {
      const parsedData = subjectOfferingUpdateSchema.parse({
        ...submissionData,
        subjectOfferingId: subjectOffering.subjectOfferingId,
      });
      updateSubjectOfferingMutation.mutate(parsedData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { subjectOfferingId, ...createValues } = submissionData;
      const parsedData = subjectOfferingCreateSchema.parse(createValues);
      createSubjectOfferingMutation.mutate(parsedData, {
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
            {isEditing ? "科目提供の編集" : "科目提供の作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    科目
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="科目を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectsResponse?.data.map((subject) => (
                        <SelectItem
                          key={subject.subjectId}
                          value={subject.subjectId}
                        >
                          {subject.name}
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
              name="subjectTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    科目タイプ
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="科目タイプを選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectTypesResponse?.data.map((type) => (
                        <SelectItem
                          key={type.subjectTypeId}
                          value={type.subjectTypeId}
                        >
                          {type.name}
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">アクティブ</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      この科目提供を有効にします
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
                  isSubjectsLoading ||
                  isSubjectTypesLoading ||
                  createSubjectOfferingMutation.isPending ||
                  updateSubjectOfferingMutation.isPending
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
