"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, X, Plus, Check } from "lucide-react";

import {
  type StudentCreate,
  type StudentUpdate,
  studentCreateSchema,
  studentUpdateSchema,
  type StudentFormValues,
  studentFormSchema,
} from "@/schemas/student.schema";
import { useStudentCreate, useStudentUpdate } from "@/hooks/useStudentMutation";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import type { Student } from "@/hooks/useStudentQuery";

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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

interface Subject {
  id: string;
  name: string;
}

interface SubjectType {
  id: string;
  name: string;
  subjectId: string;
}

interface StudentSubject {
  subjectId: string;
  subjectTypeIds: string[];
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const createStudentMutation = useStudentCreate();
  const updateStudentMutation = useStudentUpdate();
  const { data: session } = useSession();

  const branchesResponse = session?.user?.branches
    ? { data: session.user.branches }
    : { data: [] };
  const isBranchesLoading = !session?.user?.branches;

  const { data: studentTypesResponse, isLoading: isStudentTypesLoading } =
    useStudentTypes();

  // Branch selection state
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Use the selected branch from session instead of first branch
  const defaultBranchId =
    session?.user?.selectedBranchId || session?.user?.branches?.[0]?.branchId;

  const isEditing = !!student;
  const isSubmitting =
    createStudentMutation.isPending || updateStudentMutation.isPending;

  // Mock data for subjects and subject types
  const subjects: Subject[] = [
    { id: "math", name: "数学" },
    { id: "science", name: "理科" },
    { id: "english", name: "英語" },
    { id: "japanese", name: "国語" },
    { id: "social", name: "社会" },
  ];

  const subjectTypes: SubjectType[] = [
    { id: "math-basic", name: "基礎", subjectId: "math" },
    { id: "math-advanced", name: "応用", subjectId: "math" },
    { id: "math-exam", name: "試験対策", subjectId: "math" },
    { id: "science-physics", name: "物理", subjectId: "science" },
    { id: "science-chemistry", name: "化学", subjectId: "science" },
    { id: "science-biology", name: "生物", subjectId: "science" },
    { id: "english-grammar", name: "文法", subjectId: "english" },
    { id: "english-reading", name: "読解", subjectId: "english" },
    { id: "english-speaking", name: "会話", subjectId: "english" },
    { id: "japanese-classic", name: "古典", subjectId: "japanese" },
    { id: "japanese-modern", name: "現代文", subjectId: "japanese" },
    { id: "social-history", name: "歴史", subjectId: "social" },
    { id: "social-geography", name: "地理", subjectId: "social" },
  ];

