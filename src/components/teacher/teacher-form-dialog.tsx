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
  MessageSquare,
  Cake,
  Phone,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  type TeacherCreate,
  type TeacherUpdate,
  teacherCreateSchema,
  teacherUpdateSchema,
  type TeacherFormValues,
  teacherFormSchema,
  userStatusLabels,
} from "@/schemas/teacher.schema";
import { useTeacherCreate, useTeacherUpdate } from "@/hooks/useTeacherMutation";
import type { Teacher } from "@/hooks/useTeacherQuery";
import { useAllSubjects } from "@/hooks/useSubjectQuery";
import { useAllSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { EnhancedAvailabilityRegularSelector } from "../student/enhanced-availability-regular-selector";
import { EnhancedAvailabilityIrregularSelector } from "../student/enhanced-availability-irregular-selector";
import { SearchableMultiSelect } from "@/components/admin-schedule/searchable-multi-select";
import { useAllBranchesOrdered } from "@/hooks/useBranchQuery";
import { EnhancedStateButton } from "../ui/enhanced-state-button";
import { LineLinking } from "@/components/shared/line-linking";
import { LineManagementDialog } from "@/components/shared/line-management-dialog";

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
  date: Date;
  timeSlots: TimeSlot[];
  fullDay: boolean;
}

