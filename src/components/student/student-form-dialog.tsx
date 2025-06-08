"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import {
  Loader2,
  X,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  Settings,
  BookOpen,
  MapPin,
  Save,
  RotateCcw,
  Check,
  Users,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableMultiSelect } from "@/components/admin-schedule/searchable-multi-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EnhancedAvailabilityRegularSelector } from "./enhanced-availability-regular-selector";
import { EnhancedAvailabilityIrregularSelector } from "./enhanced-availability-irregular-selector";

import {
  type StudentCreate,
  type StudentUpdate,
  studentCreateSchema,
  studentUpdateSchema,
  type StudentFormValues,
  createStudentFormSchema,
  userStatusLabels,
} from "@/schemas/student.schema";
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import type { Student } from "@/hooks/useStudentQuery";
import { useAllSubjects } from "@/hooks/useSubjectQuery";
import { useAllSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { useTeachersBySubjectPreference } from "@/hooks/useTeachersBySubjectPreference";
import { useTeachers } from "@/hooks/useTeacherQuery";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface RegularAvailability {
  dayOfWeek:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  timeSlots: TimeSlot[];
  fullDay: boolean;
}
interface IrregularAvailability {
  date:Date;
  timeSlots: TimeSlot[];
  fullDay: boolean;
}

interface StudentSubject {
  subjectId: string;
  subjectTypeIds: string[];
  preferredTeacherIds?: string[];
}

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const createStudentMutation = useStudentCreate();
  const updateStudentMutation = useStudentUpdate();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("basic");

  const { data: branches = [], isLoading: isBranchesLoading } = useAllBranchesOrdered();
  const defaultBranchId = session?.user?.selectedBranchId || branches?.[0]?.branchId;

  const { data: studentTypesResponse, isLoading: isStudentTypesLoading } =
    useStudentTypes();

  // Fetch real data for subjects and subject types
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();

  // Use the selected branch from session instead of first branch
  const isEditing = !!student;
  const isSubmitting =
    createStudentMutation.isPending || updateStudentMutation.isPending;

  // Subject selection state
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string | undefined>(
    undefined
  );
  const [selectedSubjectTypes, setSelectedSubjectTypes] = useState<string[]>(
    []
  );
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Fetch teachers based on selected subject and types
  const { data: availableTeachers = [], isLoading: isLoadingTeachers } = useTeachersBySubjectPreference(
    currentSubject,
    selectedSubjectTypes
  );

  // Fetch all teachers for name resolution when displaying selected subjects
  const { data: allTeachersResponse } = useTeachers({ limit: 1000 });
  const allTeachers = allTeachersResponse?.data || [];

  // Enhanced regular availability state
  const [regularAvailability, setRegularAvailability] = useState<
    RegularAvailability[]
  >([]);
  const [irregularAvailability, setIrregularAvailability] = useState<
    IrregularAvailability[]
  >([]);
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);

  // Local storage key
  const STORAGE_KEY = `student-form-${student?.studentId || "new"}`;

  // Create dynamic schema using student types data for grade year validation
  const studentTypes = studentTypesResponse?.data?.map(type => ({
    studentTypeId: type.studentTypeId,
    maxYears: type.maxYears
  })) || [];

  const dynamicSchema = createStudentFormSchema(studentTypes);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      studentTypeId: undefined,
      gradeYear: undefined,
      lineId: "",
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      email: "",
      branchIds: [],
      studentId: undefined,
    },
  });

  useEffect(() => {
    if (student) {
      const branchIds = student.branches?.map((branch) => branch.branchId) || [];
      // Ensure defaultBranchId is always included
      const branchIdsWithDefault =
        defaultBranchId && !branchIds.includes(defaultBranchId)
          ? [defaultBranchId, ...branchIds]
          : branchIds;
      form.reset({
        studentId: student.studentId,
        name: student.name || "",
        kanaName: student.kanaName || "",
        studentTypeId: student.studentTypeId || undefined,
        gradeYear: student.gradeYear ?? undefined,
        lineId: student.lineId || "",
        notes: student.notes || "",
        status:
          (student.status as
            | "ACTIVE"
            | "SICK"
            | "PERMANENTLY_LEFT") || "ACTIVE",
        username: student.username || "",
        email: student.email || "",
        password: "",
        branchIds: branchIdsWithDefault,
      });

      // Initialize subject preferences if they exist
      if (student.subjectPreferences && student.subjectPreferences.length > 0) {
        setStudentSubjects(student.subjectPreferences);
      } else {
        setStudentSubjects([]);
      }

      // Initialize regular availability if it exists
      const studentWithAvailability = student as Student & {
        regularAvailability?: RegularAvailability[];
        exceptionalAvailability?: {
          date: string;
          timeSlots: {
            id: string;
            startTime: string;
            endTime: string;
          }[];
          fullDay: boolean;
          reason?: string | null;
          notes?: string | null;
        }[];
      };

      if (
        studentWithAvailability.regularAvailability &&
        studentWithAvailability.regularAvailability.length > 0
      ) {
        setRegularAvailability(studentWithAvailability.regularAvailability);
      } else {
        setRegularAvailability([]);
      }

      // Initialize exceptional availability if it exists
      if (
        studentWithAvailability.exceptionalAvailability &&
        studentWithAvailability.exceptionalAvailability.length > 0
      ) {
        // Convert date strings to Date objects
        const irregularAvailabilityData = studentWithAvailability.exceptionalAvailability.map(ea => ({
          date: new Date(ea.date),
          timeSlots: ea.timeSlots,
          fullDay: ea.fullDay
        }));
        setIrregularAvailability(irregularAvailabilityData);
      } else {
        setIrregularAvailability([]);
      }
    } else {
      // For create, default to defaultBranchId only
      form.reset({
        name: "",
        kanaName: "",
        studentTypeId: undefined,
        gradeYear: undefined,
        lineId: "",
        notes: "",
        status: "ACTIVE",
        username: "",
        password: "",
        email: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        studentId: undefined,
      });
      setStudentSubjects([]);
      setRegularAvailability([]);
      setIrregularAvailability([]);
    }
  }, [student, form, defaultBranchId]);

  // Load form data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        form.reset(parsedData.formValues);
        setStudentSubjects(parsedData.studentSubjects || []);
        setRegularAvailability(parsedData.regularAvailability || []);
        setIrregularAvailability(
          (parsedData.irregularAvailability || []).map((item: any) => ({
            ...item,
            date: new Date(item.date),
          }))
        );
      } catch (error) {
        console.error("Failed to parse saved form data:", error);
      }
    }
  }, [STORAGE_KEY, form]);

  // Save form data to localStorage when values change
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formValues,
          studentSubjects,
          regularAvailability,
          irregularAvailability,
        })
      );
    });

    return () => subscription.unsubscribe();
  }, [form, studentSubjects, regularAvailability, irregularAvailability, STORAGE_KEY]);

  // Validate availability data
  useEffect(() => {
    const errors: string[] = [];

    regularAvailability.forEach((dayAvailability) => {
      if (!dayAvailability.fullDay && dayAvailability.timeSlots.length > 0) {
        // Check for overlapping time slots within the same day
        const sortedSlots = [...dayAvailability.timeSlots].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );

        for (let i = 0; i < sortedSlots.length - 1; i++) {
          const current = sortedSlots[i];
          const next = sortedSlots[i + 1];

          if (current.endTime > next.startTime) {
            errors.push(
              `${getDayLabel(
                dayAvailability.dayOfWeek
              )}に重複する時間帯があります`
            );
            break;
          }
        }

        // Check if start time is before end time for each slot
        dayAvailability.timeSlots.forEach((slot) => {
          if (slot.startTime >= slot.endTime) {
            errors.push(
              `${getDayLabel(dayAvailability.dayOfWeek)}の時間帯（${
                slot.startTime
              }-${slot.endTime}）で開始時間が終了時間より後になっています`
            );
          }
        });
      }
    });

    setAvailabilityErrors(errors);
  }, [regularAvailability]);

  function getDayLabel(dayOfWeek: string): string {
    const dayLabels: Record<string, string> = {
      MONDAY: "月曜日",
      TUESDAY: "火曜日",
      WEDNESDAY: "水曜日",
      THURSDAY: "木曜日",
      FRIDAY: "金曜日",
      SATURDAY: "土曜日",
      SUNDAY: "日曜日",
    };
    return dayLabels[dayOfWeek] || dayOfWeek;
  }

  function onSubmit(values: StudentFormValues) {
    // Check for availability errors before submitting
    if (availabilityErrors.length > 0) {
      return;
    }

    const submissionData = { ...values };

    if (
      typeof submissionData.gradeYear === "string" &&
      submissionData.gradeYear === ""
    ) {
      submissionData.gradeYear = undefined;
    } else if (submissionData.gradeYear) {
      submissionData.gradeYear = Number(submissionData.gradeYear);
    }

    // Add student subjects and regular availability to submission data
    submissionData.subjectPreferences = studentSubjects.map((sp) => ({
      ...sp,
      preferredTeacherIds: sp.preferredTeacherIds || [],
    }));

    // Convert regularAvailability to the schema format (already matches the expected format)
    submissionData.regularAvailability = regularAvailability;

    // Prepare exceptional availability data for submission
    if (irregularAvailability.length > 0) {
      const exceptionalAvailabilityData = irregularAvailability.flatMap((item) => {
        if (item.fullDay) {
          // Full day availability
          return [{
            userId: submissionData.studentId || undefined,
            date: item.date,
            fullDay: true,
            type: "EXCEPTION" as const,
            startTime: null as string | null,
            endTime: null as string | null,
            reason: null as string | null,
            notes: null as string | null,
          }];
        } else {
          // Time slot based availability
          return item.timeSlots.map((slot) => ({
            userId: submissionData.studentId || undefined,
            date: item.date,
            fullDay: false,
            type: "EXCEPTION" as const,
            startTime: slot.startTime as string | null,
            endTime: slot.endTime as string | null,
            reason: null as string | null,
            notes: null as string | null,
          }));
        }
      });

      // Add exceptional availability to submission data for backend processing
      (submissionData as any).exceptionalAvailability = exceptionalAvailabilityData;
    }

    if (isEditing && student) {
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      const parsedData = studentUpdateSchema.parse({
        ...submissionData,
        studentId: student.studentId,
      });
      updateStudentMutation.mutate(parsedData as StudentUpdate, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          localStorage.removeItem(STORAGE_KEY);
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { studentId, ...createValues } = submissionData;
      const parsedData = studentCreateSchema.parse(createValues);

      createStudentMutation.mutate(parsedData as StudentCreate, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          localStorage.removeItem(STORAGE_KEY);
        },
      });
    }
  }

  // Handle subject selection
  function handleSubjectChange(subjectId: string) {
    setCurrentSubject(subjectId);
    setSelectedSubjectTypes([]);
    setSelectedTeacherIds([]);
    setIsAllSelected(false);
  }

  // Handle subject type selection
  function handleSubjectTypeToggle(typeId: string) {
    setSelectedSubjectTypes((prev) => {
      if (prev.includes(typeId)) {
        const newSelection = prev.filter((id) => id !== typeId);
        setIsAllSelected(false);
        return newSelection;
      } else {
        const newSelection = [...prev, typeId];
        // Since subject types are independent, check if all types are selected
        setIsAllSelected(
          subjectTypes.length > 0 && newSelection.length === subjectTypes.length
        );
        return newSelection;
      }
    });
    // Reset teacher selection when subject types change
    setSelectedTeacherIds([]);
  }

  // Handle "Select All" toggle
  function handleSelectAllToggle() {
    if (isAllSelected) {
      setSelectedSubjectTypes([]);
      setIsAllSelected(false);
    } else {
      const allTypeIds = subjectTypes.map((type) => type.subjectTypeId);
      setSelectedSubjectTypes(allTypeIds);
      setIsAllSelected(true);
    }
    // Reset teacher selection when subject types change
    setSelectedTeacherIds([]);
  }

  // Handle teacher selection
  function handleTeacherToggle(teacherId: string) {
    setSelectedTeacherIds((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  }

  // Add current subject and selected types
  function addSubjectWithTypes() {
    if (currentSubject && selectedSubjectTypes.length > 0) {
      setStudentSubjects((prev) => {
        // Check if subject already exists
        const existingIndex = prev.findIndex(
          (s) => s.subjectId === currentSubject
        );

        if (existingIndex >= 0) {
          // Update existing subject
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            subjectTypeIds: selectedSubjectTypes,
            preferredTeacherIds: selectedTeacherIds,
          };
          return updated;
        } else {
          // Add new subject
          return [
            ...prev,
            {
              subjectId: currentSubject,
              subjectTypeIds: selectedSubjectTypes,
              preferredTeacherIds: selectedTeacherIds,
            },
          ];
        }
      });

      // Reset selection
      setCurrentSubject(undefined);
      setSelectedSubjectTypes([]);
      setSelectedTeacherIds([]);
      setIsAllSelected(false);
    }
  }

  // Remove a subject
  function removeSubject(subjectId: string) {
    setStudentSubjects((prev) => prev.filter((s) => s.subjectId !== subjectId));
  }

  // Reset the form
  function handleReset() {
    form.reset({
      name: "",
      kanaName: "",
      studentTypeId: undefined,
      gradeYear: undefined,
      lineId: "",
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      email: "",
      branchIds: defaultBranchId ? [defaultBranchId] : [],
      studentId: undefined,
    });
    setStudentSubjects([]);
    setRegularAvailability([]);
    setIrregularAvailability([]);
    setCurrentSubject(undefined);
    setSelectedSubjectTypes([]);
    setSelectedTeacherIds([]);
    setIsAllSelected(false);
    setAvailabilityErrors([]);
    setActiveTab("basic");
    localStorage.removeItem(STORAGE_KEY);
  }

  // Filter branches based on search term
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "生徒情報の編集" : "新しい生徒の作成"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-6 mb-6">
                  <TabsTrigger
                    value="basic"
                    className="flex items-center gap-2 "
                  >
                    <User className="h-4 w-4" />
                    基本情報
                  </TabsTrigger>
                  <TabsTrigger
                    value="account"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    アカウント
                  </TabsTrigger>
                  <TabsTrigger
                    value="subjects"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    科目
                  </TabsTrigger>
                  <TabsTrigger
                    value="availabilityRegular"
                    className="flex items-center gap-2 "
                  >
                    <Clock className="h-4 w-4" />
                    通常時
                  </TabsTrigger>
                  <TabsTrigger
                    value="availabilityIrregular"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    特別時
                  </TabsTrigger>
                  <TabsTrigger
                    value="branches"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    校舎
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                  <TabsContent value="basic" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="h-5 w-5" />
                          基本情報
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                                  名前
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="田中花子"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="kanaName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  カナ
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="タナカハナコ"
                                    className="h-11"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="studentTypeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  生徒タイプ
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="生徒タイプを選択" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {studentTypesResponse?.data.map((type) => (
                                      <SelectItem
                                        key={type.studentTypeId}
                                        value={type.studentTypeId}
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
                            name="gradeYear"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  学年
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="1"
                                    className="h-11"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value =
                                        e.target.value === ""
                                          ? undefined
                                          : Number(e.target.value);
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                ステータス
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="ステータスを選択" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(userStatusLabels).map(
                                    ([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  メールアドレス（任意）
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="student@example.com"
                                    className="h-11"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="lineId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  LINE ID
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="line_id_example"
                                    className="h-11"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                備考
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="特記事項や備考があれば入力してください..."
                                  className="min-h-[80px] resize-none"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="account" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          アカウント情報
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                                ユーザー名
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="student_username"
                                  className="h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel
                                className={`text-sm font-medium ${
                                  isEditing
                                    ? ""
                                    : "after:content-['*'] after:ml-1 after:text-destructive"
                                }`}
                              >
                                パスワード
                                {isEditing ? "（変更する場合のみ）" : ""}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder={
                                    isEditing
                                      ? "新しいパスワードを入力"
                                      : "パスワードを入力"
                                  }
                                  className="h-11"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="subjects" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          科目・科目タイプ・講師選択
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">科目</label>
                            <Select
                              value={currentSubject}
                              onValueChange={handleSubjectChange}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="科目を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem
                                    key={subject.subjectId}
                                    value={subject.subjectId}
                                  >
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium">
                                科目タイプ
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllToggle}
                                className="h-7 text-xs"
                              >
                                {isAllSelected ? "全て解除" : "全て選択"}
                              </Button>
                            </div>

                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-11 w-full justify-between"
                                >
                                  {selectedSubjectTypes.length > 0
                                    ? `${selectedSubjectTypes.length}件選択中`
                                    : "科目タイプを選択"}
                                  <Check
                                    className={`ml-2 h-4 w-4 ${
                                      selectedSubjectTypes.length > 0
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-full p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="検索..." />
                                  <CommandList>
                                    <CommandEmpty>
                                      該当する科目タイプがありません
                                    </CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-auto">
                                      {subjectTypes.map((type) => (
                                        <CommandItem
                                          key={type.subjectTypeId}
                                          onSelect={() =>
                                            handleSubjectTypeToggle(
                                              type.subjectTypeId
                                            )
                                          }
                                          className="flex items-center gap-2"
                                        >
                                          <Checkbox
                                            checked={selectedSubjectTypes.includes(
                                              type.subjectTypeId
                                            )}
                                            className="mr-2"
                                          />
                                          {type.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Teacher selection - only show when subject and types are selected */}
                          {currentSubject && selectedSubjectTypes.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                希望講師（任意）
                              </label>

                              {isLoadingTeachers ? (
                                <div className="flex items-center justify-center h-11 border rounded-lg bg-muted/50">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">
                                    講師を読み込み中...
                                  </span>
                                </div>
                              ) : availableTeachers.length > 0 ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="h-11 w-full justify-between"
                                    >
                                      {selectedTeacherIds.length > 0
                                        ? `${selectedTeacherIds.length}名選択中`
                                        : "希望講師を選択（任意）"}
                                      <Users
                                        className={`ml-2 h-4 w-4 ${
                                          selectedTeacherIds.length > 0
                                            ? "opacity-100"
                                            : "opacity-50"
                                        }`}
                                      />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-full p-0"
                                    align="start"
                                  >
                                    <Command>
                                      <CommandInput placeholder="講師を検索..." />
                                      <CommandList>
                                        <CommandEmpty>
                                          該当する講師がいません
                                        </CommandEmpty>
                                        <CommandGroup className="max-h-64 overflow-auto">
                                          {availableTeachers.map((teacher) => (
                                            <CommandItem
                                              key={teacher.teacherId}
                                              onSelect={() =>
                                                handleTeacherToggle(
                                                  teacher.teacherId
                                                )
                                              }
                                              className="flex items-center gap-2"
                                            >
                                              <Checkbox
                                                checked={selectedTeacherIds.includes(
                                                  teacher.teacherId
                                                )}
                                                className="mr-2"
                                              />
                                              <div className="flex-1">
                                                <div className="font-medium">
                                                  {teacher.name}
                                                </div>
                                                {teacher.kanaName && (
                                                  <div className="text-xs text-muted-foreground">
                                                    {teacher.kanaName}
                                                  </div>
                                                )}
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                                  選択された科目・科目タイプに対応する講師がいません
                                </div>
                              )}

                              {selectedTeacherIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedTeacherIds.map(teacherId => {
                                    const teacher = availableTeachers.find(t => t.teacherId === teacherId);
                                    return teacher ? (
                                      <Badge key={teacherId} variant="secondary">
                                        {teacher.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            onClick={addSubjectWithTypes}
                            disabled={
                              !currentSubject ||
                              selectedSubjectTypes.length === 0
                            }
                            size="sm"
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            科目を追加
                          </Button>
                        </div>

                        {studentSubjects.length > 0 && (
                          <div className="space-y-3 mt-6">
                            <h4 className="text-sm font-medium">
                              選択された科目
                            </h4>
                            <div className="space-y-2">
                              {studentSubjects.map((studentSubject) => {
                                const subject = subjects.find(
                                  (s) =>
                                    s.subjectId === studentSubject.subjectId
                                );
                                const types = subjectTypes.filter((t) =>
                                  studentSubject.subjectTypeIds.includes(
                                    t.subjectTypeId
                                  )
                                );

                                return (
                                  <div
                                    key={studentSubject.subjectId}
                                    className="border rounded-md p-3 bg-muted/10"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="font-medium">
                                        {subject?.name}
                                      </h5>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeSubject(
                                            studentSubject.subjectId
                                          )
                                        }
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-1">
                                        {types.map((type) => (
                                          <Badge
                                            key={type.subjectTypeId}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {type.name}
                                          </Badge>
                                        ))}
                                      </div>
                                      {studentSubject.preferredTeacherIds && studentSubject.preferredTeacherIds.length > 0 && (
                                        <div className="pt-2 border-t">
                                          <div className="text-xs text-muted-foreground mb-1">希望講師:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {studentSubject.preferredTeacherIds.map((teacherId) => {
                                              const teacher = allTeachers.find(t => t.teacherId === teacherId);
                                              return (
                                                <Badge
                                                  key={teacherId}
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  <Users className="h-3 w-3 mr-1" />
                                                  {teacher?.name || teacherId}
                                                </Badge>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="availabilityRegular" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          定期利用可能時間
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          生徒の通常の利用可能時間を曜日ごとに設定してください。各曜日に複数の時間帯を設定することができます。
                          特別な日程については、後で例外設定で管理できます。
                        </p>
                      </CardHeader>
                      <CardContent>
                        {availabilityErrors.length > 0 && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                {availabilityErrors.map((error, index) => (
                                  <div key={index}>{error}</div>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        <EnhancedAvailabilityRegularSelector
                          availability={regularAvailability}
                          onChange={setRegularAvailability}
                        />

                        {isEditing && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  例外的な利用可能時間
                                </p>
                                <p className="text-blue-700 dark:text-blue-300 mt-1">
                                  特定の日付での利用可能時間の変更は、生徒詳細ページの「例外設定」タブで管理できます。
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="availabilityIrregular" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          例外的な利用可能時間
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          特定の日付での利用可能時間を設定してください。各日付に複数の時間帯を設定することができます。
                          ここで設定した例外的な利用可能時間は、通常の利用可能時間より優先されます。
                        </p>
                      </CardHeader>
                      <CardContent>
                        {availabilityErrors.length > 0 && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                {availabilityErrors.map((error, index) => (
                                  <div key={index}>{error}</div>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        <EnhancedAvailabilityIrregularSelector
                          availability={irregularAvailability}
                          onChange={setIrregularAvailability}
                        />

                        {isEditing && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  例外的な利用可能時間の管理
                                </p>
                                <p className="text-blue-700 dark:text-blue-300 mt-1">
                                  保存後、より詳細な例外的な利用可能時間の管理は、生徒詳細ページの「例外設定」タブで行うことができます。
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="branches" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          校舎配属
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="branchIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                                所属校舎（複数選択可）
                              </FormLabel>
                              <FormControl>
                                <div className="mb-6">
                                  <SearchableMultiSelect
                                    value={field.value || []}
                                    onValueChange={field.onChange}
                                    items={branches.map((branch) => ({
                                      value: branch.branchId,
                                      label: branch.name,
                                    }))}
                                    placeholder="校舎を選択してください"
                                    searchPlaceholder="校舎名を検索..."
                                    emptyMessage="該当する校舎が見つかりません"
                                    loading={isBranchesLoading}
                                    disabled={isBranchesLoading}
                                    defaultValues={defaultBranchId ? [defaultBranchId] : []}
                                    renderSelectedBadge={(item, isDefault, onRemove) => (
                                      <Badge
                                        key={item.value}
                                        variant={isDefault ? "default" : "secondary"}
                                        className="flex items-center gap-1 px-3 py-1"
                                      >
                                        <span>{item.label}</span>
                                        {isDefault && (
                                          <span className="text-xs">(デフォルト)</span>
                                        )}
                                        {!isDefault && onRemove && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                                            onClick={onRemove}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </Badge>
                                    )}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                              {defaultBranchId && (
                                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                                  💡
                                  デフォルト校舎は自動的に選択され、削除することはできません
                                </p>
                              )}
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              リセット
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={
                isBranchesLoading ||
                isStudentTypesLoading ||
                isSubmitting ||
                availabilityErrors.length > 0
              }
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? "保存中..." : "作成中..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "変更を保存" : "生徒を作成"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
