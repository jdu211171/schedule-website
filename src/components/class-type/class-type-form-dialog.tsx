// src/components/class-type-form-dialog.tsx
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

// Helper function to check if a class type is protected (root level types like 通常授業 and 特別授業)
function isProtectedClassType(classType: ClassType): boolean {
  // Protected class types are root level types (no parent) with specific names
  return !classType.parentId && (classType.name === "通常授業" || classType.name === "特別授業");
}

// Form schema for class type creation/editing
const classTypeFormSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  parentId: z.string().min(1, "親クラスタイプは必須です"),
  notes: z.string().max(255).optional().nullable(),
});

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

  // Check if trying to edit a protected class type
  const isProtected = classType ? isProtectedClassType(classType) : false;

  // Fetch all class types for parent selection
  const { data: allClassTypes } = useAllClassTypes();

  const form = useForm<z.infer<typeof classTypeFormSchema>>({
    resolver: zodResolver(classTypeFormSchema),
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

  function onSubmit(values: z.infer<typeof classTypeFormSchema>) {
    // Ensure the notes field is explicitly included, even if empty
    const updatedValues = {
      ...values,
      notes: values.notes ?? "",
      parentId: values.parentId, // parentId is now required, no need to default to null
    };

    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && classType) {
      updateClassTypeMutation.mutate({
        classTypeId: classType.classTypeId,
        ...updatedValues,
      });
    } else {
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
        {/* Prevent editing protected class types */}
        {isEditing && isProtected ? (
          <div className="p-4 text-center">
            <p className="text-muted-foreground">
              この基本クラスタイプは編集できません。
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">{/* ...existing form content... */}
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    value={field.value}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