  // Subject selection state
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string | undefined>(
    undefined
  );
  const [selectedSubjectTypes, setSelectedSubjectTypes] = useState<string[]>(
    []
  );
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Local storage key
  const STORAGE_KEY = `student-form-${student?.studentId || "new"}`;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      kanaName: "",
      studentTypeId: undefined,
      gradeYear: undefined,
      lineId: "",
      notes: "",
      username: "",
      password: "",
      email: "",
      branchIds: [],
      studentId: undefined,
    },
  });

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
        lineId: student.lineId || "",
        notes: student.notes || "",
        username: student.username || "",
        email: student.email || "",
        password: "",
        branchIds: branchIdsWithDefault,
      });
    } else {
      // For create, default to defaultBranchId only
      form.reset({
        name: "",
        kanaName: "",
        studentTypeId: undefined,
        gradeYear: undefined,
        lineId: "",
        notes: "",
        username: "",
        password: "",
        email: "",
        branchIds: defaultBranchId ? [defaultBranchId] : [],
        studentId: undefined,
      });
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
      } catch (error) {
        console.error("Failed to parse saved form data:", error);
      }
    }
  }, [STORAGE_KEY]);

  // Save form data to localStorage when values change
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formValues,
          studentSubjects,
        })
      );
    });

    return () => subscription.unsubscribe();
  }, [form, studentSubjects, STORAGE_KEY]);

  function onSubmit(values: StudentFormValues) {
    const submissionData = { ...values };

    if (
      typeof submissionData.gradeYear === "string" &&
      submissionData.gradeYear === ""
    ) {
      submissionData.gradeYear = undefined;
    } else if (submissionData.gradeYear) {
      submissionData.gradeYear = Number(submissionData.gradeYear);
    }

    // Add student subjects to submission data
    submissionData.subjectPreferences = studentSubjects;

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
        const allTypesForSubject = subjectTypes
          .filter((type) => type.subjectId === currentSubject)
          .map((type) => type.id);

        setIsAllSelected(
          allTypesForSubject.every((typeId) => newSelection.includes(typeId))
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
      const allTypesForSubject = subjectTypes
        .filter((type) => type.subjectId === currentSubject)
        .map((type) => type.id);
      setSelectedSubjectTypes(allTypesForSubject);
      setIsAllSelected(true);
    }
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
      username: "",
      password: "",
      email: "",
      branchIds: defaultBranchId ? [defaultBranchId] : [],
      studentId: undefined,
    });
    setStudentSubjects([]);
    setCurrentSubject(undefined);
    setSelectedSubjectTypes([]);
    setIsAllSelected(false);
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
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "生徒情報の編集" : "新しい生徒の作成"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    基本情報
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {/* Name and Kana - Responsive grid */}
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

                {/* Student Type and Grade Year - Responsive grid */}
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

                {/* Email and LINE ID - Responsive grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          メールアドレス
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
              </div>

              {/* Account Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    アカウント情報
                  </h3>
                  <Separator className="flex-1" />
                </div>

                {/* Username - Full width */}
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

                {/* Password - Full width */}
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
                        パスワード{isEditing ? "（変更する場合のみ）" : ""}
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
              </div>

              {/* Branch Assignment Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    支店配属
                  </h3>
                  <Separator className="flex-1" />
                </div>

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
                                      field.value?.includes(branch.branchId);
                                    const isDefault =
                                      branch.branchId === defaultBranchId;

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
                          const isDefault = branchId === defaultBranchId;

                          return (
                            <Badge
                              key={index}
                              variant={isDefault ? "default" : "secondary"}
                              className="flex items-center gap-1 px-3 py-1"
                            >
                              <span>{branch?.name || branchId}</span>
                              {isDefault && (
                                <span className="text-xs">(デフォルト)</span>
                              )}
                              {!isDefault && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                                  onClick={() => {
                                    const newValues = [...(field.value || [])];
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
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    追加情報
                  </h3>
                  <Separator className="flex-1" />
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
              </div>

              {/* Subject Selection Section */}
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    科目選択
                  </h3>
                  <Separator className="flex-1" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Subject Dropdown */}
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
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject Type Multi-select */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">科目タイプ</label>
                      {currentSubject && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllToggle}
                          className="h-7 text-xs"
                        >
                          {isAllSelected ? "全て解除" : "全て選択"}
                        </Button>
                      )}
                    </div>

                    {currentSubject ? (
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
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="検索..." />
                            <CommandEmpty>
                              該当する科目タイプがありません
                            </CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {subjectTypes
                                .filter(
                                  (type) => type.subjectId === currentSubject
                                )
                                .map((type) => (
                                  <CommandItem
                                    key={type.id}
                                    onSelect={() =>
                                      handleSubjectTypeToggle(type.id)
                                    }
                                    className="flex items-center gap-2"
                                  >
                                    <Checkbox
                                      checked={selectedSubjectTypes.includes(
                                        type.id
                                      )}
                                      className="mr-2"
                                    />
                                    {type.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="h-11 flex items-center justify-center border rounded-md bg-muted/20 text-muted-foreground text-sm">
                        先に科目を選択してください
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Subject Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={addSubjectWithTypes}
                    disabled={
                      !currentSubject || selectedSubjectTypes.length === 0
                    }
                    size="sm"
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    科目を追加
                  </Button>
                </div>

                {/* Selected Subjects List */}
                {studentSubjects.length > 0 && (
                  <div className="space-y-3 mt-2">
                    <h4 className="text-sm font-medium">選択された科目</h4>
                    <div className="space-y-2">
                      {studentSubjects.map((studentSubject) => {
                        const subject = subjects.find(
                          (s) => s.id === studentSubject.subjectId
                        );
                        const types = subjectTypes.filter(
                          (t) =>
                            t.subjectId === studentSubject.subjectId &&
                            studentSubject.subjectTypeIds.includes(t.id)
                        );

                        return (
                          <div
                            key={studentSubject.subjectId}
                            className="border rounded-md p-3 bg-muted/10"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium">{subject?.name}</h5>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeSubject(studentSubject.subjectId)
                                }
                                className="h-7 w-7 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {types.map((type) => (
                                <Badge
                                  key={type.id}
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
              </div>
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
              リセット
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={
                isBranchesLoading || isStudentTypesLoading || isSubmitting
              }
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? "保存中..." : "作成中..."}
                </>
              ) : (
                <>{isEditing ? "変更を保存" : "生徒を作成"}</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
