import { useState, useEffect, useRef, useMemo } from "react";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UseFormReturn } from "react-hook-form";
import { Search } from "lucide-react";

/**
 * Interface for compatible Subject structure
 */
interface SubjectCompat {
  subjectId: string;
  name: string;
  subjectTypeId?: string;
  notes?: string | null;
  subjectToSubjectTypes?: Array<{
    subjectTypeId: string;
    subjectType: {
      subjectTypeId: string;
      name: string;
    };
  }>;
}

/**
 * Interface for subject-type pair
 */
interface SubjectTypePair {
  subjectId: string;
  subjectTypeId: string;
}

/**
 * Props for StudentSubjectSelector component
 */
interface StudentSubjectSelectorProps {
  form: UseFormReturn<any>;
  subjects: SubjectCompat[];
  initialSubjectPairs?: SubjectTypePair[];
  fieldName?: string;
}

/**
 * Component for selecting subjects and subject types for students
 */
export function StudentSubjectSelector({
  form,
  subjects,
  initialSubjectPairs = [],
  fieldName = "preferredSubjects"
}: StudentSubjectSelectorProps) {
  // Refs for clicking outside
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Subject selection state
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectCompat | null>(null);
  
  // Type selection state
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [typeSearchTerm, setTypeSearchTerm] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  
  // Pairs and errors
  const [subjectPairs, setSubjectPairs] = useState<SubjectTypePair[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create maps for fast ID lookup
  const subjectMap = useMemo(() => {
    const map = new Map<string, SubjectCompat>();
    subjects.forEach(subject => {
      map.set(subject.subjectId, subject);
    });
    return map;
  }, [subjects]);

  const subjectTypeMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    subjects.forEach(subject => {
      const typeMap = new Map<string, string>();
      if (subject.subjectToSubjectTypes) {
        subject.subjectToSubjectTypes.forEach(rel => {
          typeMap.set(rel.subjectTypeId, rel.subjectType.name);
        });
      }
      map.set(subject.subjectId, typeMap);
    });
    return map;
  }, [subjects]);

  // Filter initial pairs to validate them
  const validInitialPairs = useMemo(() => {
    return initialSubjectPairs.filter(pair => {
      const subjectExists = subjectMap.has(pair.subjectId);
      const typeExists = subjectExists && 
                         subjectTypeMap.get(pair.subjectId)?.has(pair.subjectTypeId);
      return subjectExists && typeExists;
    });
  }, [initialSubjectPairs, subjectMap, subjectTypeMap]);

  // Initialize with valid initial pairs once
  useEffect(() => {
    if (validInitialPairs.length > 0 && subjectPairs.length === 0) {
      setSubjectPairs(validInitialPairs);
      // Обновляем форму напрямую, но только один раз при инициализации
      form.setValue(fieldName, validInitialPairs, { shouldDirty: true });
    }
  }, [validInitialPairs, form, fieldName, subjectPairs.length]);

  // Синхронизируем форму при изменении subjectPairs
  useEffect(() => {
    form.setValue(fieldName, subjectPairs, { shouldDirty: true });
  }, [subjectPairs, form, fieldName]);

  // Reset selected types when subject changes
  useEffect(() => {
    setSelectedTypeIds([]);
    setError(null);
  }, [selectedSubject]);

  // Handle clicks outside the dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        subjectDropdownRef.current && 
        !subjectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSubjectDropdown(false);
      }
      
      if (
        typeDropdownRef.current && 
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get filtered subjects based on search
  const getFilteredSubjects = () => {
    if (!subjectSearchTerm.trim()) return subjects;
    return subjects.filter(subject => 
      subject.name.toLowerCase().includes(subjectSearchTerm.toLowerCase())
    );
  };

  // Get available subject types for selected subject
  const getAvailableSubjectTypes = () => {
    if (!selectedSubject || !selectedSubject.subjectToSubjectTypes) return [];
    return selectedSubject.subjectToSubjectTypes.map(rel => ({
      id: rel.subjectType.subjectTypeId,
      name: rel.subjectType.name,
    }));
  };

  // Get filtered subject types based on search
  const getFilteredSubjectTypes = () => {
    const types = getAvailableSubjectTypes();
    if (!typeSearchTerm.trim()) return types;
    return types.filter(type => 
      type.name.toLowerCase().includes(typeSearchTerm.toLowerCase())
    );
  };

  // Select a subject
  const handleSubjectSelect = (subject: SubjectCompat) => {
    setSelectedSubject(subject);
    setShowSubjectDropdown(false);
    setSubjectSearchTerm(subject.name); // Set the search input to the selected subject name
  };

  // Toggle type selection
  const toggleTypeSelection = (typeId: string) => {
    setSelectedTypeIds(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  // Validate a subject-type pair
  const isValidPair = (subjectId: string, typeId: string): boolean => {
    const subjectExists = subjectMap.has(subjectId);
    if (!subjectExists) return false;
    
    const typeMap = subjectTypeMap.get(subjectId);
    if (!typeMap) return false;
    
    return typeMap.has(typeId);
  };

  // Add selected subject-type pairs with validation
  const addSubjectTypePairs = () => {
    if (!selectedSubject || selectedTypeIds.length === 0) {
      setError("科目と少なくとも1つの科目タイプを選択してください");
      return;
    }
    
    // Check validity of new pairs
    const newPairs = selectedTypeIds
      .filter(typeId => isValidPair(selectedSubject.subjectId, typeId))
      .map(typeId => ({
        subjectId: selectedSubject.subjectId,
        subjectTypeId: typeId,
      }));
    
    // Check for duplicates
    const duplicates = newPairs.filter(newPair => 
      subjectPairs.some(
        existingPair => 
          existingPair.subjectId === newPair.subjectId && 
          existingPair.subjectTypeId === newPair.subjectTypeId
      )
    );
    
    if (duplicates.length > 0) {
      setError("選択した組み合わせは既に追加されています");
      return;
    }
    
    // Check for invalid pairs
    if (newPairs.length < selectedTypeIds.length) {
      setError("一部の選択された組み合わせは無効です");
      return;
    }
    
    // Обновляем состояние и форму
    setSubjectPairs([...subjectPairs, ...newPairs]);
    
    // Очищаем временные данные
    setSelectedSubject(null);
    setSelectedTypeIds([]);
    setSubjectSearchTerm("");
    setError(null);
  };

  // Remove a subject-type pair
  const removeSubjectPair = (index: number) => {
    // Прямое обновление состояния, без зависимости от текущего значения
    const updatedPairs = [...subjectPairs];
    updatedPairs.splice(index, 1);
    
    // Обязательно обновляем оба - и локальное состояние и значение в форме
    setSubjectPairs(updatedPairs);
    form.setValue(fieldName, updatedPairs, { shouldDirty: true, shouldValidate: true });
  };

  // Get subject name by ID with validation
  const getSubjectNameById = (subjectId: string) => {
    const subject = subjectMap.get(subjectId);
    return subject ? subject.name : subjectId;
  };

  // Get subject type name by ID with validation
  const getSubjectTypeNameById = (subjectId: string, typeId: string) => {
    const typeMap = subjectTypeMap.get(subjectId);
    if (!typeMap) return typeId;
    
    const typeName = typeMap.get(typeId);
    return typeName ? typeName : typeId;
  };

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormLabel>希望科目と科目種別</FormLabel>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-12 gap-3">
                {/* Subject Selection */}
                <div className="col-span-8" ref={subjectDropdownRef}>
                  <FormLabel className="text-sm mb-2 block">科目</FormLabel>
                  
                  {/* Subject Search Input */}
                  <div className="relative">
                    <div className="flex w-full items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        className="flex-1 h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="科目を検索..."
                        value={subjectSearchTerm}
                        onChange={(e) => {
                          setSubjectSearchTerm(e.target.value);
                          setShowSubjectDropdown(true);
                        }}
                        onFocus={() => setShowSubjectDropdown(true)}
                      />
                    </div>
                    
                    {/* Subject Dropdown */}
                    {showSubjectDropdown && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                        <div className="max-h-[200px] overflow-auto p-1">
                          {getFilteredSubjects().length > 0 ? (
                            getFilteredSubjects().map((subject) => (
                              <div
                                key={subject.subjectId}
                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={() => handleSubjectSelect(subject)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`mr-2 h-4 w-4 ${
                                    selectedSubject?.subjectId === subject.subjectId
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                >
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                {subject.name}
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-sm">科目が見つかりません</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Add Button */}
                <div className="col-span-4 flex items-end">
                  <Button
                    type="button"
                    className="w-full h-9" // Высота кнопки 36px (h-9)
                    onClick={addSubjectTypePairs}
                    disabled={!selectedSubject || selectedTypeIds.length === 0}
                  >
                    追加
                  </Button>
                </div>
              </div>
              
              {/* Subject Type Selection */}
              <div ref={typeDropdownRef}>
                <FormLabel className="text-sm mb-2 block">科目タイプ</FormLabel>
                
                {/* Type Selection Input */}
                <div 
                  className={`flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background h-9 ${selectedSubject ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                  onClick={() => selectedSubject && setShowTypeDropdown(true)}
                >
                  <span className={selectedTypeIds.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {selectedTypeIds.length > 0 
                      ? `${selectedTypeIds.length} 個の科目タイプを選択` 
                      : "科目タイプを選択..."}
                  </span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="ml-2 h-4 w-4 opacity-50"
                  >
                    <path d="m7 15 5 5 5-5"></path>
                    <path d="m7 9 5-5 5 5"></path>
                  </svg>
                </div>
                
                {/* Type Dropdown */}
                {showTypeDropdown && selectedSubject && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none max-w-[320px]">
                    {/* Type Search Field */}
                    <div className="flex items-center border-b p-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="科目タイプを検索..."
                        value={typeSearchTerm}
                        onChange={(e) => setTypeSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    {/* Selected Types */}
                    {selectedTypeIds.length > 0 && (
                      <div className="border-b p-2">
                        <div className="text-sm text-muted-foreground mb-1">選択済み</div>
                        <div className="flex flex-wrap gap-1">
                          {getAvailableSubjectTypes()
                            .filter(type => selectedTypeIds.includes(type.id))
                            .map(type => (
                              <div 
                                key={type.id} 
                                className="flex items-center bg-accent rounded-md px-2 py-1 text-sm"
                              >
                                {type.name}
                                <button
                                  type="button"
                                  className="h-4 w-4 p-0 ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTypeSelection(type.id);
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Type Checkboxes */}
                    <div className="max-h-[200px] overflow-auto p-1">
                      {getFilteredSubjectTypes().length > 0 ? (
                        getFilteredSubjectTypes().map((type) => (
                          <div key={type.id} className="flex items-center rounded-sm px-2 py-1 hover:bg-accent">
                            <label className="flex items-center w-full cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={selectedTypeIds.includes(type.id)}
                                onChange={() => toggleTypeSelection(type.id)}
                                className="mr-2 h-4 w-4 rounded border-gray-300 focus:ring-offset-background"
                              />
                              {type.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-sm">
                          {selectedSubject 
                            ? "科目タイプが見つかりません" 
                            : "科目を選択すると、選択可能な科目タイプが表示されます"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Error Message */}
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Selected Subject-Type Pairs */}
            <div>
              <FormLabel className="text-sm mb-2 block">選択した科目</FormLabel>
              <div className="p-3 border rounded-md flex flex-wrap gap-2 min-h-12">
                {subjectPairs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">科目が選択されていません</p>
                ) : (
                  subjectPairs.map((pair, index) => (
                    <div
                      key={`${pair.subjectId}-${pair.subjectTypeId}-${index}`}
                      className="flex items-center bg-accent rounded-md px-2 py-1 text-sm"
                    >
                      <span>
                        {getSubjectNameById(pair.subjectId)} - {getSubjectTypeNameById(pair.subjectId, pair.subjectTypeId)}
                      </span>
                      <button
                        type="button"
                        className="h-4 w-4 p-0 ml-1"
                        aria-label="削除"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSubjectPair(index);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Props for TeacherSelector component
 */
interface TeacherSelectorProps {
  form: UseFormReturn<any>;
  teachers: Array<{ teacherId: string; name: string }>;
  initialTeachers?: string[];
  fieldName?: string;
}

/**
 * Component for selecting preferred teachers
 */
export function TeacherSelector({
  form,
  teachers,
  initialTeachers = [],
  fieldName = "preferredTeachers"
}: TeacherSelectorProps) {
  // Teacher search and selection
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize with valid initial teachers once
  useEffect(() => {
    if (initialTeachers.length > 0 && selectedTeachers.length === 0) {
      const validTeacherIds = initialTeachers.filter(id => 
        teachers.some(teacher => teacher.teacherId === id)
      );
      
      if (validTeacherIds.length > 0) {
        setSelectedTeachers(validTeacherIds);
        // Обновляем форму напрямую, но только один раз при инициализации
        form.setValue(fieldName, validTeacherIds, { shouldDirty: true });
      }
    }
  }, [initialTeachers, teachers, form, fieldName, selectedTeachers.length]);

  // Синхронизируем форму при изменении selectedTeachers
  useEffect(() => {
    form.setValue(fieldName, selectedTeachers, { shouldDirty: true });
  }, [selectedTeachers, form, fieldName]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        teacherDropdownRef.current && 
        !teacherDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTeacherDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter teachers based on search term
  const getFilteredTeachers = () => {
    if (!teacherSearchTerm.trim()) return teachers;
    return teachers.filter(teacher => 
      teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
    );
  };

  // Toggle teacher selection
  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeachers(prev => {
      if (prev.includes(teacherId)) {
        return prev.filter(id => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  // Get teacher name by ID
  const getTeacherNameById = (teacherId: string) => {
    const teacher = teachers.find(t => t.teacherId === teacherId);
    return teacher ? teacher.name : teacherId;
  };

  // Remove a teacher from selection
  const removeTeacher = (teacherId: string) => {
    // Прямое обновление состояния и формы
    const updatedTeachers = selectedTeachers.filter(id => id !== teacherId);
    setSelectedTeachers(updatedTeachers);
    form.setValue(fieldName, updatedTeachers, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="space-y-4">
          <FormLabel>希望講師</FormLabel>
          
          <div className="space-y-4">
            {/* Teacher Selection */}
            <div ref={teacherDropdownRef}>
              <div className="relative">
                <div className="flex w-full items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    className="flex-1 h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="講師を検索..."
                    value={teacherSearchTerm}
                    onChange={(e) => {
                      setTeacherSearchTerm(e.target.value);
                      setShowTeacherDropdown(true);
                    }}
                    onFocus={() => setShowTeacherDropdown(true)}
                  />
                </div>
                
                {/* Teacher Dropdown */}
                {showTeacherDropdown && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                    <div className="max-h-[200px] overflow-auto p-1">
                      {getFilteredTeachers().length > 0 ? (
                        getFilteredTeachers().map((teacher) => (
                          <div key={teacher.teacherId} className="flex items-center rounded-sm px-2 py-1 hover:bg-accent">
                            <label className="flex items-center w-full cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={selectedTeachers.includes(teacher.teacherId)}
                                onChange={() => toggleTeacherSelection(teacher.teacherId)}
                                className="mr-2 h-4 w-4 rounded border-gray-300 focus:ring-offset-background"
                              />
                              {teacher.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-sm">講師が見つかりません</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected Teachers */}
            <div>
              <FormLabel className="text-sm mb-2 block">選択した講師</FormLabel>
              <div className="p-3 border rounded-md flex flex-wrap gap-2 min-h-12">
                {selectedTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">講師が選択されていません</p>
                ) : (
                  selectedTeachers.map((teacherId, index) => (
                    <div
                      key={`${teacherId}-${index}`}
                      className="flex items-center bg-accent rounded-md px-2 py-1 text-sm"
                    >
                      <span>{getTeacherNameById(teacherId)}</span>
                      <button
                        type="button"
                        className="h-4 w-4 p-0 ml-1"
                        aria-label="削除"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTeacher(teacherId);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}