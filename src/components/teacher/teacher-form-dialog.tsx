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
import { EnhancedAvailabilitySelector } from "../student/enhanced-availability-selector";

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
  const createTeacherMutation = useTeacherCreate();
  const updateTeacherMutation = useTeacherUpdate();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("basic");

  const branchesResponse = session?.user?.branches
    ? { data: session.user.branches }
    : { data: [] };
  const isBranchesLoading = !session?.user?.branches;

  // Fetch real data for subjects and subject types
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();

  // Branch selection state
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Use the selected branch from session instead of first branch
  const defaultBranchId =
    session?.user?.selectedBranchId || session?.user?.branches?.[0]?.branchId;

  const isEditing = !!teacher;
  const isSubmitting =
    createTeacherMutation.isPending || updateTeacherMutation.isPending;

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
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);

  // Local storage key
  const STORAGE_KEY = `teacher-form-${teacher?.teacherId || "new"}`;

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      email: "",
      lineId: "",
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      branchIds: [],
      teacherId: undefined,
    },
  });

  useEffect(() => {
    if (teacher) {
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
        lineId: teacher.lineId || "",
        notes: teacher.notes || "",
        status: (teacher.status as "ACTIVE" | "SICK" | "PERMANENTLY_LEFT") || "ACTIVE",
        username: teacher.username || "",
        password: "",
        branchIds: branchIdsWithDefault,
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
      };
      if (
        teacherWithAvailability.regularAvailability &&
        teacherWithAvailability.regularAvailability.length > 0
      ) {
        setRegularAvailability(teacherWithAvailability.regularAvailability);
      } else {
        setRegularAvailability([]);
      }
    } else {
      // For create, default to defaultBranchId only
      form.reset({
        name: "",
        kanaName: "",
        email: "",
        lineId: "",
        notes: "",
        status: "ACTIVE",
        username: "",
        password: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        teacherId: undefined,
      });
      setTeacherSubjects([]);
      setRegularAvailability([]);
    }
  }, [teacher, form, defaultBranchId]);

  // Load form data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        form.reset(parsedData.formValues);
        setTeacherSubjects(parsedData.teacherSubjects || []);
        setRegularAvailability(parsedData.regularAvailability || []);
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
          teacherSubjects,
          regularAvailability,
        })
      );
    });

    return () => subscription.unsubscribe();
  }, [form, teacherSubjects, regularAvailability, STORAGE_KEY]);

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
          onOpenChange(false);
          form.reset();
          localStorage.removeItem(STORAGE_KEY);
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { teacherId, ...createValues } = submissionData;
      const parsedData = teacherCreateSchema.parse(createValues);
      createTeacherMutation.mutate(parsedData as TeacherCreate, {
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
      lineId: "",
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      branchIds: defaultBranchId ? [defaultBranchId] : [],
      teacherId: undefined,
    });
    setTeacherSubjects([]);
    setRegularAvailability([]);
    setCurrentSubject(undefined);
    setSelectedSubjectTypes([]);
    setIsAllSelected(false);
    setAvailabilityErrors([]);
    setActiveTab("basic");
    localStorage.removeItem(STORAGE_KEY);
  }

  // Filter branches based on search term
  const filteredBranches =
    branchesResponse?.data.filter(
      (branch: { branchId: string; name: string }) =>
        branch.name.toLowerCase().includes(branchSearchTerm.toLowerCase())
    ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "教師情報の編集" : "新しい教師の作成"}
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
                <TabsList className="grid w-full grid-cols-5 mb-6">
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
                    利用可能時間
                  </TabsTrigger>
                  <TabsTrigger
                    value="branches"
                    className="flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    支店
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
                                <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                                  メールアドレス
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
                                  placeholder="teacher_username"
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
                          科目・科目タイプ選択
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

                  <TabsContent value="availability" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          定期利用可能時間
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          教師の通常の利用可能時間を曜日ごとに設定してください。各曜日に複数の時間帯を設定することができます。
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

                        <EnhancedAvailabilitySelector
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
                                  特定の日付での利用可能時間の変更は、教師詳細ページの「例外設定」タブで管理できます。
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
                          支店配属
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="branchIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium after:content-['*'] after:ml-1 after:text-destructive">
                                所属支店（複数選択可）
                              </FormLabel>
                              <FormControl>
                                {isBranchesLoading ? (
                                  <div className="flex items-center justify-center h-11 border rounded-lg bg-muted/50">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span className="text-sm text-muted-foreground">
                                      支店情報を読み込み中...
                                    </span>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Input
                                      placeholder="支店名を検索..."
                                      value={branchSearchTerm}
                                      onChange={(e) => {
                                        setBranchSearchTerm(e.target.value);
                                        setShowBranchDropdown(
                                          e.target.value.trim() !== ""
                                        );
                                      }}
                                      onFocus={() => {
                                        if (branchSearchTerm.trim() !== "") {
                                          setShowBranchDropdown(true);
                                        }
                                      }}
                                      onBlur={() => {
                                        setTimeout(
                                          () => setShowBranchDropdown(false),
                                          200
                                        );
                                      }}
                                      className="h-11"
                                    />

                                    {showBranchDropdown && (
                                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                                        {filteredBranches.map(
                                          (branch: {
                                            branchId: string;
                                            name: string;
                                          }) => {
                                            const isAlreadySelected =
                                              field.value?.includes(
                                                branch.branchId
                                              );
                                            const isDefault =
                                              branch.branchId ===
                                              defaultBranchId;

                                            return (
                                              <div
                                                key={branch.branchId}
                                                className={`p-3 hover:bg-accent cursor-pointer flex items-center justify-between ${
                                                  isAlreadySelected
                                                    ? "bg-accent/50"
                                                    : ""
                                                }`}
                                                onClick={() => {
                                                  if (!isAlreadySelected) {
                                                    const currentValues =
                                                      field.value || [];
                                                    let newValues = [
                                                      ...currentValues,
                                                      branch.branchId,
                                                    ];

                                                    // Always ensure default branch is included
                                                    if (
                                                      defaultBranchId &&
                                                      !newValues.includes(
                                                        defaultBranchId
                                                      )
                                                    ) {
                                                      newValues = [
                                                        defaultBranchId,
                                                        ...newValues,
                                                      ];
                                                    }

                                                    field.onChange(newValues);
                                                  }
                                                  setBranchSearchTerm("");
                                                  setShowBranchDropdown(false);
                                                }}
                                              >
                                                <span className="flex-1">
                                                  {branch.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  {isDefault && (
                                                    <Badge
                                                      variant="secondary"
                                                      className="text-xs"
                                                    >
                                                      デフォルト
                                                    </Badge>
                                                  )}
                                                  {isAlreadySelected && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-xs"
                                                    >
                                                      選択済み
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          }
                                        )}
                                        {filteredBranches.length === 0 && (
                                          <div className="p-3 text-muted-foreground text-center">
                                            該当する支店が見つかりません
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </FormControl>

                              {/* Display selected branches */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {(field.value || []).map((branchId, index) => {
                                  const branch = branchesResponse?.data.find(
                                    (b: { branchId: string; name: string }) =>
                                      b.branchId === branchId
                                  );
                                  const isDefault =
                                    branchId === defaultBranchId;

                                  return (
                                    <Badge
                                      key={index}
                                      variant={
                                        isDefault ? "default" : "secondary"
                                      }
                                      className="flex items-center gap-1 px-3 py-1"
                                    >
                                      <span>{branch?.name || branchId}</span>
                                      {isDefault && (
                                        <span className="text-xs">
                                          (デフォルト)
                                        </span>
                                      )}
                                      {!isDefault && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                                          onClick={() => {
                                            const newValues = [
                                              ...(field.value || []),
                                            ];
                                            newValues.splice(index, 1);
                                            field.onChange(newValues);
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </Badge>
                                  );
                                })}
                              </div>

                              <FormMessage />
                              {defaultBranchId && (
                                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                                  💡
                                  デフォルト支店は自動的に選択され、削除することはできません
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
                  {isEditing ? "変更を保存" : "教師を作成"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
