// src/components/class-type-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useMemo } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useClassTypeCreate,
  useClassTypeUpdate,
} from "@/hooks/useClassTypeMutation";
import { ClassType, useAllClassTypes } from "@/hooks/useClassTypeQuery";

// Helper function to check if a class type is a root class type (通常授業 and 特別授業)
function isRootClassType(classType: ClassType): boolean {
  // Root class types are those without a parent with specific names
  return !classType.parentId && (classType.name === "通常授業" || classType.name === "特別授業");
}

interface ClassTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classType?: ClassType | null;
}

export function ClassTypeFormDialog({
                                      open,
                                      onOpenChange,
                                      classType,
                                    }: ClassTypeFormDialogProps) {
  const createClassTypeMutation = useClassTypeCreate();
  const updateClassTypeMutation = useClassTypeUpdate();
  const isEditing = !!classType;

  // Check if editing a root class type (通常授業 or 特別授業)
  const isRoot = classType ? isRootClassType(classType) : false;

  // Create dynamic schema based on whether it's a root type
  const dynamicSchema = useMemo(() => {
    if (isRoot) {
      // For root types, parentId is not required
      return z.object({
        name: z.string().min(1, "名前は必須です").max(100),
        parentId: z.string().optional().nullable(),
        notes: z.string().max(255).optional().nullable(),
      });
    } else {
      // For non-root types, parentId is required
      return z.object({
        name: z.string().min(1, "名前は必須です").max(100),
        parentId: z.string().min(1, "親クラスタイプは必須です"),
        notes: z.string().max(255).optional().nullable(),
      });
    }
  }, [isRoot]);

  // Fetch all class types for parent selection
  const { data: allClassTypes } = useAllClassTypes();

  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: classType?.name || "",
      parentId: classType?.parentId || "",
      notes: classType?.notes ?? "",
    },
  });

  useEffect(() => {
    if (classType) {
      form.reset({
        name: classType.name || "",
        parentId: classType.parentId || "",
        notes: classType.notes ?? "",
      });
    } else {
      form.reset({
        name: "",
        parentId: "",
        notes: "",
      });
    }
  }, [classType, form]);

  function onSubmit(values: z.infer<typeof dynamicSchema>) {
    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && classType) {
      if (isRoot) {
        // For root class types, only send notes field
        updateClassTypeMutation.mutate({
          classTypeId: classType.classTypeId,
          notes: values.notes ?? "",
        });
      } else {
        // For non-root class types, send all fields
        const updatedValues = {
          ...values,
          notes: values.notes ?? "",
          parentId: values.parentId || null,
        };
        updateClassTypeMutation.mutate({
          classTypeId: classType.classTypeId,
          ...updatedValues,
        });
      }
    } else {
      // For creating new class types
      const updatedValues = {
        ...values,
        notes: values.notes ?? "",
        parentId: values.parentId || null,
      };
      createClassTypeMutation.mutate(updatedValues);
    }
  }

  // Get available parent options - only show root class types (通常授業 and 特別授業)
  // and exclude current item when editing
  const parentOptions = (allClassTypes || []).filter(
    (type) => {
      // Only include root class types (those without a parent) - these should be 通常授業 and 特別授業
      const isRoot = !type.parentId;
      // Exclude current item when editing to prevent circular references
      const isNotCurrentItem = !isEditing || type.classTypeId !== classType?.classTypeId;
      return isRoot && isNotCurrentItem;
    }
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when dialog is closed
          form.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "クラスタイプの編集" : "クラスタイプの作成"}
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
                      placeholder="クラスタイプ名を入力してください"
                      disabled={isRoot}
                      className={isRoot ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                      {...field}
                    />
                  </FormControl>
                  {isRoot && (
                    <p className="text-sm text-muted-foreground">
                      基本クラスタイプの名前は変更できません
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show parent selection for non-root class types */}
            {!isRoot && (
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="after:content-['*'] after:ml-1 after:text-destructive">
                      親クラスタイプ
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="親クラスタイプを選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parentOptions.map((type) => (
                          <SelectItem key={type.classTypeId} value={type.classTypeId}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
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
                      value={field.value ?? ""} // Ensure value is never null
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">{isEditing ? "変更を保存" : "作成"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
