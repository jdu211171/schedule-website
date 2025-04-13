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
import { Subject, Evaluation, Grade, StudentType, ExamSchoolCategoryType } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FilterPopoverProps {
  subjects: Subject[];
  evaluations?: Evaluation[];
  grades?: Grade[];
  studentTypes?: StudentType[];
  examSchoolTypes?: ExamSchoolCategoryType[];
  
  onFilterChange: (subjectFilters: string[], hasLessonsFilter: boolean | null) => void;
  onGradeFilterChange?: (gradeId: string | null) => void;
  onSchoolTypeFilterChange?: (schoolType: string | null) => void;
  onEvaluationFilterChange?: (evaluationId: string | null) => void;
  
  initialSubjectFilters?: string[];
  initialHasLessonsFilter?: boolean | null;
  initialGradeFilter?: string | null;
  initialSchoolTypeFilter?: string | null;
  initialEvaluationFilter?: string | null;
}

export default function FilterPopover({
  subjects,
  evaluations = [],
  grades = [],
  studentTypes = [],
  examSchoolTypes = ["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"],
  
  onFilterChange,
  onGradeFilterChange,
  onSchoolTypeFilterChange,
  onEvaluationFilterChange,
  
  initialSubjectFilters = [],
  initialHasLessonsFilter = null,
  initialGradeFilter = null,
  initialSchoolTypeFilter = null,
  initialEvaluationFilter = null,
}: FilterPopoverProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [subjectFilters, setSubjectFilters] = useState<string[]>(initialSubjectFilters);
  const [hasLessonsFilter, setHasLessonsFilter] = useState<boolean | null>(initialHasLessonsFilter);
  const [gradeFilter, setGradeFilter] = useState<string | null>(initialGradeFilter);
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string | null>(initialSchoolTypeFilter);
  const [evaluationFilter, setEvaluationFilter] = useState<string | null>(initialEvaluationFilter);
  const [activeTab, setActiveTab] = useState("subjects");

  // Обработчик для переключения фильтров предметов
  const toggleSubjectFilter = (subject: Subject) => {
    if (subjectFilters.includes(subject.subjectId)) {
      setSubjectFilters(subjectFilters.filter((s) => s !== subject.subjectId));
    } else {
      setSubjectFilters([...subjectFilters, subject.subjectId]);
    }
  };

  // Обработчик для фильтра по наличию уроков
  const toggleHasLessonsFilter = (value: boolean | null) => {
    setHasLessonsFilter(value);
  };

  // Обработчик для фильтра по типу школы
  const handleSchoolTypeFilterChange = (value: string | null) => {
    setSchoolTypeFilter(value);
    if (onSchoolTypeFilterChange) {
      onSchoolTypeFilterChange(value);
    }
  };

  // Обработчик для фильтра по классу
  const handleGradeFilterChange = (value: string | null) => {
    setGradeFilter(value);
    if (onGradeFilterChange) {
      onGradeFilterChange(value);
    }
  };

  // Обработчик для фильтра по оценке
  const handleEvaluationFilterChange = (value: string | null) => {
    setEvaluationFilter(value);
    if (onEvaluationFilterChange) {
      onEvaluationFilterChange(value);
    }
  };

  // Очистка всех фильтров
  const clearFilters = () => {
    setSubjectFilters([]);
    setHasLessonsFilter(null);
    setGradeFilter(null);
    setSchoolTypeFilter(null);
    setEvaluationFilter(null);
    
    if (onGradeFilterChange) onGradeFilterChange(null);
    if (onSchoolTypeFilterChange) onSchoolTypeFilterChange(null);
    if (onEvaluationFilterChange) onEvaluationFilterChange(null);
  };

  // Применение фильтров
  const applyFilters = () => {
    onFilterChange(subjectFilters, hasLessonsFilter);
    setShowFilterMenu(false);
  };

  // Японские названия для типов школ
  const schoolTypeLabels: Record<string, string> = {
    "ELEMENTARY": "小学校",
    "MIDDLE": "中学校",
    "HIGH": "高校",
    "UNIVERSITY": "大学",
    "OTHER": "その他"
  };

  const isFiltersApplied = 
    subjectFilters.length > 0 || 
    hasLessonsFilter !== null ||
    gradeFilter !== null ||
    schoolTypeFilter !== null ||
    evaluationFilter !== null;

  return (
    <Popover open={showFilterMenu} onOpenChange={setShowFilterMenu}>
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
            <TabsList className="grid grid-cols-3 w-full mb-2">
              <TabsTrigger value="subjects">科目</TabsTrigger>
              <TabsTrigger value="school">学校</TabsTrigger>
              <TabsTrigger value="status">状態</TabsTrigger>
            </TabsList>
            
            {/* Вкладка с предметами */}
            <TabsContent value="subjects" className="space-y-4">
              {subjects.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-2">
                    {subjects.map((subject) => (
                      <div className="flex items-center space-x-2" key={subject.subjectId}>
                        <Checkbox 
                          id={`subject-${subject.subjectId}`} 
                          checked={subjectFilters.includes(subject.subjectId)}
                          onCheckedChange={() => toggleSubjectFilter(subject)}
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
            
            {/* Вкладка со школами и классами */}
            <TabsContent value="school" className="space-y-4">
              {/* Типы школ */}
              {examSchoolTypes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">学校種類</div>
                  <RadioGroup 
                    value={schoolTypeFilter || ""} 
                    onValueChange={(value) => handleSchoolTypeFilterChange(value === "" ? null : value)}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <RadioGroupItem value="" id="school-type-all" />
                      <Label htmlFor="school-type-all">すべて</Label>
                    </div>
                    {examSchoolTypes.map((type) => (
                      <div className="flex items-center space-x-2" key={type}>
                        <RadioGroupItem value={type} id={`school-type-${type}`} />
                        <Label htmlFor={`school-type-${type}`}>{schoolTypeLabels[type] || type}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Классы/Года */}
              {grades.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm font-medium">学年</div>
                  <RadioGroup 
                    value={gradeFilter || ""} 
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
            
            {/* Вкладка со статусами */}
            <TabsContent value="status" className="space-y-4">
              {/* Фильтр по наличию уроков */}
              <div className="space-y-2">
                <div className="text-sm font-medium">レッスン</div>
                <RadioGroup 
                  value={hasLessonsFilter === null ? "" : hasLessonsFilter ? "yes" : "no"} 
                  onValueChange={(value) => toggleHasLessonsFilter(
                    value === "" ? null : value === "yes" ? true : false
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="" id="lessons-all" />
                    <Label htmlFor="lessons-all">すべて</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="has-lessons" />
                    <Label htmlFor="has-lessons">レッスンあり</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no-lessons" />
                    <Label htmlFor="no-lessons">レッスンなし</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Оценки учителей */}
              {evaluations.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm font-medium">評価</div>
                  <RadioGroup 
                    value={evaluationFilter || ""} 
                    onValueChange={(value) => handleEvaluationFilterChange(value === "" ? null : value)}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <RadioGroupItem value="" id="evaluation-all" />
                      <Label htmlFor="evaluation-all">すべて</Label>
                    </div>
                    {evaluations.map((evaluation) => (
                      <div className="flex items-center space-x-2" key={evaluation.evaluationId}>
                        <RadioGroupItem value={evaluation.evaluationId} id={`evaluation-${evaluation.evaluationId}`} />
                        <Label htmlFor={`evaluation-${evaluation.evaluationId}`}>{evaluation.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
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