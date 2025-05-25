// src/components/subject-types/subject-type-form-dialog.tsx
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
import {
  useSubjectTypeCreate,
  useSubjectTypeUpdate,
} from "@/hooks/useSubjectTypeMutation";
import {
  subjectTypeFormSchema,
  subjectTypeCreateSchema,
  subjectTypeUpdateSchema,
  type SubjectTypeFormValues,
} from "@/schemas/subject-type.schema";
import { SubjectType } from "@/hooks/useSubjectTypeQuery";

interface SubjectTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectType?: SubjectType | null;
}

export function SubjectTypeFormDialog({
  open,
  onOpenChange,
  subjectType,
}: SubjectTypeFormDialogProps) {
  const createSubjectTypeMutation = useSubjectTypeCreate();
  const updateSubjectTypeMutation = useSubjectTypeUpdate();

  const isEditing = !!subjectType;

  const form = useForm<SubjectTypeFormValues>({
    resolver: zodResolver(subjectTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      subjectTypeId: undefined,
    },
  });

  useEffect(() => {
    if (subjectType) {
      form.reset({
        subjectTypeId: subjectType.subjectTypeId,
        name: subjectType.name || "",
        description: subjectType.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        subjectTypeId: undefined,
      });
    }
  }, [subjectType, form]);

  function onSubmit(values: SubjectTypeFormValues) {
    const submissionData = { ...values };

    if (isEditing && subjectType) {
      const parsedData = subjectTypeUpdateSchema.parse({
        ...submissionData,
        subjectTypeId: subjectType.subjectTypeId,
      });
      updateSubjectTypeMutation.mutate(parsedData, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { subjectTypeId, ...createValues } = submissionData;
      const parsedData = subjectTypeCreateSchema.parse(createValues);
      createSubjectTypeMutation.mutate(parsedData, {
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
            {isEditing ? "科目タイプの編集" : "科目タイプの作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                    名前
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="科目タイプ名を入力してください"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="説明を入力してください"
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
                  createSubjectTypeMutation.isPending ||
                  updateSubjectTypeMutation.isPending
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
