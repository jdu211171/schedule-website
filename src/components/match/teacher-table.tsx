import { useState, useMemo, useCallback } from "react";
import { Teacher, Subject, Lesson, Evaluation } from "./types";
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

// Определяем интерфейс для teacherSubjects вместо any
interface TeacherSubject {
  teacherId: string;
  subjectId: string;
}

interface TeacherTableProps {
  teachers: Teacher[];
  selectedTeacherId: string | null;
  onTeacherSelect: (teacherId: string) => void;
  lessons: Lesson[];
  subjects: Subject[];
  evaluations: Evaluation[];
  teacherSubjects: TeacherSubject[];
}

export default function TeacherTable({
  teachers,
  selectedTeacherId,
  onTeacherSelect,
  lessons,
  subjects,
  evaluations,
  teacherSubjects,
}: TeacherTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [hasLessonsFilter, setHasLessonsFilter] = useState<boolean | null>(null);
  const [evaluationFilter, setEvaluationFilter] = useState<string | null>(null);
  const [detailsTeacher, setDetailsTeacher] = useState<Teacher | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const allSubjects = useMemo(() => subjects, [subjects]);

  // Обработчик изменения фильтров
  const handleFilterChange = (newSubjectFilters: string[], newHasLessonsFilter: boolean | null) => {
    setSubjectFilters(newSubjectFilters);
    setHasLessonsFilter(newHasLessonsFilter);
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
  };

  // Обработчик изменения фильтра по оценке
  const handleEvaluationFilterChange = (evaluationId: string | null) => {
    setEvaluationFilter(evaluationId);
    setCurrentPage(1);
  };

  // Функция для проверки, есть ли у учителя уроки (мемоизируем с useCallback)
  const teacherHasLessons = useCallback((teacherId: string) => {
    return lessons.some((lesson) => lesson.teacherId === teacherId);
  }, [lessons]);

  // Обогащаем данные учителей (добавляем оценки и предметы)
  const enrichedTeachers = useMemo(() => {
    return teachers.map(teacher => {
      const evaluation = evaluations.find(e => e.evaluationId === teacher.evaluationId) || null;
      const teacherSubjectsData = teacherSubjects.filter(ts => ts.teacherId === teacher.teacherId);
      const subjectIds = new Set<string>();
      const teacherSubjectsList: Subject[] = [];
      
      teacherSubjectsData.forEach(ts => {
        const subject = subjects.find(s => s.subjectId === ts.subjectId);
        if (subject && !subjectIds.has(subject.subjectId)) {
          subjectIds.add(subject.subjectId);
          teacherSubjectsList.push(subject);
        }
      });
      
      const teacherLessons = lessons.filter(lesson => lesson.teacherId === teacher.teacherId);
      
      teacherLessons.forEach(lesson => {
        if (lesson.subject && !subjectIds.has(lesson.subject.subjectId)) {
          subjectIds.add(lesson.subject.subjectId);
          teacherSubjectsList.push(lesson.subject);
        } else if (lesson.subjectId && !subjectIds.has(lesson.subjectId)) {
          const subject = subjects.find(s => s.subjectId === lesson.subjectId);
          if (subject && !subjectIds.has(subject.subjectId)) {
            subjectIds.add(subject.subjectId);
            teacherSubjectsList.push(subject);
          }
        }
      });
      
      return {
        ...teacher,
        evaluation,
        subjects: teacherSubjectsList
      };
    });
  }, [teachers, evaluations, lessons, subjects, teacherSubjects]);

  // Фильтрация учителей
  const filteredTeachers = useMemo(() => {
    return enrichedTeachers.filter((teacher) => {
      // Фильтр по поисковому запросу
      const matchesSearch = 
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.university || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.faculty || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      // Фильтр по предметам
      const teacherSubjects = teacher.subjects || [];
      const matchesSubjects = 
        subjectFilters.length === 0 || 
        teacherSubjects.some(subject => subjectFilters.includes(subject.subjectId));
      
      // Фильтр по наличию уроков
      const matchesHasLessons = 
        hasLessonsFilter === null || 
        (hasLessonsFilter === true && teacherHasLessons(teacher.teacherId)) ||
        (hasLessonsFilter === false && !teacherHasLessons(teacher.teacherId));
      
      // Фильтр по оценке учителя
      const matchesEvaluation = 
        evaluationFilter === null || 
        teacher.evaluationId === evaluationFilter;
      
      return matchesSearch && matchesSubjects && matchesHasLessons && matchesEvaluation;
    });
  }, [
    enrichedTeachers, 
    searchTerm, 
    subjectFilters, 
    hasLessonsFilter, 
    evaluationFilter,
    teacherHasLessons // Добавляем функцию в зависимости
  ]);

  // Расчет общего количества страниц
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  
  // Получение учителей для текущей страницы
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="rounded-md border h-full flex flex-col bg-white">
      <div className="p-4 border-b flex justify-between items-center space-x-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Сбрасываем на первую страницу при поиске
            }}
            placeholder="先生を検索..."
            className="w-full"
          />
          {searchTerm && (
            <button 
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1); // Сбрасываем на первую страницу при очистке поиска
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <FilterPopover 
          subjects={allSubjects}
          evaluations={evaluations}
          onFilterChange={handleFilterChange}
          onEvaluationFilterChange={handleEvaluationFilterChange}
          initialSubjectFilters={subjectFilters}
          initialHasLessonsFilter={hasLessonsFilter}
          initialEvaluationFilter={evaluationFilter}
        />
      </div>
      
      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0 z-10">
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
                      ? "bg-green-100 hover:bg-green-200" // Зеленое выделение для выбранного учителя
                      : "hover:bg-gray-100"
                  }`}
                >
                  <TableCell className="font-medium">
                    {teacher.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacherSubjects.slice(0, 3).map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} size="sm" />
                      ))}
                      {teacherSubjects.length > 3 && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 px-1.5 py-0.5 text-xs rounded-full">
                          +{teacherSubjects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {teacher.evaluation ? (
                      <Badge 
                        className={`
                          ${teacher.evaluation.score && teacher.evaluation.score >= 4 ? 'bg-green-100 text-green-800' : 
                          teacher.evaluation.score && teacher.evaluation.score >= 3 ? 'bg-blue-100 text-blue-800' : 
                          teacher.evaluation.score && teacher.evaluation.score >= 2 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}
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
                      className="h-8 w-8 p-0 hover:bg-gray-200 "
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем срабатывание onClick строки
                        setDetailsTeacher(teacher);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-700">
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
        
        {filteredTeachers.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            検索結果はありません
          </div>
        )}
      </ScrollArea>
      
      {/* Пагинация */}
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredTeachers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
      
      {/* Диалог с подробной информацией */}
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