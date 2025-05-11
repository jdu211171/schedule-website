"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubjectCreate, useSubjectUpdate } from "@/hooks/useSubjectMutation";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  CreateSubjectSchema,
  SubjectWithRelations,
} from "@/schemas/subject.schema";

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: SubjectWithRelations | null;
}

type FormValues = z.infer<typeof CreateSubjectSchema>;

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
}: SubjectFormDialogProps) {
  const createSubjectMutation = useSubjectCreate();
  const updateSubjectMutation = useSubjectUpdate();
  const { data: subjectTypesResponse, isLoading: isSubjectTypesLoading } =
    useSubjectTypes();

  const isEditing = !!subject;

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateSubjectSchema),
    defaultValues: {
      name: "",
      notes: "",
      subjectTypeIds: [],
    },
  });

  useEffect(() => {
    if (subject) {
      // When editing, populate the form with existing subject data
      form.reset({
        name: subject.name,
        notes: subject.notes || "",
        // Extract subjectTypeIds from the subject's subjectToSubjectTypes
        subjectTypeIds: subject.subjectToSubjectTypes.map(
          (relation) => relation.subjectTypeId
        ),
      });
    } else {
      // Reset form when creating a new subject
      form.reset({
        name: "",
        notes: "",
        subjectTypeIds: [],
      });
    }
  }, [subject, form]);

  function onSubmit(values: FormValues) {
    // Close the dialog immediately for better UX
    onOpenChange(false);

    // Reset the form
    form.reset();

    // Create a map of subject type IDs to names
    const subjectTypeNames: Record<string, string> = {};

    // If you have access to the selected subject types with their names
    // For example, if studentTypesResponse?.data has the full list
    subjectTypesResponse?.data?.forEach((type) => {
      subjectTypeNames[type.subjectTypeId] = type.name;
    });

    // Then trigger the mutation without waiting, including the names
    if (isEditing && subject) {
      updateSubjectMutation.mutate({
        subjectId: subject.subjectId,
        ...values,
        subjectTypeNames,
      });
    } else {
      createSubjectMutation.mutate({
        ...values,
        subjectTypeNames,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "科目の編集" : "科目の作成"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前</FormLabel>
                  <FormControl>
                    <Input placeholder="科目名を入力してください" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectTypeIds"
              render={() => (
                <FormItem>
                  <FormLabel>科目タイプ（複数選択可）</FormLabel>
                  <Card>
                    <CardContent className="pt-4">
                      <ScrollArea className="h-56 pr-4">
                        {isSubjectTypesLoading ? (
                          <div>読み込み中...</div>
                        ) : (
                          <div className="space-y-2">
                            {subjectTypesResponse?.data.map((type) => (
                              <FormField
                                key={type.subjectTypeId}
                                control={form.control}
                                name="subjectTypeIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={type.subjectTypeId}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            type.subjectTypeId
                                          )}
                                          onCheckedChange={(checked) => {
                                            const currentValues = [
                                              ...(field.value || []),
                                            ];
                                            if (checked) {
                                              if (
                                                !currentValues.includes(
                                                  type.subjectTypeId
                                                )
                                              ) {
                                                field.onChange([
                                                  ...currentValues,
                                                  type.subjectTypeId,
                                                ]);
                                              }
                                            } else {
                                              field.onChange(
                                                currentValues.filter(
                                                  (value) =>
                                                    value !== type.subjectTypeId
                                                )
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {type.name}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
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
                    <Textarea
                      placeholder="メモを入力してください（任意）"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubjectTypesLoading}>
                {isEditing ? "変更を保存" : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
