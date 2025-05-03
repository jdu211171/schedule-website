// components/match/teacher-table.tsx
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
  ClassSession
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
}

export default function TeacherTable({
  teachers,
  selectedTeacherId,
  onTeacherSelect,
  lessons,
  subjects,
  evaluations,
  teacherSubjects,
  selectedStudentId,
  filteredTeachers,
  kibouSubjects = [],
}: TeacherTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [hasLessonsFilter, setHasLessonsFilter] = useState<boolean | null>(null);
  const [evaluationFilter, setEvaluationFilter] = useState<string | null>(null);
  const [detailsTeacher, setDetailsTeacher] = useState<EnrichedTeacher | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const allSubjects = useMemo(() => subjects, [subjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStudentId]);

  const handleFilterChange = (
    newSubjectFilters: string[],
    newHasLessonsFilter: boolean | null,
  ) => {
    setSubjectFilters(newSubjectFilters);
    setHasLessonsFilter(newHasLessonsFilter);
    setCurrentPage(1);
  };

  const handleEvaluationFilterChange = (evaluationId: string | null) => {
    setEvaluationFilter(evaluationId);
    setCurrentPage(1);
  };

  const teacherHasLessons = useCallback(
    (teacherId: string) => {
      return lessons.some((lesson) => lesson.teacherId === teacherId);
    },
    [lessons],
  );

  const baseTeachers = useMemo(() => {
    return filteredTeachers || teachers;
  }, [filteredTeachers, teachers]);

  const enrichedTeachers = useMemo(() => {
    return baseTeachers.map((teacher) => {
      const evaluation =
        evaluations.find((e) => e.evaluationId === teacher.evaluationId) || null;

      // -----------------------------
      // 科目の決定ロジック
      // -----------------------------
      // 先生が担当できる科目は teacherSubjects テーブルの情報のみを参照する。
      // レッスン履歴に基づく追加の科目は含めないことで、
      // "講師対応科目" に登録されていない科目が UI に表示される問題を防ぐ。
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

  const filteredTeachersWithUI = useMemo(() => {
    return enrichedTeachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.university || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (teacher.faculty || "").toLowerCase().includes(searchTerm.toLowerCase());

      const teacherSubjects = teacher.subjects || [];
      const matchesSubjects =
        subjectFilters.length === 0 ||
        teacherSubjects.some((subject) => subjectFilters.includes(subject.subjectId));

      const matchesHasLessons =
        hasLessonsFilter === null ||
        (hasLessonsFilter === true && teacherHasLessons(teacher.teacherId)) ||
        (hasLessonsFilter === false && !teacherHasLessons(teacher.teacherId));

      const matchesEvaluation = evaluationFilter === null || teacher.evaluationId === evaluationFilter;

      return matchesSearch && matchesSubjects && matchesHasLessons && matchesEvaluation;
    });
  }, [
    enrichedTeachers,
    searchTerm,
    subjectFilters,
    hasLessonsFilter,
    evaluationFilter,
    teacherHasLessons,
  ]);

  const totalPages = Math.ceil(filteredTeachersWithUI.length / itemsPerPage);

  const paginatedTeachers = filteredTeachersWithUI.slice(
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

  return (
    <div className="rounded-md border h-full flex flex-col bg-white">
      {/* Показываем заголовок с предпочитаемыми предметами, если выбран ученик */}
      {selectedStudentId && (
        <div className="bg-green-50 p-2 border-b flex flex-wrap items-center gap-2">
          <span className="text-green-800 text-sm font-medium">希望科目：</span>
          {kibouSubjects.length > 0 ? (
            kibouSubjects.map((subject) => (
              <SubjectBadge key={subject.subjectId} subject={subject} size="sm" />
            ))
          ) : (
            <span className="text-green-600 text-xs italic">...</span>
          )}
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
                      ? "bg-green-100 hover:bg-green-200"
                      : "hover:bg-gray-100"
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
                          ${
                            teacher.evaluation.score && teacher.evaluation.score >= 4
                              ? "bg-green-100 text-green-800"
                              : teacher.evaluation.score && teacher.evaluation.score >= 3
                              ? "bg-blue-100 text-blue-800"
                              : teacher.evaluation.score && teacher.evaluation.score >= 2
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }
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
                        className="text-gray-500 hover:text-gray-700"
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

        {filteredTeachersWithUI.length === 0 && (
          <div className="p-6 text-center text-gray-500">検索結果はありません</div>
        )}
      </ScrollArea>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredTeachersWithUI.length}
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