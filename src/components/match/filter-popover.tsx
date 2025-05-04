import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  
  onGradeFilterChange?: (gradeId: string | null) => void;
  onSchoolTypeFilterChange?: (schoolType: string | null) => void;
  onEvaluationFilterChange?: (evaluationId: string | null) => void;
  onSubjectFilterChange?: (subjectId: string | null) => void;
  
  initialGradeFilter?: string | null;
  initialSchoolTypeFilter?: string | null;
  initialEvaluationFilter?: string | null;
  initialSubjectFilter?: string | null;
  
  // Указывает, для какого типа сущностей отображается фильтр (учитель или ученик)
  entityType: "teacher" | "student";
}

export default function FilterPopover({
  subjects,
  evaluations = [],
  grades = [],
  examSchoolTypes = ["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"],
  
  onGradeFilterChange,
  onSchoolTypeFilterChange,
  onEvaluationFilterChange,
  onSubjectFilterChange,
  
  initialGradeFilter = null,
  initialSchoolTypeFilter = null,
  initialEvaluationFilter = null,
  initialSubjectFilter = null,
  
  entityType = "teacher",
}: FilterPopoverProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(initialSubjectFilter);
  const [gradeFilter, setGradeFilter] = useState<string | null>(initialGradeFilter);
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string | null>(initialSchoolTypeFilter);
  const [evaluationFilter, setEvaluationFilter] = useState<string | null>(initialEvaluationFilter);
  const [activeTab, setActiveTab] = useState("subjects");
  
  // Синхронизируем состояние с начальными значениями при их изменении
  useEffect(() => {
    setSubjectFilter(initialSubjectFilter);
  }, [initialSubjectFilter]);
  
  useEffect(() => {
    setEvaluationFilter(initialEvaluationFilter);
  }, [initialEvaluationFilter]);

  // Обработчик для фильтра по предмету
  const handleSubjectFilterChange = (value: string | null) => {
    setSubjectFilter(value);
    if (onSubjectFilterChange) {
      onSubjectFilterChange(value);
    }
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
    setSubjectFilter(null);
    setGradeFilter(null);
    setSchoolTypeFilter(null);
    setEvaluationFilter(null);
    
    if (onGradeFilterChange) onGradeFilterChange(null);
    if (onSchoolTypeFilterChange) onSchoolTypeFilterChange(null);
    if (onEvaluationFilterChange) onEvaluationFilterChange(null);
    if (onSubjectFilterChange) onSubjectFilterChange(null);
    
    setShowFilterMenu(false);
  };

  // Применение фильтров
  const applyFilters = () => {
    // Все фильтры уже применяются в реальном времени, просто закрываем меню
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
    subjectFilter !== null ||
    gradeFilter !== null ||
    schoolTypeFilter !== null ||
    evaluationFilter !== null;

  // Определяем, какие вкладки показывать в зависимости от типа сущности
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
            {getTabList()}
            
            {/* Вкладка с предметами */}
            <TabsContent value="subjects" className="space-y-4">
              {subjects.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <RadioGroup 
                    value={subjectFilter || ""} 
                    onValueChange={(value) => handleSubjectFilterChange(value === "" ? null : value)}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      {/* Опция "Все" */}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="" id="subject-all" />
                        <Label htmlFor="subject-all">すべて</Label>
                      </div>
                      {subjects.map((subject) => (
                        <div className="flex items-center space-x-2" key={subject.subjectId}>
                          <RadioGroupItem 
                            value={subject.subjectId} 
                            id={`subject-${subject.subjectId}`} 
                          />
                          <Label htmlFor={`subject-${subject.subjectId}`}>{subject.name}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
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
            )}
            
            {/* Вкладка со статусами */}
            <TabsContent value="status" className="space-y-4">
              {/* Оценки учителей - только для учителей */}
              {entityType === "teacher" && evaluations.length > 0 && (
                <div className="space-y-2">
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
            閉じる
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}