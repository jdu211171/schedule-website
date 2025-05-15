import { useState, useEffect, useRef } from "react";
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

interface SubjectTypePair {
  subjectId: string;
  subjectTypeId: string;
}

interface TeacherSubjectSelectorProps {
  form: UseFormReturn<any>;
  subjects: SubjectCompat[];
  initialSubjectPairs?: SubjectTypePair[];
}

export function TeacherSubjectSelector({
  form,
  subjects,
  initialSubjectPairs = [],
}: TeacherSubjectSelectorProps) {
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
  const [subjectPairs, setSubjectPairs] = useState<SubjectTypePair[]>(initialSubjectPairs);
  const [error, setError] = useState<string | null>(null);

  // Update form when subject pairs change
  useEffect(() => {
    form.setValue("subjectPairs", subjectPairs);
  }, [subjectPairs, form]);

  // Initialize subject pairs from prop
  useEffect(() => {
    if (initialSubjectPairs.length > 0) {
      setSubjectPairs(initialSubjectPairs);
    }
  }, [initialSubjectPairs]);

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
    setSubjectSearchTerm(""); // Reset search term after selection
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

  // Add selected subject-type pairs
  const addSubjectTypePairs = () => {
    if (!selectedSubject || selectedTypeIds.length === 0) {
      setError("科目と少なくとも1つの科目タイプを選択してください");
      return;
    }
    
    const newPairs = selectedTypeIds.map(typeId => ({
      subjectId: selectedSubject.subjectId,
      subjectTypeId: typeId,
    }));
    
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
    
    setSubjectPairs([...subjectPairs, ...newPairs]);
    setSelectedSubject(null);
    setSelectedTypeIds([]);
    setError(null);
  };

  // Remove a subject-type pair
  const removeSubjectPair = (index: number) => {
    const newPairs = [...subjectPairs];
    newPairs.splice(index, 1);
    setSubjectPairs(newPairs);
  };

  // Get subject name by ID
  const getSubjectNameById = (subjectId: string) => {
    const subject = subjects.find(s => s.subjectId === subjectId);
    return subject ? subject.name : subjectId;
  };

  // Get subject type name by ID
  const getSubjectTypeNameById = (subjectId: string, typeId: string) => {
    const subject = subjects.find(s => s.subjectId === subjectId);
    if (!subject || !subject.subjectToSubjectTypes) return typeId;
    
    const typeRelation = subject.subjectToSubjectTypes.find(
      rel => rel.subjectType.subjectTypeId === typeId
    );
    
    return typeRelation ? typeRelation.subjectType.name : typeId;
  };

  return (
    <FormField
      control={form.control}
      name="subjectPairs"
      render={({ field }) => (
        <FormItem className="h-full space-y-4">
          <FormLabel>担当科目と科目種別</FormLabel>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-12 gap-3">
                {/* Subject Selection */}
                <div className="col-span-8" ref={subjectDropdownRef}>
                  <FormLabel className="text-sm mb-2 block">科目</FormLabel>
                  
                  {/* Subject Dropdown Trigger */}
                  <div 
                    className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    onClick={() => setShowSubjectDropdown(true)}
                  >
                    <span className={selectedSubject ? "text-foreground" : "text-muted-foreground"}>
                      {selectedSubject ? selectedSubject.name : "科目を選択..."}
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
                  
                  {/* Subject Dropdown */}
                  {showSubjectDropdown && (
                    <div className="absolute z-50 w-[calc(66.666%-0.75rem)] mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                      {/* Search Field */}
                      <div className="flex items-center border-b p-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          placeholder="科目を検索..."
                          value={subjectSearchTerm}
                          onChange={(e) => setSubjectSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      {/* Subjects List */}
                      <div className="max-h-[200px] overflow-auto p-1">
                        {getFilteredSubjects().length > 0 ? (
                          getFilteredSubjects().map((subject) => (
                            <div
                              key={subject.subjectId}
                              className="flex w-full items-center rounded-sm px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
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
                
                {/* Add Button */}
                <div className="col-span-4 flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
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
                
                {/* Type Dropdown Trigger */}
                <div 
                  className={`flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedSubject ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                  onClick={() => selectedSubject && setShowTypeDropdown(true)}
                >
                  <span className={selectedTypeIds.length > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {selectedTypeIds.length > 0 
                      ? (selectedTypeIds.length === 1 
                        ? getAvailableSubjectTypes().find(t => t.id === selectedTypeIds[0])?.name
                        : `${selectedTypeIds.length} 個の科目タイプを選択`) 
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
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
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
                        onClick={() => removeSubjectPair(index)}
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