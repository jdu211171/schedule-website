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
  StudentWithPreference,
  Grade,
  Subject,
  ClassSession,
  StudentType,
  StudentFilterParams
} from "@/components/match/types";

interface EnrichedStudent extends StudentWithPreference {
  grade: Grade | null;
  studentType: StudentType | null;
  subjects: Subject[];
}

interface StudentTableProps {
  students: StudentWithPreference[];
  selectedStudentId: string | null;
  onStudentSelect: (studentId: string) => void;
  lessons: ClassSession[];
  subjects: Subject[];
  grades: Grade[];
  studentTypes: StudentType[];
  selectedTeacherId: string | null;
  filteredStudents?: StudentWithPreference[];
  kibouSubjects?: Subject[];
  
  onStudentFiltersChange?: (params: StudentFilterParams) => void;
  currentSubjectFilters?: string[];
  currentGradeFilter?: string | null;
  currentStudentTypeFilters?: string[];
  currentSchoolTypeFilter?: string | null;
}

export default function StudentTable({
  students,
  selectedStudentId,
  onStudentSelect,
  lessons,
  subjects,
  grades,
  studentTypes,
  selectedTeacherId,
  filteredStudents,
  kibouSubjects = [],
  onStudentFiltersChange,
  currentSubjectFilters = [],
  currentGradeFilter = null,
  currentStudentTypeFilters = [],
  currentSchoolTypeFilter = null,
}: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [detailsStudent, setDetailsStudent] = useState<EnrichedStudent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeacherId]);

  const allSubjects = useMemo(() => subjects, [subjects]);

  // const studentHasLessons = useCallback((studentId: string) => {
  //   return lessons.some((lesson) => lesson.studentId === studentId);
  // }, [lessons]);

  const getStudentSubjects = useCallback((student: StudentWithPreference) => {
    const subjectIds = new Set<string>();
    const studentSubjectsList: Subject[] = [];
  
    if (student.preference?.preferredSubjects) {
      student.preference.preferredSubjects.forEach(subjectId => {
        if (!subjectIds.has(subjectId)) {
          const subject = subjects.find(s => s.subjectId === subjectId);
          if (subject) {
            subjectIds.add(subjectId);
            studentSubjectsList.push(subject);
          }
        }
      });
    }
  
    if (student.StudentPreference) {
      student.StudentPreference.forEach(pref => {
        if (pref.subjects) {
          pref.subjects.forEach(subjectItem => {
            if (subjectItem.subjectId && !subjectIds.has(subjectItem.subjectId)) {
              const subject = subjects.find(s => s.subjectId === subjectItem.subjectId);
              if (subject) {
                subjectIds.add(subjectItem.subjectId);
                studentSubjectsList.push(subject);
              } else if (subjectItem.subject) {
                subjectIds.add(subjectItem.subject.subjectId);
                studentSubjectsList.push(subjectItem.subject);
              }
            }
          });
        }
      });
    }
  
    const studentLessons = lessons.filter(lesson => lesson.studentId === student.studentId);
  
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

  // Обработчик фильтров студентов
  const handleFiltersChange = (filters: StudentFilterParams) => {
    setCurrentPage(1);
    
    if (onStudentFiltersChange) {
      onStudentFiltersChange(filters);
    }
  };

  const baseStudents = useMemo(() => {
    return filteredStudents || students;
  }, [filteredStudents, students]);

  const enrichedStudents = useMemo(() => {
    return baseStudents.map(student => {
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
      } as EnrichedStudent;
    });
  }, [baseStudents, grades, studentTypes, getStudentSubjects]);

  // Локальная фильтрация только по поисковому запросу
  const filteredStudentsWithSearch = useMemo(() => {
    if (!searchTerm.trim()) {
      return enrichedStudents;
    }
    
    return enrichedStudents.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.kanaName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.schoolName || "").toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [enrichedStudents, searchTerm]);

  const totalPages = Math.ceil(filteredStudentsWithSearch.length / itemsPerPage);

  const paginatedStudents = filteredStudentsWithSearch.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isKibouSubject = useCallback((studentSubject: Subject) => {
    return kibouSubjects.some(
      kibouSubject => kibouSubject.subjectId === studentSubject.subjectId
    );
  }, [kibouSubjects]);

  // Проверка, применены ли фильтры
  const isFilterActive = (
    currentSubjectFilters.length > 0 || 
    currentStudentTypeFilters.length > 0 || 
    currentGradeFilter !== null || 
    currentSchoolTypeFilter !== null
  );

  // Форматирование списка активных фильтров для отображения
  const getActiveFiltersDisplay = () => {
    const activeFilters: React.ReactNode[] = [];
    
    if (currentSubjectFilters.length > 0) {
      const subjectNames = currentSubjectFilters.map(id => 
        subjects.find(s => s.subjectId === id)?.name || 'Unknown'
      );
      
      activeFilters.push(
        <Badge key="subjects" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
          科目: {subjectNames.join(', ')}
        </Badge>
      );
    }
    
    if (currentStudentTypeFilters.length > 0) {
      const typeNames = currentStudentTypeFilters.map(id => 
        studentTypes.find(t => t.studentTypeId === id)?.name || 'Unknown'
      );
      
      activeFilters.push(
        <Badge key="studentTypes" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
          生徒タイプ: {typeNames.join(', ')}
        </Badge>
      );
    }
    
    if (currentGradeFilter) {
      const gradeName = grades.find(g => g.gradeId === currentGradeFilter)?.name || 'Unknown';
      
      activeFilters.push(
        <Badge key="grade" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
          学年: {gradeName}
        </Badge>
      );
    }
    
    if (currentSchoolTypeFilter) {
      const schoolTypeLabel = getSchoolTypeLabel(currentSchoolTypeFilter);
      
      activeFilters.push(
        <Badge key="schoolType" className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
          学校タイプ: {schoolTypeLabel}
        </Badge>
      );
    }
    
    return activeFilters;
  };

  // Получение понятного названия типа школы
  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case "ELEMENTARY": return "小学校";
      case "MIDDLE": return "中学校";
      case "HIGH": return "高校";
      case "UNIVERSITY": return "大学";
      default: return "その他";
    }
  };

  // Очистка всех фильтров
  const clearAllFilters = () => {
    if (onStudentFiltersChange) {
      onStudentFiltersChange({});
    }
  };

  return (
    <div className="rounded-md border h-full flex flex-col bg-white">
      {selectedTeacherId && (
        <div className="bg-blue-50 p-2 border-b flex flex-wrap items-center gap-2">
          <span className="text-blue-800 text-sm font-medium">担当可能科目：</span>
          {kibouSubjects.length > 0 ? (
            kibouSubjects.map((subject) => (
              <SubjectBadge
                key={subject.subjectId}
                subject={subject}
                size="sm"
              />
            ))
          ) : (
            <span className="text-blue-600 text-xs italic">...</span>
          )}
        </div>
      )}

      {/* Отображаем информацию об активных фильтрах */}
      {isFilterActive && (
        <div className="bg-blue-50 p-2 border-b">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-blue-800 text-sm font-medium">アクティブフィルター：</span>
            {getActiveFiltersDisplay()}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
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
            placeholder="生徒を検索..."
            className="w-full"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
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
          studentTypes={studentTypes}
          onStudentFiltersChange={handleFiltersChange}
          initialSubjectFilters={currentSubjectFilters}
          initialGradeFilter={currentGradeFilter}
          initialStudentTypeFilters={currentStudentTypeFilters}
          initialSchoolTypeFilter={currentSchoolTypeFilter}
          entityType="student"
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
            {paginatedStudents.map((student) => (
              <TableRow
                key={student.studentId}
                onClick={() => onStudentSelect(student.studentId)}
                className={`cursor-pointer ${
                  selectedStudentId === student.studentId
                    ? "bg-blue-100 hover:bg-blue-200"
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
                      <Badge className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                        {student.examSchoolCategoryType}
                      </Badge>
                    )}
                    {student.grade && (
                      <div className="text-xs text-gray-500">{student.grade.name}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(student.subjects || []).slice(0, 3).map((subject) => (
                      <SubjectBadge
                        key={subject.subjectId}
                        subject={subject}
                        size="sm"
                        highlight={selectedTeacherId ? isKibouSubject(subject) : false}
                      />
                    ))}
                    {(student.subjects || []).length > 3 && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 px-1.5 py-0.5 text-xs rounded-full">
                        +{student.subjects.length - 3}
                      </Badge>
                    )}
                    {(!student.subjects || student.subjects.length === 0) && (
                      <span className="text-gray-500 text-xs"></span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
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
            ))}
          </TableBody>
        </Table>

        {filteredStudentsWithSearch.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            検索結果はありません
          </div>
        )}
      </ScrollArea>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredStudentsWithSearch.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

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