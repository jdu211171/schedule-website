"use client";

import { useState, useEffect, useMemo } from "react";
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
  MessageSquare,
  School,
  GraduationCap,
  Phone,
  Mail,
  Cake,
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
import { EnhancedStateButton } from "@/components/ui/enhanced-state-button";
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
import { LineLinking } from "@/components/shared/line-linking";
import { AlertCircle } from "lucide-react";

import {
  type StudentCreate,
  type StudentUpdate,
  studentCreateSchema,
  studentUpdateSchema,
  type StudentFormValues,
  createStudentFormSchema,
  userStatusLabels,
  schoolTypeLabels,
  examCategoryLabels,
  examCategoryTypeLabels,
  phoneTypeLabels,
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
  date: Date;
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

  const { data: branches = [], isLoading: isBranchesLoading } =
    useAllBranchesOrdered();
  const defaultBranchId =
    session?.user?.selectedBranchId || branches?.[0]?.branchId;

  const { data: studentTypesResponse, isLoading: isStudentTypesLoading } =
    useStudentTypes();

  console.log(studentTypesResponse);

  // Fetch real data for subjects and subject types
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();

  // Use the selected branch from session instead of first branch
  const isEditing = !!student;
  const isSubmitting =
    createStudentMutation.isPending || updateStudentMutation.isPending;

  // Keep dialog open setting - shared across student and teacher forms
//   const KEEP_OPEN_STORAGE_KEY = "form-keep-open";
//   const [keepDialogOpen, setKeepDialogOpen] = useState(() => {
//   if (typeof window !== "undefined") {
//     const savedKeepOpen = localStorage.getItem(KEEP_OPEN_STORAGE_KEY);
//     return savedKeepOpen ? JSON.parse(savedKeepOpen) : true;
//   }
//   return true;
// });
  // Keep dialog open only when editing, close on create
  const keepDialogOpen = isEditing;

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
  const { data: availableTeachers = [], isLoading: isLoadingTeachers } =
    useTeachersBySubjectPreference(currentSubject, selectedSubjectTypes);

  // Fetch all teachers for name resolution when displaying selected subjects
  const { data: allTeachersResponse } = useTeachers({ limit: 1000 });
  const allTeachers = useMemo(
    () => allTeachersResponse?.data || [],
    [allTeachersResponse?.data]
  );

  // Enhanced regular availability state
  const [regularAvailability, setRegularAvailability] = useState<
    RegularAvailability[]
  >([]);
  const [irregularAvailability, setIrregularAvailability] = useState<
    IrregularAvailability[]
  >([]);
  const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);

  // Create dynamic schema using student types data for grade year validation
  const studentTypes =
    studentTypesResponse?.data?.map((type) => ({
      studentTypeId: type.studentTypeId,
      maxYears: type.maxYears,
    })) || [];

  const dynamicSchema = createStudentFormSchema(studentTypes);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      studentTypeId: undefined,
      gradeYear: undefined,
      lineUserId: "",
      lineNotificationsEnabled: true,
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      email: "",
      branchIds: [],
      studentId: undefined,
      // School information
      schoolName: "",
      schoolType: undefined,
      // Exam information
      examCategory: undefined,
      examCategoryType: undefined,
      firstChoice: "",
      secondChoice: "",
      examDate: undefined,
      // Contact information
      parentEmail: "",
      // Personal information
      birthDate: undefined,
      // Contact phones
      contactPhones: [],
    },
  });

  // Load keep dialog open setting from localStorage when dialog opens
