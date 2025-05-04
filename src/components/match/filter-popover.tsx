import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Subject, Evaluation, Grade, StudentType } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TeacherFilterParams, StudentFilterParams } from "./types";

interface FilterPopoverProps {
  subjects: Subject[];
  evaluations?: Evaluation[];
  grades?: Grade[];
  studentTypes?: StudentType[];
  
  onTeacherFiltersChange?: (params: TeacherFilterParams) => void;
  onStudentFiltersChange?: (params: StudentFilterParams) => void;
  
  initialSubjectFilters?: string[];
  initialEvaluationFilters?: string[];
  initialGradeFilter?: string | null;
  initialSchoolTypeFilter?: string | null;
  initialStudentTypeFilters?: string[];
  
  entityType: "teacher" | "student";
}

export default function FilterPopover({
  subjects,
  evaluations = [],
  grades = [],
  studentTypes = [],
  
  onTeacherFiltersChange,
  onStudentFiltersChange,
  
  initialSubjectFilters = [],
  initialEvaluationFilters = [],
  initialGradeFilter = null,
  initialSchoolTypeFilter = null,
  initialStudentTypeFilters = [],
  
  entityType = "teacher",
}: FilterPopoverProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const [localSubjectFilters, setLocalSubjectFilters] = useState<string[]>(initialSubjectFilters);
  const [localEvaluationFilters, setLocalEvaluationFilters] = useState<string[]>(initialEvaluationFilters);
  const [localGradeFilter, setLocalGradeFilter] = useState<string | null>(initialGradeFilter);
  const [localSchoolTypeFilter, setLocalSchoolTypeFilter] = useState<string | null>(initialSchoolTypeFilter);
  const [localStudentTypeFilters, setLocalStudentTypeFilters] = useState<string[]>(initialStudentTypeFilters);
  const [activeTab, setActiveTab] = useState("subjects");
  
  // Обработчик для переключения фильтра по предмету
  const toggleSubjectFilter = (subjectId: string) => {
    let newFilters: string[];
    
    if (localSubjectFilters.includes(subjectId)) {
      newFilters = localSubjectFilters.filter(id => id !== subjectId);
    } else {
      newFilters = [...localSubjectFilters, subjectId];
    }
    
    setLocalSubjectFilters(newFilters);
  };

  // Обработчик для переключения фильтра по оценке
  const toggleEvaluationFilter = (evaluationId: string) => {
    let newFilters: string[];
    
    if (localEvaluationFilters.includes(evaluationId)) {
      newFilters = localEvaluationFilters.filter(id => id !== evaluationId);
    } else {
      newFilters = [...localEvaluationFilters, evaluationId];
    }
    
    setLocalEvaluationFilters(newFilters);
  };

  // Обработчик для переключения фильтра по типу студента
  const toggleStudentTypeFilter = (studentTypeId: string) => {
    let newFilters: string[];
    
    if (localStudentTypeFilters.includes(studentTypeId)) {
      newFilters = localStudentTypeFilters.filter(id => id !== studentTypeId);
    } else {
      newFilters = [...localStudentTypeFilters, studentTypeId];
    }
    
    setLocalStudentTypeFilters(newFilters);
  };

  // Обработчик для фильтра по типу школы
  // const handleSchoolTypeFilterChange = (value: string | null) => {
  //   setLocalSchoolTypeFilter(value);
  // };

  // Обработчик для фильтра по классу
  const handleGradeFilterChange = (value: string | null) => {
    setLocalGradeFilter(value);
  };

  // Очистка всех фильтров
  const clearFilters = () => {
    setLocalSubjectFilters([]);
    setLocalEvaluationFilters([]);
    setLocalGradeFilter(null);
    setLocalSchoolTypeFilter(null);
    setLocalStudentTypeFilters([]);
    
    if (entityType === "teacher" && onTeacherFiltersChange) {
      onTeacherFiltersChange({});
    } else if (entityType === "student" && onStudentFiltersChange) {
      onStudentFiltersChange({});
    }
    setShowFilterMenu(false);
  };

  // Применение фильтров - теперь используем разные обработчики в зависимости от типа сущности
  const applyFilters = () => {
    if (entityType === "teacher" && onTeacherFiltersChange) {
      const teacherFilterParams: TeacherFilterParams = {};
      if (localSubjectFilters.length > 0) {
        teacherFilterParams.subjectId = [...localSubjectFilters];
      }
      if (localEvaluationFilters.length > 0) {
        teacherFilterParams.evaluationId = [...localEvaluationFilters];
      }    
      onTeacherFiltersChange(teacherFilterParams);
    } else if (entityType === "student" && onStudentFiltersChange) {
      const studentFilterParams: StudentFilterParams = {};
      if (localSubjectFilters.length > 0) {
        studentFilterParams.preferredSubjectId = [...localSubjectFilters];
      }
      if (localStudentTypeFilters.length > 0) {
        studentFilterParams.studentTypeId = [...localStudentTypeFilters];
      }
      if (localGradeFilter) {
        studentFilterParams.gradeId = localGradeFilter;
      }
      if (localSchoolTypeFilter) {
        studentFilterParams.schoolType = localSchoolTypeFilter;
      }
      onStudentFiltersChange(studentFilterParams);
    }
    
    setShowFilterMenu(false);
  };

  // Синхронизация с внешними фильтрами при открытии меню
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalSubjectFilters([...initialSubjectFilters]);
      setLocalEvaluationFilters([...initialEvaluationFilters]);
      setLocalGradeFilter(initialGradeFilter);
      setLocalSchoolTypeFilter(initialSchoolTypeFilter);
      setLocalStudentTypeFilters([...initialStudentTypeFilters]);
    }
    setShowFilterMenu(open);
  };

  // Проверка, применены ли фильтры (используем внешние значения)
  const isFiltersApplied = 
    initialSubjectFilters.length > 0 ||
    initialEvaluationFilters.length > 0 ||
    initialGradeFilter !== null ||
    initialSchoolTypeFilter !== null ||
    initialStudentTypeFilters.length > 0;

  const getTabList = () => {
    if (entityType === "teacher") {
      return (
        <TabsList className="grid grid-cols-2 w-full mb-2">
          <TabsTrigger value="subjects">科目</TabsTrigger>
          <TabsTrigger value="status">状態</TabsTrigger>
        </TabsList>
      );
    } else {
      return (
        <TabsList className="grid grid-cols-3 w-full mb-2">
          <TabsTrigger value="subjects">科目</TabsTrigger>
          <TabsTrigger value="school">学校</TabsTrigger>
          <TabsTrigger value="status">状態</TabsTrigger>
        </TabsList>
      );
    }
  };

  return (
    <Popover open={showFilterMenu} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant={isFiltersApplied ? "default" : "outline"} 
          size="icon"
          className={isFiltersApplied ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <Filter size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <div className="font-medium pb-1">フィルタ</div>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            {getTabList()}
            
            {/* Вкладка с предметами */}
            <TabsContent value="subjects" className="space-y-4">
              {/* Добавляем чекбокс "Все" для предметов */}
              <div className="flex items-center space-x-2 mb-2 border-b pb-2">
                <Checkbox 
                  id="subject-all" 
                  checked={localSubjectFilters.length === 0}
                  onCheckedChange={() => setLocalSubjectFilters([])}
                />
                <Label htmlFor="subject-all" className="font-medium">すべての科目</Label>
              </div>
              
              {subjects.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-2">
                    {/* Чекбоксы для предметов */}
                    {subjects.map((subject) => (
                      <div className="flex items-center space-x-2" key={subject.subjectId}>
                        <Checkbox 
                          id={`subject-${subject.subjectId}`} 
                          checked={localSubjectFilters.includes(subject.subjectId)}
                          onCheckedChange={() => toggleSubjectFilter(subject.subjectId)}
                        />
                        <Label htmlFor={`subject-${subject.subjectId}`}>{subject.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {subjects.length === 0 && (
                <div className="text-center text-gray-500 py-2">
                  科目がありません
                </div>
              )}
            </TabsContent>
            
            {/* Вкладка со школами и классами - только для учеников */}
            {entityType === "student" && (
              <TabsContent value="school" className="space-y-4">
                {/* Классы/Года */}
                {grades.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="text-sm font-medium">学年</div>
                    <RadioGroup 
                      value={localGradeFilter || ""} 
                      onValueChange={(value) => handleGradeFilterChange(value === "" ? null : value)}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <RadioGroupItem value="" id="grade-all" />
                        <Label htmlFor="grade-all">すべて</Label>
                      </div>
                      {grades.map((grade) => (
                        <div className="flex items-center space-x-2" key={grade.gradeId}>
                          <RadioGroupItem value={grade.gradeId} id={`grade-${grade.gradeId}`} />
                          <Label htmlFor={`grade-${grade.gradeId}`}>{grade.name}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </TabsContent>
            )}
            
            {/* Вкладка со статусами */}
            <TabsContent value="status" className="space-y-4">
              {/* Для учителей показываем оценки */}
              {entityType === "teacher" && evaluations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2 border-b pb-2">
                    <Checkbox 
                      id="evaluation-all" 
                      checked={localEvaluationFilters.length === 0}
                      onCheckedChange={() => setLocalEvaluationFilters([])}
                    />
                    <Label htmlFor="evaluation-all" className="font-medium">すべての評価</Label>
                  </div>
                  
                  <div className="text-sm font-medium">評価</div>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Чекбоксы для оценок */}
                    {evaluations.map((evaluation) => (
                      <div className="flex items-center space-x-2" key={evaluation.evaluationId}>
                        <Checkbox 
                          id={`evaluation-${evaluation.evaluationId}`} 
                          checked={localEvaluationFilters.includes(evaluation.evaluationId)}
                          onCheckedChange={() => toggleEvaluationFilter(evaluation.evaluationId)}
                        />
                        <Label htmlFor={`evaluation-${evaluation.evaluationId}`}>{evaluation.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Для студентов показываем типы студентов */}
              {entityType === "student" && studentTypes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2 border-b pb-2">
                    <Checkbox 
                      id="student-type-all" 
                      checked={localStudentTypeFilters.length === 0}
                      onCheckedChange={() => setLocalStudentTypeFilters([])}
                    />
                    <Label htmlFor="student-type-all" className="font-medium">すべての生徒タイプ</Label>
                  </div>
                  
                  <div className="text-sm font-medium">生徒タイプ</div>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Чекбоксы для типов студентов */}
                    {studentTypes.map((type) => (
                      <div className="flex items-center space-x-2" key={type.studentTypeId}>
                        <Checkbox 
                          id={`student-type-${type.studentTypeId}`} 
                          checked={localStudentTypeFilters.includes(type.studentTypeId)}
                          onCheckedChange={() => toggleStudentTypeFilter(type.studentTypeId)}
                        />
                        <Label htmlFor={`student-type-${type.studentTypeId}`}>{type.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-between p-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            disabled={!isFiltersApplied}
          >
            リセット
          </Button>
          <Button 
            size="sm" 
            onClick={applyFilters}
          >
            適用
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}