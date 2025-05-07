import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateRegularClassTemplateSchema } from "@/schemas/regular-class-template.schema";
import { Form } from "../ui/form";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../ui/form";
import { RegularClassTemplateWithRelations } from "@/hooks/useRegularClassTemplateQuery";
import { useRegularClassTemplateUpdate } from "@/hooks/useRegularClassTemplateMutation";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useStudents } from "@/hooks/useStudentQuery";
import { z } from "zod";

type MatchingFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  template: RegularClassTemplateWithRelations | null;
};

export function MatchingFormDialog({
  isOpen,
  onOpenChange,
  template = null,
}: MatchingFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateTemplateMutation = useRegularClassTemplateUpdate();
  const { data: teachers } = useTeachers();
  const { data: students } = useStudents();

  const form = useForm({
    resolver: zodResolver(UpdateRegularClassTemplateSchema),
    defaultValues: {
      dayOfWeek: template?.dayOfWeek ?? "MONDAY",
      startTime: template?.startTime
        ? template.startTime.toISOString()
        : undefined,
      endTime: template?.endTime.toISOString() ?? "",
      startDate: template?.startDate?.toISOString() ?? undefined,
      endDate: template?.endDate?.toISOString() ?? undefined,
      teacherId: template?.teacherId ?? "",
      subjectId: template?.subjectId ?? "",
      boothId: template?.boothId ?? undefined,
      studentIds:
        template?.templateStudentAssignments?.map((e) => e.studentId) ?? [],
      notes: template?.notes ?? "",
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime?.toISOString(),
        endTime: template.endTime?.toISOString(),
        startDate: template.startDate?.toISOString(),
        endDate: template.endDate?.toISOString(),
        teacherId: template.teacherId,
        subjectId: template.subjectId,
        boothId: template.boothId,
        studentIds:
          template.templateStudentAssignments?.map((e) => e.studentId) ?? [],
        notes: template.notes ?? "",
      });
    }
  }, [template, form]);

  async function onSubmit(
    values: z.infer<typeof UpdateRegularClassTemplateSchema>
  ) {
    setIsSubmitting(true);
    try {
      await updateTemplateMutation.mutateAsync({
        ...values,
        templateId: template?.templateId ?? "",
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error updating template:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>通常授業テンプレートの更新</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>曜日</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="曜日を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONDAY">月曜日</SelectItem>
                        <SelectItem value="TUESDAY">火曜日</SelectItem>
                        <SelectItem value="WEDNESDAY">水曜日</SelectItem>
                        <SelectItem value="THURSDAY">木曜日</SelectItem>
                        <SelectItem value="FRIDAY">金曜日</SelectItem>
                        <SelectItem value="SATURDAY">土曜日</SelectItem>
                        <SelectItem value="SUNDAY">日曜日</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>開始時間</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
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
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>講師</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
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
              name="studentIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>生徒</FormLabel>
                  <FormControl>
                    <select
                      onChange={(e) =>
                        field.onChange(
                          Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          )
                        )
                      }
                      value={field.value || []}
                      className="border rounded p-2 w-full"
                    >
                      {students?.data?.map((student) => (
                        <option
                          key={student.studentId}
                          value={student.studentId}
                        >
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>開始日</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>終了日</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || undefined)
                      }
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
                    <Textarea placeholder="備考を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "更新中..." : "更新"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
