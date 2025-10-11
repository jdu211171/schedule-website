// src/components/class-type-form-dialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useEffect, useMemo } from "react";

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
import { CLASS_TYPE_DEFAULT_COLORS, classTypeColorClasses, classTypeColorJaLabels, ClassTypeColor, isHexColor, rgba, getContrastText, getHexForClassTypeColor } from "@/lib/class-type-colors";
import { Switch } from "@/components/ui/switch";

// Helper function to check if a class type is a root class type (通常授業, 特別授業)
function isRootClassType(classType: ClassType): boolean {
  // Root class types are those without a parent with specific names
  return (
    !classType.parentId &&
    (classType.name === "通常授業" || classType.name === "特別授業")
  );
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
        color: z.string().max(30).optional().nullable(),
      });
    } else {
      // For non-root types, parentId is required
      return z.object({
        name: z.string().min(1, "名前は必須です").max(100),
        parentId: z.string().min(1, "親授業タイプは必須です"),
        notes: z.string().max(255).optional().nullable(),
        color: z.string().max(30).optional().nullable(),
      });
    }
  }, [isRoot]);

  // Fetch all class types for parent selection
  const { data: allClassTypes } = useAllClassTypes();
  const [colorEnabled, setColorEnabled] = React.useState<boolean>(() => !!classType?.color);

  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: classType?.name || "",
      parentId: classType?.parentId || "",
      notes: classType?.notes ?? "",
      color: classType?.color ?? null,
    },
  });

  useEffect(() => {
    if (classType) {
      form.reset({
        name: classType.name || "",
        parentId: classType.parentId || "",
        notes: classType.notes ?? "",
        color: classType.color ?? null,
      });
      setColorEnabled(!!classType.color);
    } else {
      form.reset({
        name: "",
        parentId: "",
        notes: "",
        color: null,
      });
      setColorEnabled(false);
    }
  }, [classType, form]);

  function onSubmit(values: z.infer<typeof dynamicSchema>) {
    // Close the dialog immediately for better UX
    onOpenChange(false);
    form.reset();

    // Then trigger the mutation
    if (isEditing && classType) {
      if (isRoot) {
        // For root class types, allow notes and color only (name/parent locked)
        updateClassTypeMutation.mutate({
          classTypeId: classType.classTypeId,
          notes: values.notes ?? "",
          color: (values as any).color ?? null,
        });
      } else {
        // For non-root class types, send all fields
        const updatedValues = {
          ...values,
          notes: values.notes ?? "",
          parentId: values.parentId || null,
          color: (values as any).color ?? null,
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
        color: (values as any).color ?? null,
      };
      createClassTypeMutation.mutate(updatedValues);
    }
  }

  // Keep a single source of truth for current hex reflecting palette or custom value
  const selectedColor = form.watch('color');
  const selectedHex = isHexColor(selectedColor)
    ? selectedColor
    : getHexForClassTypeColor(selectedColor);
  // UI control default swatch for the native color input when nothing selected
  const currentHex = selectedHex || '#409eff';

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
            {isEditing ? "授業タイプの編集" : "授業タイプの作成"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Color toggle + palette. Reserved root types: color locked */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => {
                const allTypes = allClassTypes || [];
                const usedColors = new Set(
                  allTypes
                    .filter(t => t.color && (!isEditing || t.classTypeId !== classType?.classTypeId))
                    .map(t => t.color as string)
                );
                // removed: reserved slate for cancelled; now isCancelled uses fixed HEX color
                return (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>色</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">色を設定する</span>
                        <Switch
                          checked={colorEnabled}
                          onCheckedChange={(v) => {
                            setColorEnabled(v);
                            if (!v) field.onChange(null);
                          }}
                        />
                      </div>
                    </div>
                    <FormControl>
                      <div className={`grid grid-cols-2 gap-2 ${(!colorEnabled) ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Exclude 'red' from selectable defaults (reserved for conflicts) */}
                        {CLASS_TYPE_DEFAULT_COLORS.filter((c) => c !== 'red').map((c) => {
                          const disabled = usedColors.has(c);
                          const selected = field.value === c;
                          const cls = classTypeColorClasses[c as ClassTypeColor];
                          return (
                            <button
                              key={c}
                              type="button"
                              className={`h-9 rounded-md border px-2 flex items-center gap-2 ${cls.chipBg} ${cls.chipBorder} ${cls.chipText} ${selected ? 'ring-2 ring-offset-1 ring-primary' : ''} ${(disabled) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                              aria-pressed={selected}
                              onClick={() => {
                                if (disabled || !colorEnabled) return;
                                field.onChange(selected ? null : c);
                              }}
                              title={classTypeColorJaLabels[c as ClassTypeColor]}
                              disabled={disabled || !colorEnabled}
                            >
                              <span className={`inline-block h-4 w-4 rounded-full border ${cls.dot} ${cls.chipBorder}`} />
                              <span className="text-sm">{classTypeColorJaLabels[c as ClassTypeColor]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Custom color picker (HEX) */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>カスタムカラー（HEX）</FormLabel>
                  <FormControl>
                    <div className={`flex flex-col gap-2 ${!colorEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label="カスタムカラー"
                          className="h-9 w-9 rounded border"
                          value={currentHex}
                          onChange={(e) => colorEnabled && field.onChange(e.target.value)}
                        />
                        <input
                          type="text"
                          inputMode="text"
                          placeholder="例: #4f46e5"
                          className="flex-1 h-9 rounded-md border px-2 bg-background"
                          value={currentHex}
                          onChange={(e) => colorEnabled && field.onChange(e.target.value)}
                        />
                      </div>
                      {/* Preview chip showing current selection; hide when no selection */}
                      <CustomColorPreview hex={selectedHex || null} label={
                        (typeof field.value === 'string' && !field.value.startsWith('#') && classTypeColorJaLabels[field.value as ClassTypeColor]) || '選択中の色'
                      } />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      placeholder="授業タイプ名を入力してください"
                      disabled={isRoot}
                      className={isRoot ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                      {...field}
                    />
                  </FormControl>
                  {isRoot && (
                    <p className="text-sm text-muted-foreground">
                      基本授業タイプの名前は変更できません
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
                      親授業タイプ
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="親授業タイプを選択してください" />
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

function CustomColorPreview({ hex, label }: { hex: string | null | undefined; label?: string }) {
  if (!hex || !isHexColor(hex)) {
    return (
      <div className="text-xs text-muted-foreground">カスタム色を選択するとここにプレビューが表示されます</div>
    );
  }
  const bg = rgba(hex, 0.18) || undefined;
  const border = rgba(hex, 0.5) || undefined;
  const textColor = getContrastText(hex) === 'white' ? '#f8fafc' : '#0f172a';
  return (
    <div
      className="inline-flex items-center gap-2 h-8 rounded-md border px-2"
      style={{ backgroundColor: bg, borderColor: border, color: textColor }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full border"
        style={{ backgroundColor: hex, borderColor: border }}
      />
      <span className="text-sm">{label || '選択中の色'}</span>
      <span className="text-xs text-muted-foreground">{hex}</span>
    </div>
  );
}
