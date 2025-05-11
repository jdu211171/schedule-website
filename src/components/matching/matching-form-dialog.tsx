import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { FieldErrors, useForm } from "react-hook-form";
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
import { toast } from "sonner";

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
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const updateTemplateMutation = useRegularClassTemplateUpdate();
  const { data: teachers } = useTeachers();
  const { data: students = [] } = useStudents();
  const isSubmitting = updateTemplateMutation.isPending;

  const studentList = Array.isArray(students) ? students : students?.data ?? [];

  const formatDateInput = (date: string | Date | undefined | null) => {
    if (!date) return "";
    if (typeof date === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      if (/^\d{4}-\d{2}-\d{2}T/.test(date)) return date.slice(0, 10);
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return "";
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
    return "";
  };

  const formatTimeInput = (time: string | Date | undefined | null) => {
    if (!time) return "";
    if (typeof time === "string") {
      const parsedTime = new Date(time);
      if (!isNaN(parsedTime.getTime())) {
        return parsedTime.toISOString().slice(11, 16); // Extract HH:mm
      }
      return time; // Return as-is if parsing fails
    }
    if (time instanceof Date && !isNaN(time.getTime())) {
      return time.toISOString().slice(11, 16); // Extract HH:mm
    }
    return "";
  };

  const form = useForm({
    resolver: zodResolver(UpdateRegularClassTemplateSchema),
    defaultValues: {
      templateId: template?.templateId ?? "",
      dayOfWeek: template?.dayOfWeek ?? "MONDAY",
      startTime: formatTimeInput(template?.startTime),
      endTime: formatTimeInput(template?.endTime),
      startDate: formatDateInput(template?.startDate),
      endDate: formatDateInput(template?.endDate),
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
        templateId: template.templateId,
        dayOfWeek: template.dayOfWeek,
        startTime: formatTimeInput(template.startTime),
        endTime: formatTimeInput(template.endTime),
        startDate: formatDateInput(template.startDate),
        endDate: formatDateInput(template.endDate),
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
    console.log("hello");
    try {
      await updateTemplateMutation.mutateAsync({
        ...values,
        templateId: template?.templateId ?? "",
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error updating template:", error);
    }
  }

  function onFormInvalid(
    error: FieldErrors<z.infer<typeof UpdateRegularClassTemplateSchema>>
  ) {
    toast.error("エラーが発生しました", {
      description: Object.values(error)
        .map((e) => e.message)
        .join(", "),
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>通常授業テンプレートの更新</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onFormInvalid)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>テンプレートID</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      onValueChange={(value) => field.onChange(value || "")}
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
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="生徒を検索..."
                        className="w-full"
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value);
                          setShowStudentDropdown(e.target.value.trim() !== "");
                        }}
                        onFocus={() => {
                          if (studentSearchTerm.trim() !== "") {
                            setShowStudentDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowStudentDropdown(false), 200);
                        }}
                      />
                    </FormControl>
                    {showStudentDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {studentList
                          .filter((student) =>
                            student.name
                              .toLowerCase()
                              .includes(studentSearchTerm.toLowerCase())
                          )
                          .map((student) => (
                            <div
                              key={student.studentId}
                              className="p-2 hover:bg-accent cursor-pointer"
                              onClick={() => {
                                const currentValues = field.value || [];
                                if (
                                  !currentValues.includes(student.studentId)
                                ) {
                                  field.onChange([
                                    ...currentValues,
                                    student.studentId,
                                  ]);
                                }
                                setStudentSearchTerm("");
                                setShowStudentDropdown(false);
                              }}
                            >
                              {student.name}
                            </div>
                          ))}
                        {studentList.filter((student) =>
                          student.name
                            .toLowerCase()
                            .includes(studentSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="p-2 text-muted-foreground">
                            該当する学生が見つかりません
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(field.value || []).map((studentId, index) => {
                      const student = studentList.find(
                        (s) => s.studentId === studentId
                      );
                      return (
                        <div
                          key={index}
                          className="flex items-center bg-accent rounded-md px-2 py-1"
                        >
                          <span>{student ? student.name : studentId}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => {
                              const newValues = [...(field.value || [])];
                              newValues.splice(index, 1);
                              field.onChange(newValues);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
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