//   useEffect(() => {
//   if (open) {
//     const savedKeepOpen = localStorage.getItem(KEEP_OPEN_STORAGE_KEY);
//     if (savedKeepOpen !== null) {
//       const parsed = JSON.parse(savedKeepOpen);
//       setKeepDialogOpen(parsed);
//     }
//   }
// }, [open]);

  // // Save keep dialog open setting to localStorage
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     localStorage.setItem(
  //       KEEP_OPEN_STORAGE_KEY,
  //       JSON.stringify(keepDialogOpen)
  //     );
  //   }
  // }, [keepDialogOpen]);

  useEffect(() => {
    if (student) {
      const branchIds =
        student.branches?.map((branch) => branch.branchId) || [];
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
        lineUserId: student.lineUserId || "",
        lineNotificationsEnabled: student.lineNotificationsEnabled ?? true,
        notes: student.notes || "",
        status:
          (student.status as "ACTIVE" | "SICK" | "PERMANENTLY_LEFT") ||
          "ACTIVE",
        username: student.username || "",
        email: student.email || "",
        password: "",
        branchIds: branchIdsWithDefault,
        // School information
        schoolName: student.schoolName || "",
        schoolType: student.schoolType as any || undefined,
        // Exam information
        examCategory: student.examCategory as any || undefined,
        examCategoryType: student.examCategoryType as any || undefined,
        firstChoice: student.firstChoice || "",
        secondChoice: student.secondChoice || "",
        examDate: student.examDate ? new Date(student.examDate) : undefined,
        // Contact information
        parentEmail: student.parentEmail || "",
        // Personal information
        birthDate: student.birthDate ? new Date(student.birthDate) : undefined,
        // Contact phones
        contactPhones: student.contactPhones?.map(phone => ({
          ...phone,
          phoneType: phone.phoneType as "HOME" | "DAD" | "MOM" | "OTHER",
        })) || [],
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
        const irregularAvailabilityData =
          studentWithAvailability.exceptionalAvailability.map((ea) => ({
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
        studentTypeId: undefined,
        gradeYear: undefined,
        lineUserId: "",
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
    console.log("onSubmit called with values:", values);
    
    // Check for availability errors before submitting
    if (availabilityErrors.length > 0) {
      console.error("Availability errors:", availabilityErrors);
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
      const exceptionalAvailabilityData = irregularAvailability.flatMap(
        (item) => {
          if (item.fullDay) {
            // Full day availability
            return [
              {
                userId: submissionData.studentId || undefined,
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
        }
      );

      // Add exceptional availability to submission data for backend processing
      (submissionData as any).exceptionalAvailability =
        exceptionalAvailabilityData;
    }

    if (isEditing && student) {
      if (!submissionData.password || submissionData.password === "") {
        delete submissionData.password;
      }
      // Pass the data directly without parsing through studentUpdateSchema
      // The form schema already validates the data
      const updateData = {
        ...submissionData,
        studentId: student.studentId,
      };
      updateStudentMutation.mutate(updateData as StudentUpdate, {
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
      const { studentId, ...createValues } = submissionData;
      // Pass the data directly without parsing through studentCreateSchema
      // The form schema already validates the data
      createStudentMutation.mutate(createValues as StudentCreate, {
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
    
    // Log form errors for debugging
    if (!isValid) {
      const errors = form.formState.errors;
      console.error("Form validation errors:", errors);
      
      // Create a detailed error message
      const errorMessages: string[] = [];
      Object.entries(errors).forEach(([field, error]) => {
        if (error?.message) {
          errorMessages.push(`${field}: ${error.message}`);
        }
      });
      
      if (errorMessages.length > 0) {
        throw new Error(`フォームの入力内容に問題があります:\n${errorMessages.join('\n')}`);
      } else {
        throw new Error("フォームの入力内容に問題があります");
      }
    }
    
    if (availabilityErrors.length > 0) {
      throw new Error(`利用可能時間にエラーがあります:\n${availabilityErrors.join('\n')}`);
    }

    return new Promise<void>((resolve, reject) => {
      const values = form.getValues();
      console.log("Form values before submission:", values);
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
        const exceptionalAvailabilityData = irregularAvailability.flatMap(
          (item) => {
            if (item.fullDay) {
              // Full day availability
              return [
                {
                  userId: submissionData.studentId || undefined,
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
          }
        );

        // Add exceptional availability to submission data for backend processing
        (submissionData as any).exceptionalAvailability =
          exceptionalAvailabilityData;
      }

      if (isEditing && student) {
        if (!submissionData.password || submissionData.password === "") {
          delete submissionData.password;
        }
        // Pass the data directly without parsing through studentUpdateSchema
        // The form schema already validates the data
        const updateData = {
          ...submissionData,
          studentId: student.studentId,
        };
        updateStudentMutation.mutate(updateData as StudentUpdate, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { studentId, ...createValues } = submissionData;
        // Pass the data directly without parsing through studentCreateSchema
        // The form schema already validates the data
        createStudentMutation.mutate(createValues as StudentCreate, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      }
    });
  };

  // Handle subject selection
  function handleSubjectChange(subjectId: string) {
    setCurrentSubject(subjectId);
    // Don't reset other selections - let user maintain their choices
    // Filter teachers will be handled by the query hook
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
        // Check if all available types are selected
        const availableTypes = getFilteredSubjectTypes();
        setIsAllSelected(
          availableTypes.length > 0 &&
            newSelection.length === availableTypes.length
        );
        return newSelection;
      }
    });
    // Don't reset teacher selection - teachers will be filtered automatically
  }

  // Handle "Select All" toggle for subject types
  function handleSelectAllToggle() {
    const availableTypes = getFilteredSubjectTypes();
    if (isAllSelected) {
      setSelectedSubjectTypes([]);
      setIsAllSelected(false);
    } else {
      const allTypeIds = availableTypes.map((type) => type.subjectTypeId);
      setSelectedSubjectTypes(allTypeIds);
      setIsAllSelected(true);
    }
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

  // Get filtered subject types based on current subject and teacher selections
  function getFilteredSubjectTypes() {
    // If no filters are applied, return all subject types
    if (!currentSubject && selectedTeacherIds.length === 0) {
      return subjectTypes;
    }

    let filteredTypes = subjectTypes;

    // If a subject is selected, no additional filtering needed for subject types
    // as subject types are generally independent of specific subjects

    // If teachers are selected, filter subject types based on teacher preferences
    if (selectedTeacherIds.length > 0) {
      // This would require teacher-subject-type relationship data
      // For now, we'll return all types as the filtering will be handled by teacher availability
      filteredTypes = subjectTypes;
    }

    return filteredTypes;
  }

  // Get filtered subjects based on current selections
  function getFilteredSubjects() {
    // If no filters are applied, return all subjects
    if (selectedSubjectTypes.length === 0 && selectedTeacherIds.length === 0) {
      return subjects;
    }

    // For now, return all subjects as the filtering logic would depend on
    // additional data about subject-teacher and subject-subjectType relationships
    const filteredSubjects = subjects;

    return filteredSubjects;
  }

  // Get filtered teachers based on current subject and subject type selections
  const filteredTeachersForDisplay = useMemo(() => {
    let filteredTeachers = [];

    // If we have both subject and subject types selected, use the existing hook data
    if (currentSubject && selectedSubjectTypes.length > 0) {
      filteredTeachers = availableTeachers;
    }
    // If only subject is selected, get teachers for that subject with any type
    else if (currentSubject && selectedSubjectTypes.length === 0) {
      // For now, return all teachers as we'd need additional subject-teacher relationship data
      filteredTeachers = allTeachers.filter(() => true); // Placeholder for future enhancement
    }
    // If only subject types are selected, return all teachers
    // This could be enhanced to filter by subject type preferences
    else if (!currentSubject && selectedSubjectTypes.length > 0) {
      filteredTeachers = allTeachers;
    }
    // If nothing is selected, return all teachers
    else {
      filteredTeachers = allTeachers;
    }

    return filteredTeachers;
  }, [currentSubject, selectedSubjectTypes, availableTeachers, allTeachers]);

  // Clean up selected teachers when the filtered list changes
  useEffect(() => {
    const filteredTeacherIds = filteredTeachersForDisplay.map(
      (t) => t.teacherId
    );
    const validSelectedTeacherIds = selectedTeacherIds.filter((id) =>
      filteredTeacherIds.includes(id)
    );

    // Update selected teachers if any were filtered out
    if (validSelectedTeacherIds.length !== selectedTeacherIds.length) {
      setSelectedTeacherIds(validSelectedTeacherIds);
    }
  }, [filteredTeachersForDisplay, selectedTeacherIds]);

  function getFilteredTeachersForDisplay() {
    return filteredTeachersForDisplay;
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
      lineUserId: "",
      notes: "",
      status: "ACTIVE",
      username: "",
      password: "",
      email: "",
      branchIds: defaultBranchId ? [defaultBranchId] : [],
      studentId: undefined,
      // School information
      schoolName: "",
      schoolType: undefined,
      // Exam information
      examCategory: undefined,
      examCategoryType: undefined,
      firstChoice: "",
      secondChoice: "",
      examDate: undefined,
      // Contact information
      parentEmail: "",
      // Personal information
      birthDate: undefined,
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
  }

  // Enhanced button presets
  const saveButtonPresets = {
    create: {
      defaultState: { label: "生徒を作成", icon: Save },
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
                <TabsList className="grid w-full grid-cols-7 mb-6">
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
                            render={({ field }) => {
                              const selectedStudentTypeId =
                                form.watch("studentTypeId");
                              const selectedStudentType =
                                studentTypesResponse?.data?.find(
                                  (type) =>
                                    type.studentTypeId === selectedStudentTypeId
                                );
                              const maxYears =
                                selectedStudentType?.maxYears || 0;
                              const gradeOptions = Array.from(
                                { length: maxYears },
                                (_, i) => i + 1
                              );

                              return (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    学年
                                  </FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(
                                        value ? Number(value) : undefined
                                      );
                                    }}
                                    value={
                                      field.value
                                        ? String(field.value)
                                        : undefined
                                    }
                                    disabled={
                                      !selectedStudentTypeId || maxYears === 0
                                    }
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-11">
                                        <SelectValue
                                          placeholder={
                                            !selectedStudentTypeId
                                              ? "まず生徒タイプを選択してください"
                                              : maxYears === 0
                                              ? "利用可能な学年がありません"
                                              : "学年を選択"
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {gradeOptions.map((year) => (
                                        <SelectItem
                                          key={year}
                                          value={String(year)}
                                        >
                                          {year}年
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
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

                    {/* School Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <School className="h-5 w-5" />
                          学校情報
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="schoolName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  学校名
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="〇〇小学校"
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
                            name="schoolType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  学校種別
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="学校種別を選択" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(schoolTypeLabels).map(
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
                        </div>
                      </CardContent>
                    </Card>

                    {/* Exam Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <GraduationCap className="h-5 w-5" />
                          受験情報
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="examCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  受験カテゴリー
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="受験カテゴリーを選択" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(examCategoryLabels).map(
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

                          <FormField
                            control={form.control}
                            name="examCategoryType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  受験カテゴリー種別
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="受験カテゴリー種別を選択" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(examCategoryTypeLabels).map(
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
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstChoice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  第一志望校
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="〇〇高等学校"
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
                            name="secondChoice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  第二志望校
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="〇〇高等学校"
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
                          name="examDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                試験日
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
                      </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Phone className="h-5 w-5" />
                          連絡先情報
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Dynamic Contact Phones */}
                        <FormField
                          control={form.control}
                          name="contactPhones"
                          render={({ field }) => (
                            <FormItem>
                              <div className="space-y-4">
                                {(field.value || []).map((phone, index) => (
                                  <div key={index} className="flex gap-4 items-start">
                                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      <FormField
                                        control={form.control}
                                        name={`contactPhones.${index}.phoneType`}
                                        render={({ field }) => (
                                          <FormItem>
                                            {index === 0 && (
                                              <FormLabel className="text-sm font-medium">
                                                種別
                                              </FormLabel>
                                            )}
                                            <Select
                                              onValueChange={field.onChange}
                                              value={field.value}
                                            >
                                              <FormControl>
                                                <SelectTrigger className="h-11">
                                                  <SelectValue placeholder="種別を選択" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {Object.entries(phoneTypeLabels).map(([value, label]) => (
                                                  <SelectItem key={value} value={value}>
                                                    {label}
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
                                        name={`contactPhones.${index}.phoneNumber`}
                                        render={({ field }) => (
                                          <FormItem>
                                            {index === 0 && (
                                              <FormLabel className="text-sm font-medium">
                                                電話番号
                                              </FormLabel>
                                            )}
                                            <FormControl>
                                              <Input
                                                type="tel"
                                                placeholder="090-1234-5678"
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
                                        name={`contactPhones.${index}.notes`}
                                        render={({ field }) => (
                                          <FormItem>
                                            {index === 0 && (
                                              <FormLabel className="text-sm font-medium">
                                                備考（連絡可能時間など）
                                              </FormLabel>
                                            )}
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
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={index === 0 ? "mt-9" : ""}
                                      onClick={() => {
                                        const newPhones = (field.value || []).filter((_, i) => i !== index);
                                        field.onChange(newPhones);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    field.onChange([
                                      ...(field.value || []),
                                      {
                                        phoneType: "OTHER",
                                        phoneNumber: "",
                                        notes: "",
                                      },
                                    ]);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  電話番号を追加
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Keep parent email */}
                        <FormField
                          control={form.control}
                          name="parentEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                保護者メールアドレス
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="parent@example.com"
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

                    {/* Personal Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Cake className="h-5 w-5" />
                          個人情報
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
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

                  <TabsContent value="line" className="space-y-6 mt-0">
                    {student && (
                      <LineLinking
                        userId={student.studentId}
                        userType="student"
                        userName={student.name}
                        lineId={student.lineId}
                        parentLineId1={student.parentLineId1}
                        parentLineId2={student.parentLineId2}
                        lineUserId={student.lineUserId}
                        lineNotificationsEnabled={student.lineNotificationsEnabled}
                        username={student.username || ""}
                        onNotificationToggle={(enabled) => {
                          form.setValue("lineNotificationsEnabled", enabled);
                        }}
                      />
                    )}
                    {!student && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          メッセージ連携は生徒を作成した後に設定できます。
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="subjects" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          科目・科目タイプ・講師選択
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          科目、科目タイプ、希望講師を自由な順序で選択できます。どの項目も任意で、組み合わせて選択することも可能です。
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Subject Selection */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              科目（任意）
                            </label>
                            <Select
                              value={currentSubject || ""}
                              onValueChange={handleSubjectChange}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="科目を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {getFilteredSubjects().map((subject) => (
                                  <SelectItem
                                    key={subject.subjectId}
                                    value={subject.subjectId}
                                  >
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {currentSubject && (
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs">
                                  {
                                    subjects.find(
                                      (s) => s.subjectId === currentSubject
                                    )?.name
                                  }
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCurrentSubject(undefined)}
                                  className="h-6 w-6 p-0 ml-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Subject Type Selection */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                科目タイプ（任意）
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllToggle}
                                className="h-7 text-xs"
                                disabled={
                                  getFilteredSubjectTypes().length === 0
                                }
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
                                      {getFilteredSubjectTypes().map((type) => (
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

                            {selectedSubjectTypes.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    選択中の科目タイプ:
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubjectTypes([]);
                                      setIsAllSelected(false);
                                    }}
                                    className="h-6 text-xs"
                                  >
                                    全てクリア
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedSubjectTypes.map((typeId) => {
                                    const type = subjectTypes.find(
                                      (t) => t.subjectTypeId === typeId
                                    );
                                    return type ? (
                                      <Badge
                                        key={typeId}
                                        variant="secondary"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        {type.name}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleSubjectTypeToggle(typeId)
                                          }
                                          className="h-3 w-3 p-0 ml-1 hover:bg-muted rounded-full"
                                        >
                                          <X className="h-2 w-2" />
                                        </Button>
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Teacher Selection */}
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
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="h-11 w-full justify-between"
                                  >
                                    {selectedTeacherIds.length > 0
                                      ? `${selectedTeacherIds.length}名選択中`
                                      : <span className="text-muted-foreground">希望講師を選択（任意）</span>}
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
                                        {getFilteredTeachersForDisplay().map(
                                          (teacher) => (
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
                                          )
                                        )}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}

                            {selectedTeacherIds.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    選択中の講師:
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedTeacherIds([])}
                                    className="h-6 text-xs"
                                  >
                                    全てクリア
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedTeacherIds.map((teacherId) => {
                                    const teacher =
                                      getFilteredTeachersForDisplay().find(
                                        (t) => t.teacherId === teacherId
                                      );
                                    return teacher ? (
                                      <Badge
                                        key={teacherId}
                                        variant="secondary"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        {teacher.name}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleTeacherToggle(teacherId)
                                          }
                                          className="h-3 w-3 p-0 ml-1 hover:bg-muted rounded-full"
                                        >
                                          <X className="h-2 w-2" />
                                        </Button>
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Add Subject Button */}
                        <div className="pt-4 border-t">
                          <div className="flex flex-col items-end gap-2">
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
                            {(!currentSubject ||
                              selectedSubjectTypes.length === 0) && (
                              <p className="text-xs text-muted-foreground text-right">
                                科目と科目タイプの両方を選択してから追加できます
                              </p>
                            )}
                          </div>
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
                                      {studentSubject.preferredTeacherIds &&
                                        studentSubject.preferredTeacherIds
                                          .length > 0 && (
                                          <div className="pt-2 border-t">
                                            <div className="text-xs text-muted-foreground mb-1">
                                              希望講師:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {studentSubject.preferredTeacherIds.map(
                                                (teacherId) => {
                                                  const teacher =
                                                    allTeachers.find(
                                                      (t) =>
                                                        t.teacherId ===
                                                        teacherId
                                                    );
                                                  return (
                                                    <Badge
                                                      key={teacherId}
                                                      variant="outline"
                                                      className="text-xs"
                                                    >
                                                      <Users className="h-3 w-3 mr-1" />
                                                      {teacher?.name ||
                                                        teacherId}
                                                    </Badge>
                                                  );
                                                }
                                              )}
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

                  <TabsContent
                    value="availabilityRegular"
                    className="space-y-6 mt-0"
                  >
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
          <div className="flex flex-col gap-4 w-full">
            {/* Keep dialog open toggle */}
            {/* <div className="flex items-center space-x-2 justify-center">
              <Checkbox
                id="keep-dialog-open"
                checked={keepDialogOpen}
                onCheckedChange={(checked) =>
                  setKeepDialogOpen(checked === true)
                }
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
                    disabled={
                      isBranchesLoading ||
                      isStudentTypesLoading ||
                      availabilityErrors.length > 0
                    }
                    className="w-full sm:w-auto min-w-[120px]"
                    autoResetDelay={1500}
                  />
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
