//edit-class-session-form.tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// 入力検証のためのスキーマ
const formSchema = z.object({
  id: z.string(),
  teacherName: z.string().min(1, { message: "講師名を入力してください" }),
  studentName: z.string().min(1, { message: "生徒名を入力してください" }),
  subjectName: z.string().min(1, { message: "科目名を入力してください" }),
  classTypeName: z.string().min(1, { message: "授業種類を選択してください" }),
  boothName: z.string().min(1, { message: "ブース名を入力してください" }),
  branchName: z.string().min(1, { message: "支店名を入力してください" }),
  date: z.date({ required_error: "日付を選択してください" }),
  startTime: z.string().min(1, { message: "開始時間を入力してください" }),
  endTime: z.string().min(1, { message: "終了時間を入力してください" }),
  duration: z.number().min(1, { message: "授業時間を入力してください" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClassSession {
  id: string;
  teacherName: string;
  studentName: string;
  subjectName: string;
  classTypeName: string;
  boothName: string;
  branchName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes: string;
}

interface EditClassSessionFormProps {
  session: ClassSession;
  onComplete: () => void;
}

export function EditClassSessionForm({ session, onComplete }: EditClassSessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 仮のクラスタイプのオプション (実際にはAPIから取得する)
  const classTypeOptions = [
    { value: "個人レッスン", label: "個人レッスン" },
    { value: "グループレッスン", label: "グループレッスン" },
    { value: "オンラインレッスン", label: "オンラインレッスン" },
  ];

  // フォームの初期値を設定
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: session.id,
      teacherName: session.teacherName,
      studentName: session.studentName,
      subjectName: session.subjectName,
      classTypeName: session.classTypeName,
      boothName: session.boothName,
      branchName: session.branchName,
      date: new Date(session.date),
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      notes: session.notes || "",
    },
  });

  // UPDATE - Update a class session
  const updateSessionMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      setIsSubmitting(true);
      try {
        // 授業セッションを更新する (Update a class session)
        const formattedValues = {
          ...values,
          date: format(values.date, "yyyy-MM-dd"),
        };

        const response = await fetch(`/api/class-sessions/${values.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedValues),
        });

        if (!response.ok) {
          throw new Error("授業の更新に失敗しました");
        }

        return response.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      onComplete();
    },
  });

  // フォーム送信時の処理
  function onSubmit(values: FormValues) {
    updateSessionMutation.mutate(values);
  }

  // 開始時間が変更されたときに授業時間を計算
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    // 終了時間が開始時間より前の場合は翌日とみなす
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return diffMinutes;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="teacherName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>講師名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>生徒名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subjectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>科目名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="classTypeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>授業種類</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="授業種類を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="boothName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ブース名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branchName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>支店名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>日付</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "yyyy年MM月dd日", { locale: ja })
                      ) : (
                        <span>日付を選択</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date("1900-01-01")}
                    initialFocus
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>開始時間</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type="time"
                      onChange={(e) => {
                        field.onChange(e);
                        const newDuration = calculateDuration(
                          e.target.value,
                          form.getValues("endTime")
                        );
                        form.setValue("duration", newDuration);
                      }}
                    />
                    <Clock className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>終了時間</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type="time"
                      onChange={(e) => {
                        field.onChange(e);
                        const newDuration = calculateDuration(
                          form.getValues("startTime"),
                          e.target.value
                        );
                        form.setValue("duration", newDuration);
                      }}
                    />
                    <Clock className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>授業時間（分）</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled
                />
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
              <FormLabel>備考</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onComplete}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
