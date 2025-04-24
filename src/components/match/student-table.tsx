import { useState, useMemo, useCallback } from "react";
import { Student, Subject, Lesson, Grade, StudentType } from "./types";
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
import SchoolTypeBadge from "./school-type-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DetailDialog from "./detail-dialog";

interface StudentTableProps {
  students: Student[];
  selectedStudentId: string | undefined;
  onStudentSelect: (studentId: string) => void;
  lessons: Lesson[];
  subjects: Subject[];
  grades: Grade[];
  studentTypes: StudentType[];
}

export default function StudentTable({
  students,
  selectedStudentId,
  onStudentSelect,
  lessons,
  subjects,
  grades,
  studentTypes,
}: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [hasLessonsFilter, setHasLessonsFilter] = useState<boolean | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const allSubjects = useMemo(() => subjects, [subjects]);

  // Функция для проверки, есть ли у студента уроки (переносим в useCallback)
  const studentHasLessons = useCallback((studentId: string) => {
    return lessons.some((lesson) => lesson.studentId === studentId);
  }, [lessons]);

  // Функция для получения предметов студента (переносим в useCallback)
  const getStudentSubjects = useCallback((student: Student) => {
    const studentLessons = lessons.filter(lesson => lesson.studentId === student.studentId);
    const subjectIds = new Set<string>();
    const studentSubjectsList: Subject[] = [];

    studentLessons.forEach(lesson => {
      if (lesson.subject && !subjectIds.has(lesson.subject.subjectId)) {
        subjectIds.add(lesson.subject.subjectId);
        studentSubjectsList.push(lesson.subject);
      } else if (lesson.subjectId && !subjectIds.has(lesson.subjectId)) {
        const subject = subjects.find(s => s.subjectId === lesson.subjectId);
        if (subject && !subjectIds.has(subject.subjectId)) {
          subjectIds.add(subject.subjectId);
          studentSubjectsList.push(subject);
        }
      }
    });

    return studentSubjectsList;
  }, [lessons, subjects]);

  // Обработчик изменения фильтров
  const handleFilterChange = (newSubjectFilters: string[], newHasLessonsFilter: boolean | null) => {
    setSubjectFilters(newSubjectFilters);
    setHasLessonsFilter(newHasLessonsFilter);
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
  };

  // Обработчик изменения фильтра по классу
  const handleGradeFilterChange = (gradeId: string | null) => {
    setGradeFilter(gradeId);
    setCurrentPage(1);
  };

  // Обработчик изменения фильтра по типу школы
  const handleSchoolTypeFilterChange = (schoolType: string | null) => {
    setSchoolTypeFilter(schoolType);
    setCurrentPage(1);
  };

  // Обогащаем данные студентов (добавляем классы и тип студента)
  const enrichedStudents = useMemo(() => {
    return students.map(student => {
      const grade = grades.find(g => g.gradeId === student.gradeId) || null;
      const studentType = (grade?.studentTypeId && studentTypes.length > 0)
        ? studentTypes.find(st => st.studentTypeId === grade.studentTypeId) || null
        : null;
      const studentSubjects = getStudentSubjects(student);

      return {
        ...student,
        grade,
        studentType,
        subjects: studentSubjects
      };
    });
  }, [students, grades, studentTypes, getStudentSubjects]);

  // Фильтрация студентов
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter((student) => {
      // Фильтр по поисковому запросу
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.kanaName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.schoolName || "").toLowerCase().includes(searchTerm.toLowerCase());

      // Фильтр по предметам
      const studentSubjects = student.subjects || [];
      const matchesSubjects =
        subjectFilters.length === 0 ||
        studentSubjects.some(subject => subjectFilters.includes(subject.subjectId));

      // Фильтр по наличию уроков
      const matchesHasLessons =
        hasLessonsFilter === null ||
        (hasLessonsFilter === true && studentHasLessons(student.studentId)) ||
        (hasLessonsFilter === false && !studentHasLessons(student.studentId));

      // Фильтр по классу
      const matchesGrade =
        gradeFilter === null ||
        student.gradeId === gradeFilter;

      // Фильтр по типу школы
      const matchesSchoolType =
        schoolTypeFilter === null ||
        student.examSchoolCategoryType === schoolTypeFilter;

      return matchesSearch && matchesSubjects && matchesHasLessons &&
             matchesGrade && matchesSchoolType;
    });
  }, [
    enrichedStudents,
    searchTerm,
    subjectFilters,
    hasLessonsFilter,
    gradeFilter,
    schoolTypeFilter,
    studentHasLessons
  ]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Получение студентов для текущей страницы
  const paginatedStudents = filteredStudents.slice(
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
            placeholder="生徒を検索..."
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
          grades={grades}
          examSchoolTypes={["ELEMENTARY", "MIDDLE", "HIGH", "UNIVERSITY", "OTHER"]}
          onFilterChange={handleFilterChange}
          onGradeFilterChange={handleGradeFilterChange}
          onSchoolTypeFilterChange={handleSchoolTypeFilterChange}
          initialSubjectFilters={subjectFilters}
          initialHasLessonsFilter={hasLessonsFilter}
          initialGradeFilter={gradeFilter}
          initialSchoolTypeFilter={schoolTypeFilter}
        />
      </div>

      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0 z-10">
            <TableRow>
              <TableHead>生徒名</TableHead>
              <TableHead>学年</TableHead>
              <TableHead>希望科目</TableHead>
              <TableHead className="w-16">詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStudents.map((student) => {
              const studentSubjects = student.subjects || [];

              return (
                <TableRow
                  key={student.studentId}
                  onClick={() => onStudentSelect(student.studentId)}
                  className={`cursor-pointer ${
                    selectedStudentId === student.studentId
                      ? "bg-blue-100 hover:bg-blue-200" // Синее выделение для выбранного студента
                      : "hover:bg-gray-100"
                  }`}
                >
                  <TableCell className="font-medium">
                    <div>
                      {student.name}
                    </div>
                    {student.kanaName && (
                      <div className="text-xs text-gray-500">{student.kanaName}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col gap-1">
                      {student.examSchoolCategoryType && (
                        <SchoolTypeBadge type={student.examSchoolCategoryType} size="sm" />
                      )}
                      {student.grade && (
                        <div className="text-xs text-gray-500">{student.grade.name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {studentSubjects.slice(0, 3).map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} size="sm" />
                      ))}
                      {studentSubjects.length > 3 && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 px-1.5 py-0.5 text-xs rounded-full">
                          +{studentSubjects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем срабатывание onClick строки
                        setDetailsStudent(student);
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

        {filteredStudents.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            検索結果はありません
          </div>
        )}
      </ScrollArea>

      {/* Пагинация */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredStudents.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {/* Диалог с подробной информацией */}
      {detailsStudent && (
        <DetailDialog
          entity={detailsStudent}
          type="student"
          subjects={detailsStudent.subjects || []}
          grade={detailsStudent.grade}
          studentType={detailsStudent.studentType}
          open={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
        />
      )}
    </div>
  );
}
