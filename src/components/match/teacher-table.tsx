import { useState, useMemo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import FilterPopover from "./filter-popover";
import Pagination from "./pagination";
import SubjectBadge from "./subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DetailDialog from "./detail-dialog";

import {
  Teacher,
  Subject,
  Evaluation,
  TeacherSubject,
  ClassSession,
  TeacherFilterParams
} from "@/components/match/types";

interface EnrichedTeacher extends Teacher {
  evaluation: Evaluation | null;
  subjects: Subject[];
}

interface TeacherTableProps {
  teachers: Teacher[];
  selectedTeacherId: string | null;
  onTeacherSelect: (teacherId: string) => void;
  lessons: ClassSession[];
  subjects: Subject[];
  evaluations: Evaluation[];
  teacherSubjects: TeacherSubject[];
  selectedStudentId: string | null;
  filteredTeachers?: Teacher[];
  kibouSubjects?: Subject[];

  onTeacherFiltersChange?: (params: TeacherFilterParams) => void;
  currentSubjectFilters?: string[];
  currentEvaluationFilters?: string[];
}

export default function TeacherTable({
  teachers,
  selectedTeacherId,
  onTeacherSelect,
  subjects,
  evaluations,
  teacherSubjects,
  selectedStudentId,
  filteredTeachers,
  kibouSubjects = [],
  onTeacherFiltersChange,
  currentSubjectFilters = [],
  currentEvaluationFilters = [],
}: TeacherTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [detailsTeacher, setDetailsTeacher] = useState<EnrichedTeacher | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStudentId]);

  // Обработчик фильтров - теперь единый для всех типов фильтров
  const handleFiltersChange = (filters: TeacherFilterParams) => {
    setCurrentPage(1);

    if (onTeacherFiltersChange) {
      onTeacherFiltersChange(filters);
    }
  };

  const allSubjects = useMemo(() => subjects, [subjects]);

  const baseTeachers = useMemo(() => {
    return filteredTeachers || teachers;
  }, [filteredTeachers, teachers]);

  const enrichedTeachers = useMemo(() => {
    return baseTeachers.map((teacher) => {
      const evaluation =
        evaluations.find((e) => e.evaluationId === teacher.evaluationId) || null;

      const teacherSubjectsData = teacherSubjects.filter(
        (ts) => ts.teacherId === teacher.teacherId,
      );

      const subjectIds = new Set<string>();
      const teacherSubjectsList: Subject[] = [];

      teacherSubjectsData.forEach((ts) => {
        const subject = subjects.find((s) => s.subjectId === ts.subjectId);
        if (subject && !subjectIds.has(subject.subjectId)) {
          subjectIds.add(subject.subjectId);
          teacherSubjectsList.push(subject);
        }
      });

      return {
        ...teacher,
        evaluation,
        subjects: teacherSubjectsList,
      } as EnrichedTeacher;
    });
  }, [baseTeachers, evaluations, subjects, teacherSubjects]);

  // Локальная фильтрация только по поисковому запросу
  const filteredTeachersWithSearch = useMemo(() => {
    if (!searchTerm.trim()) {
      return enrichedTeachers;
    }

    return enrichedTeachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.university || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.faculty || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [enrichedTeachers, searchTerm]);

  const totalPages = Math.ceil(filteredTeachersWithSearch.length / itemsPerPage);

  const paginatedTeachers = filteredTeachersWithSearch.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const isKibouSubject = useCallback(
    (teacherSubject: Subject) => {
      return kibouSubjects.some(
        (kibouSubject) => kibouSubject.subjectId === teacherSubject.subjectId,
      );
    },
    [kibouSubjects],
  );

  // Проверка, применены ли фильтры
  const isFilterActive = currentSubjectFilters.length > 0 || currentEvaluationFilters.length > 0;

  // Форматирование списка активных фильтров для отображения
  const getActiveFiltersDisplay = () => {
    const activeFilters: React.ReactNode[] = [];

    if (currentSubjectFilters.length > 0) {
      const subjectNames = currentSubjectFilters.map(id =>
        subjects.find(s => s.subjectId === id)?.name || 'Unknown'
      );

      activeFilters.push(
        <Badge key="subjects" className="bg-accent/20 dark:bg-accent/10 text-foreground px-2 py-1 rounded-full text-xs">
          科目: {subjectNames.join(', ')}
        </Badge>
      );
    }

    if (currentEvaluationFilters.length > 0) {
      const evaluationNames = currentEvaluationFilters.map(id =>
        evaluations.find(e => e.evaluationId === id)?.name || 'Unknown'
      );

      activeFilters.push(
        <Badge key="evaluations" className="bg-accent/20 dark:bg-accent/10 text-foreground px-2 py-1 rounded-full text-xs">
          評価: {evaluationNames.join(', ')}
        </Badge>
      );
    }

    return activeFilters;
  };

  // Очистка всех фильтров
  const clearAllFilters = () => {
    if (onTeacherFiltersChange) {
      onTeacherFiltersChange({});
    }
  };

  return (
    <div className="rounded-md border h-full flex flex-col">
      {/* Показываем заголовок с предпочитаемыми предметами, если выбран ученик */}
      {selectedStudentId && (
        <div className="bg-accent/20 dark:bg-accent/10 p-2 border-b flex flex-wrap items-center gap-2">
          <span className="text-foreground font-medium text-sm">希望科目：</span>
          {kibouSubjects.length > 0 ? (
            kibouSubjects.map((subject) => (
              <SubjectBadge key={subject.subjectId} subject={subject} size="sm"  />
            ))
          ) : (
            <span className="text-muted-foreground text-xs italic">...</span>
          )}
        </div>
      )}

      {/* Отображаем информацию об активных фильтрах */}
      {isFilterActive && (
        <div className="bg-accent/10 dark:bg-accent/5 p-2 border-b">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-sm font-medium">アクティブフィルター：</span>
            {getActiveFiltersDisplay()}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
            >
              クリア
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 border-b flex justify-between items-center space-x-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="先生を検索..."
            className="w-full"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 "
            >
              <X size={16} />
            </button>
          )}
        </div>

        <FilterPopover
          subjects={allSubjects}
          evaluations={evaluations}
          onTeacherFiltersChange={handleFiltersChange}
          initialSubjectFilters={currentSubjectFilters}
          initialEvaluationFilters={currentEvaluationFilters}
          entityType="teacher"
        />
      </div>

      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead>先生名</TableHead>
              <TableHead>科目</TableHead>
              <TableHead>評価</TableHead>
              <TableHead className="w-16">詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTeachers.map((teacher) => {
              const teacherSubjects = teacher.subjects || [];

              return (
                <TableRow
                  key={teacher.teacherId}
                  onClick={() => onTeacherSelect(teacher.teacherId)}
                  className={`cursor-pointer ${
                    selectedTeacherId === teacher.teacherId
                      ? "bg-green-50 hover:bg-green-100 dark:bg-green-800/30 dark:hover:bg-green-800/40"
                      : "hover:bg-accent/50 dark:hover:bg-accent/20"
                  }`}
                >
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacherSubjects.slice(0, 3).map((subject) => (
                        <SubjectBadge
                          key={subject.subjectId}
                          subject={subject}
                          size="sm"
                          highlight={selectedStudentId ? isKibouSubject(subject) : false}
                        />
                      ))}
                      {teacherSubjects.length > 3 && (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-800 px-1.5 py-0.5 text-xs rounded-full"
                        >
                          +{teacherSubjects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {teacher.evaluation ? (
                      <Badge
                        className={`
    bg-accent/20 dark:bg-accent/10 text-foreground
    px-2 py-1 rounded-full text-xs
  `}
                      >
                        {teacher.evaluation.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">未評価</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0  "
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsTeacher(teacher);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-500 "
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredTeachersWithSearch.length === 0 && (
          <div className="p-6 text-center text-gray-500">検索結果はありません</div>
        )}
      </ScrollArea>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredTeachersWithSearch.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {detailsTeacher && (
        <DetailDialog
          entity={detailsTeacher}
          type="teacher"
          subjects={detailsTeacher.subjects || []}
          evaluation={detailsTeacher.evaluation}
          open={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
        />
      )}
    </div>
  );
}