interface TeacherSubject {
  subjectId: string;
  subjectTypeIds: string[];
}

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherFormDialogProps) {
  const [openLineManage, setOpenLineManage] = useState(false);
  // Local LINE connection state for immediate UI reflection
  const [lineState, setLineState] = useState({
    lineId: teacher?.lineId ?? null,
    lineUserId: teacher?.lineUserId ?? null,
    lineNotificationsEnabled: teacher?.lineNotificationsEnabled ?? true,
  });
  const createTeacherMutation = useTeacherCreate();
  const updateTeacherMutation = useTeacherUpdate();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("basic");

  const { data: branches = [], isLoading: isBranchesLoading } =
    useAllBranchesOrdered();

  const defaultBranchId =
    session?.user?.selectedBranchId || branches?.[0]?.branchId;

  // Fetch real data for subjects and subject types
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();

  const isEditing = !!teacher;
  const isSubmitting =
    createTeacherMutation.isPending || updateTeacherMutation.isPending;

  // Keep dialog open only when editing, close on create
  const keepDialogOpen = isEditing;

  // Subject selection state
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string | undefined>(
    undefined
  );
  const [selectedSubjectTypes, setSelectedSubjectTypes] = useState<string[]>(
    []
  );
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Enhanced regular availability state
  const [regularAvailability, setRegularAvailability] = useState<
    RegularAvailability[]
  >([]);
  const [irregularAvailability, setIrregularAvailability] = useState<
    IrregularAvailability[]
  >([]);
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      email: "",
      lineUserId: "",
      lineNotificationsEnabled: true,
      notes: "",
      birthDate: undefined,
      phoneNumber: "",
      phoneNotes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      branchIds: [],
      teacherId: undefined,
    },
  });

  useEffect(() => {
    if (teacher) {
      setLineState({
        lineId: teacher.lineId ?? null,
        lineUserId: teacher.lineUserId ?? null,
        lineNotificationsEnabled: teacher.lineNotificationsEnabled ?? true,
      });
      const branchIds =
        teacher.branches?.map((branch) => branch.branchId) || [];
      // Ensure defaultBranchId is always included
      const branchIdsWithDefault =
        defaultBranchId && !branchIds.includes(defaultBranchId)
          ? [defaultBranchId, ...branchIds]
          : branchIds;
      form.reset({
        teacherId: teacher.teacherId,
        name: teacher.name || "",
        kanaName: teacher.kanaName || "",
        email: teacher.email || "",
        lineUserId: teacher.lineUserId || "",
        lineNotificationsEnabled: teacher.lineNotificationsEnabled ?? true,
        notes: teacher.notes || "",
        status:
          (teacher.status as "ACTIVE" | "SICK" | "PERMANENTLY_LEFT") ||
          "ACTIVE",
        username: teacher.username || "",
        password: "",
        branchIds: branchIdsWithDefault,
        birthDate: teacher.birthDate ? new Date(teacher.birthDate) : undefined,
        phoneNumber: teacher.phoneNumber || "",
        phoneNotes: teacher.phoneNotes || "",
      });

      // Initialize subject preferences if they exist
      if (teacher.subjectPreferences && teacher.subjectPreferences.length > 0) {
        setTeacherSubjects(teacher.subjectPreferences);
      } else {
        setTeacherSubjects([]);
      }

      // Initialize regular availability if it exists
      // Note: regularAvailability is not currently included in the Teacher type
      // This would need to be added to the API response and Teacher type
      const teacherWithAvailability = teacher as Teacher & {
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
        teacherWithAvailability.regularAvailability &&
        teacherWithAvailability.regularAvailability.length > 0
      ) {
        setRegularAvailability(teacherWithAvailability.regularAvailability);
      } else {
        setRegularAvailability([]);
      }

      // Initialize exceptional availability if it exists
      if (
        teacherWithAvailability.exceptionalAvailability &&
        teacherWithAvailability.exceptionalAvailability.length > 0
      ) {
        // Convert date strings to Date objects
        const irregularAvailabilityData =
          teacherWithAvailability.exceptionalAvailability.map((ea) => ({
            date: new Date(ea.date),
            timeSlots: ea.timeSlots,
            fullDay: ea.fullDay,
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
        email: "",
        lineUserId: "",
        notes: "",
        status: "ACTIVE",
        username: "",
        password: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        teacherId: undefined,
        birthDate: undefined,
        phoneNumber: "",
        phoneNotes: "",
      });
      setTeacherSubjects([]);
      setRegularAvailability([]);
      setIrregularAvailability([]);
      setLineState({ lineId: null, lineUserId: null, lineNotificationsEnabled: true });
    }
  }, [teacher, form, defaultBranchId]);

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

  function onSubmit(values: TeacherFormValues) {
    // Check for availability errors before submitting
    if (availabilityErrors.length > 0) {
      return;
    }

    const submissionData = { ...values };

    // Add teacher subjects and regular availability to submission data
    submissionData.subjectPreferences = teacherSubjects;

    // Convert regularAvailability to the schema format (already matches the expected format)
    submissionData.regularAvailability = regularAvailability;

    // Add exceptional availability data if it exists
    if (irregularAvailability.length > 0) {
      const exceptionalAvailabilityData = irregularAvailability.flatMap(
        (item) => {
          if (item.fullDay) {
            // Full day availability
            return [
              {
                userId: submissionData.teacherId || undefined,
                date: item.date, // Keep as Date object
                fullDay: true,
                type: "EXCEPTION" as const,
                startTime: null as string | null,
                endTime: null as string | null,
                reason: null as string | null,
                notes: null as string | null,
              },
            ];
          } else {
            // Time slot based availability
            return item.timeSlots.map((slot) => ({
              userId: submissionData.teacherId || undefined,
              date: item.date, // Keep as Date object
              fullDay: false,
              type: "EXCEPTION" as const,
              startTime: slot.startTime as string | null,
              endTime: slot.endTime as string | null,
              reason: null as string | null,
              notes: null as string | null,
            }));
          }
        }
      );
      submissionData.exceptionalAvailability = exceptionalAvailabilityData;
    }

    if (isEditing && teacher) {
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      const parsedData = teacherUpdateSchema.parse({
        ...submissionData,
        teacherId: teacher.teacherId,
      });
      updateTeacherMutation.mutate(parsedData as TeacherUpdate, {
        onSuccess: () => {
          if (!keepDialogOpen) {
            onOpenChange(false);
          }
          if (!keepDialogOpen) {
            form.reset();
          }
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { teacherId, ...createValues } = submissionData;
      const parsedData = teacherCreateSchema.parse(createValues);
      createTeacherMutation.mutate(parsedData as TeacherCreate, {
        onSuccess: () => {
          if (!keepDialogOpen) {
            onOpenChange(false);
          }
          if (!keepDialogOpen) {
            form.reset();
          }
        },
      });
    }
  }

  // Enhanced state button async handler
  const handleEnhancedSubmit = async () => {
    const isValid = await form.trigger();
    if (!isValid || availabilityErrors.length > 0) {
      throw new Error("フォームの入力内容に問題があります");
    }

    return new Promise<void>((resolve, reject) => {
      const values = form.getValues();
      const submissionData = { ...values };

      // Add teacher subjects and regular availability to submission data
      submissionData.subjectPreferences = teacherSubjects;
      submissionData.regularAvailability = regularAvailability;

      // Add exceptional availability data if it exists
      if (irregularAvailability.length > 0) {
        const exceptionalAvailabilityData = irregularAvailability.flatMap(
          (item) => {
            if (item.fullDay) {
              return [
                {
                  userId: submissionData.teacherId || undefined,
                  date: item.date,
                  fullDay: true,
                  type: "EXCEPTION" as const,
                  startTime: null as string | null,
                  endTime: null as string | null,
                  reason: null as string | null,
                  notes: null as string | null,
                },
              ];
            } else {
              return item.timeSlots.map((slot) => ({
                userId: submissionData.teacherId || undefined,
                date: item.date,
                fullDay: false,
                type: "EXCEPTION" as const,
                startTime: slot.startTime as string | null,
                endTime: slot.endTime as string | null,
                reason: null as string | null,
                notes: null as string | null,
              }));
            }
          }
        );
        submissionData.exceptionalAvailability = exceptionalAvailabilityData;
      }

      if (isEditing && teacher) {
        if (!submissionData.password || submissionData.password === "") {
          delete submissionData.password;
        }
        const parsedData = teacherUpdateSchema.parse({
          ...submissionData,
          teacherId: teacher.teacherId,
        });
        updateTeacherMutation.mutate(parsedData as TeacherUpdate, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { teacherId, ...createValues } = submissionData;
        const parsedData = teacherCreateSchema.parse(createValues);
        createTeacherMutation.mutate(parsedData as TeacherCreate, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      }
    });
  };

  // Handle subject selection
  function handleSubjectChange(subjectId: string) {
    setCurrentSubject(subjectId);
    setSelectedSubjectTypes([]);
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
  }

  // Add current subject and selected types
  function addSubjectWithTypes() {
    if (currentSubject && selectedSubjectTypes.length > 0) {
      setTeacherSubjects((prev) => {
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
          };
          return updated;
        } else {
          // Add new subject
          return [
            ...prev,
            {
              subjectId: currentSubject,
              subjectTypeIds: selectedSubjectTypes,
            },
          ];
        }
      });

      // Reset selection
      setCurrentSubject(undefined);
      setSelectedSubjectTypes([]);
      setIsAllSelected(false);
    }
  }

  // Remove a subject
  function removeSubject(subjectId: string) {
    setTeacherSubjects((prev) => prev.filter((s) => s.subjectId !== subjectId));
  }

  // Reset the form
  function handleReset() {
    form.reset({
      name: "",
      kanaName: "",
      email: "",
      lineUserId: "",
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      branchIds: defaultBranchId ? [defaultBranchId] : [],
      teacherId: undefined,
      birthDate: undefined,
      phoneNumber: "",
      phoneNotes: "",
    });
    setTeacherSubjects([]);
    setRegularAvailability([]);
    setIrregularAvailability([]);
    setCurrentSubject(undefined);
    setSelectedSubjectTypes([]);
    setIsAllSelected(false);
    setAvailabilityErrors([]);
    setActiveTab("basic");
  }

  // Enhanced button presets
  const saveButtonPresets = {
    create: {
      defaultState: { label: "講師を作成", icon: Save },
      loadingState: { label: "作成中...", icon: Loader2 },
      successState: { label: "作成完了!", icon: Check },
      errorState: { label: "作成失敗", icon: X },
    },
    update: {
      defaultState: { label: "変更を保存", icon: Save },
      loadingState: { label: "保存中...", icon: Loader2 },
      successState: { label: "保存完了!", icon: Check },
      errorState: { label: "保存失敗", icon: X },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "講師情報の編集" : "新しい講師の作成"}
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
                <TabsList className="grid w-full grid-cols-7 mb-6">
                  <TabsTrigger
                    value="basic"
                    className="flex items-center gap-2"
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
                    value="line"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    メッセージ
                  </TabsTrigger>
                  <TabsTrigger
                    value="subjects"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    科目
                  </TabsTrigger>
                  <TabsTrigger
                    value="availability"
                    className="flex items-center gap-2"
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
                                    placeholder="山田太郎"
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
                                    placeholder="ヤマダタロウ"
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
                                    placeholder="teacher@example.com"
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
                            name="lineUserId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  LINEユーザーID（任意）
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="LINEユーザーIDを入力"
                                    className="h-11"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  LINEアカウントでログインや連携に使用されます
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                        </div>

                        {/* Personal Information */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <Cake className="h-4 w-4" />
                            個人情報
                          </h3>
                          <FormField
                            control={form.control}
                            name="birthDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  生年月日
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    className="h-11"
                                    {...field}
                                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                    onChange={(e) => {
                                      field.onChange(e.target.value ? new Date(e.target.value) : undefined);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            連絡先情報
                          </h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    携帯番号
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="tel"
                                      placeholder="090-1234-5678"
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
                              name="phoneNotes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    備考（連絡可能時間など）
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="例: 平日18時以降"
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
                                  placeholder="講師のユーザな"
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

                  <TabsContent value="line" className="space-y-6 mt-0">
                    {teacher && (
                      <LineLinking
                        userId={teacher.teacherId}
                        userType="teacher"
                        userName={teacher.name}
                        lineId={lineState.lineId}
                        lineUserId={lineState.lineUserId ?? undefined}
                        lineNotificationsEnabled={lineState.lineNotificationsEnabled}
                        username={teacher.username || ""}
                        onNotificationToggle={(enabled) => {
                          form.setValue("lineNotificationsEnabled", enabled);
                          setLineState((s) => ({ ...s, lineNotificationsEnabled: enabled }));
                        }}
                      />
                    )}
                    {teacher && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            チャネル連携の管理
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button type="button" variant="outline" onClick={() => setOpenLineManage(true)}>
                            チャネル連携を管理する
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    {!teacher && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          メッセージ連携は講師を作成した後に設定できます。
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="subjects" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          科目・科目タイプ選択
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">科目</label>
                            <Select
                              value={currentSubject || ""}
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
                                    : <span className="text-muted-foreground">科目タイプを選択</span>}
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

                        {teacherSubjects.length > 0 && (
                          <div className="space-y-3 mt-6">
                            <h4 className="text-sm font-medium">
                              選択された科目
                            </h4>
                            <div className="space-y-2">
                              {teacherSubjects.map((teacherSubject) => {
                                const subject = subjects.find(
                                  (s) =>
                                    s.subjectId === teacherSubject.subjectId
                                );
                                const types = subjectTypes.filter((t) =>
                                  teacherSubject.subjectTypeIds.includes(
                                    t.subjectTypeId
                                  )
                                );

                                return (
                                  <div
                                    key={teacherSubject.subjectId}
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
                                            teacherSubject.subjectId
                                          )
                                        }
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
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
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                </TabsContent>

                {teacher && (
                  <LineManagementDialog
                    open={openLineManage}
                    onOpenChange={setOpenLineManage}
                    userType="teacher"
                    userId={teacher.teacherId}
                    userName={teacher.name}
                    lineConnections={{
                      lineId: lineState.lineId,
                      lineUserId: lineState.lineUserId,
                      lineNotificationsEnabled: lineState.lineNotificationsEnabled,
                    }}
                    onConnectionUnbound={() => {
                      setLineState((s) => ({ ...s, lineId: null }));
                    }}
                  />
                )}
                  <TabsContent value="availability" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          定期利用可能時間
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          講師の通常の利用可能時間を曜日ごとに設定してください。各曜日に複数の時間帯を設定することができます。
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
                                  特定の日付での利用可能時間の変更は、講師詳細ページの「例外設定」タブで管理できます。
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent
                    value="availabilityIrregular"
                    className="space-y-6 mt-0"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          例外的な利用可能時間
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          特定の日付での利用可能時間を設定してください。各日付に複数の時間帯を設定することができます。
                        </p>
                      </CardHeader>
                      <CardContent>
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
                                  保存後、より詳細な例外的な利用可能時間の管理は、講師詳細ページの「例外設定」タブで行うことができます。
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
                                    defaultValues={
                                      defaultBranchId ? [defaultBranchId] : []
                                    }
                                    renderSelectedBadge={(
                                      item,
                                      isDefault,
                                      onRemove
                                    ) => (
                                      <Badge
                                        key={item.value}
                                        variant={
                                          isDefault ? "default" : "secondary"
                                        }
                                        className="flex items-center gap-1 px-3 py-1"
                                      >
                                        <span>{item.label}</span>
                                        {isDefault && (
                                          <span className="text-xs">
                                            (デフォルト)
                                          </span>
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
          <div className="flex flex-col gap-4 w-full">
            {/* Keep dialog open toggle */}
            {/* <div className="flex items-center space-x-2 justify-center">
              <Checkbox
                id="keep-dialog-open"
                checked={keepDialogOpen}
                onCheckedChange={(checked) => setKeepDialogOpen(checked === true)}
              />
              <label
                htmlFor="keep-dialog-open"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                保存後もダイアログを開いたまま保持する
              </label>
            </div> */}

            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full justify-between">
              {/* Reset button on the left */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    リセット
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>フォームをリセットしますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      この操作により、入力されたすべての情報が削除され、フォームが初期状態に戻ります。この操作は元に戻すことができません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      リセット
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Cancel and Save buttons on the right */}
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

                {keepDialogOpen ? (
                  <EnhancedStateButton
                    {...(isEditing
                      ? saveButtonPresets.update
                      : saveButtonPresets.create)}
                    onClick={handleEnhancedSubmit}
                    disabled={isBranchesLoading || availabilityErrors.length > 0}
                    className="w-full sm:w-auto min-w-[120px]"
                    autoResetDelay={1500}
                  />
                ) : (
                  <Button
                    type="submit"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={
                      isBranchesLoading ||
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
                        {isEditing ? "変更を保存" : "講師を作成"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
