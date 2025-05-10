// components/match/detail-dialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubjectBadge from "./subject-badge";
import { Phone, Bookmark, School, BookOpen, Award, Calendar, GraduationCap, MessageSquare } from "lucide-react";
import { Teacher, Subject, Evaluation, Grade, StudentType } from "@/components/match/types";

// Интерфейс для StudentWithPreference
export interface StudentWithPreference {
  studentId: string;
  name: string;
  kanaName: string | null;
  gradeId: string | null;
  schoolName: string | null;
  examSchoolType: string | null;
  examSchoolCategoryType: string | null;
  birthDate: Date | string | null;
  enrollmentDate?: Date | string | null;
  parentEmail: string | null;
  homePhone?: string | null;
  parentMobile: string | null;
  studentMobile: string | null;
  firstChoiceSchool?: string | null;
  secondChoiceSchool?: string | null;
  notes: string | null;
}

interface DetailDialogProps {
  entity: Teacher | StudentWithPreference;
  type: "teacher" | "student";
  subjects: Subject[];
  evaluation?: Evaluation | null;
  grade?: Grade | null;
  studentType?: StudentType | null;
  open: boolean;
  onClose: () => void;
}

export default function DetailDialog({
                                       entity,
                                       type,
                                       subjects,
                                       evaluation = null,
                                       grade = null,
                                       studentType = null,
                                       open,
                                       onClose,
                                     }: DetailDialogProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "未入力";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const isTeacher = type === "teacher";
  const isStudent = type === "student";
  const teacher = isTeacher ? entity as Teacher : null;
  const student = isStudent ? entity as StudentWithPreference : null;

  // Функция для определения статуса (для цветовой схемы)
  const getStatusBadge = () => {
    const status = isStudent ? "活躍" : "活性";
    return (
      <Badge className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-xs font-medium">
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden" hideCloseButton>
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">{entity.name}</DialogTitle>
              {isStudent && (student as StudentWithPreference).kanaName && (
                <p className="text-muted-foreground text-sm mt-1">{(student as StudentWithPreference).kanaName}</p>
              )}
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Содержимое для учителя */}
          {isTeacher && teacher && (
            <>
              {/* Образование */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <GraduationCap className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">教育</span>
                </div>
                <div className="w-3/4 space-y-1 pl-2 border-l-2 border-gray-100 ">
                  {teacher.university ? (
                    <p className="text-sm font-medium text-foreground">{teacher.university}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">未入力</p>
                  )}
                  {teacher.faculty && (
                    <p className="text-sm text-muted-foreground">{teacher.faculty}{teacher.department ? ` / ${teacher.department}` : ''}</p>
                  )}
                  {teacher.enrollmentStatus && (
                    <p className="text-sm text-muted-foreground">{teacher.enrollmentStatus}</p>
                  )}
                </div>
              </div>

              {/* Предметы */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <BookOpen className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">科目</span>
                </div>
                <div className="w-3/4 pl-2 border-l-2 border-gray-100 ">
                  <div className="flex flex-wrap gap-1">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">未入力</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Оценка */}
              {evaluation && (
                <div className="flex group">
                  <div className="w-1/4 flex items-start">
                    <Award className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-foreground">評価</span>
                  </div>
                  <div className="w-3/4 space-y-1 pl-2 border-l-2 border-gray-100">
                    <p className="text-sm text-foreground">
                      {evaluation.name}{evaluation.score ? ` (${evaluation.score})` : ''}
                    </p>
                    {evaluation.notes && (
                      <p className="text-sm text-muted-foreground">{evaluation.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Контактная информация */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">連絡先</span>
                </div>
                <div className="w-3/4 space-y-1 pl-2 border-l-2 border-gray-100 ">
                  {teacher.email && <p className="text-sm text-foreground">メール: <span className="font-medium">{teacher.email}</span></p>}
                  {teacher.mobileNumber && <p className="text-sm text-foreground">電話: <span className="font-medium">{teacher.mobileNumber}</span></p>}
                  {!teacher.email && !teacher.mobileNumber && (
                    <p className="text-sm text-muted-foreground">未入力</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Содержимое для студента */}
          {isStudent && student && (
            <>
              {/* Школа и класс */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <School className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">学校と学年</span>
                </div>
                <div className="w-3/4 space-y-2 pl-2 border-l-2 border-gray-100 ">
                  {student.examSchoolCategoryType && (
                    <div>
                      <span className="text-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full">
                        {student.examSchoolCategoryType}
                      </span>
                      {student.examSchoolType && (
                        <span className="text-sm text-foreground ml-2">
                          {student.examSchoolType === "PUBLIC" ? "公立" : "私立"}
                        </span>
                      )}
                    </div>
                  )}

                  {student.schoolName && (
                    <p className="text-sm font-medium text-foreground">{student.schoolName}</p>
                  )}

                  {grade && (
                    <p className="text-sm text-foreground">
                      {grade.name}
                    </p>
                  )}

                  {studentType && (
                    <p className="text-sm text-muted-foreground">
                      {studentType.name}
                    </p>
                  )}

                  {!student.examSchoolCategoryType && !student.schoolName && !grade && (
                    <p className="text-sm text-muted-foreground">未入力</p>
                  )}
                </div>
              </div>

              {/* Предметы */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <BookOpen className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">希望科目</span>
                </div>
                <div className="w-3/4 pl-2 border-l-2 border-gray-100 ">
                  <div className="flex flex-wrap gap-1">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">未入力</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Предпочтения по школам */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <Bookmark className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">希望学校</span>
                </div>
                <div className="w-3/4 space-y-1 pl-2 border-l-2 border-gray-100">
                  {student.firstChoiceSchool && (
                    <p className="text-sm text-foreground">第一志望: <span className="font-medium">{student.firstChoiceSchool}</span></p>
                  )}
                  {student.secondChoiceSchool && (
                    <p className="text-sm text-foreground">第二志望: <span className="font-medium">{student.secondChoiceSchool}</span></p>
                  )}
                  {!student.firstChoiceSchool && !student.secondChoiceSchool && (
                    <p className="text-sm text-muted-foreground">未入力</p>
                  )}
                </div>
              </div>

              {/* Даты */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">日付</span>
                </div>
                <div className="w-3/4 space-y-1 pl-2 border-l-2 border-gray-100">
                  {student.birthDate && (
                    <p className="text-sm text-foreground">誕生日: <span className="font-medium">{formatDate(student.birthDate)}</span></p>
                  )}
                  {student.enrollmentDate && (
                    <p className="text-sm text-foreground">入学日: <span className="font-medium">{formatDate(student.enrollmentDate)}</span></p>
                  )}
                  {!student.birthDate && !student.enrollmentDate && (
                    <p className="text-sm text-muted-foreground">未入力</p>
                  )}
                </div>
              </div>

              {/* Контактная информация */}
              <div className="flex group">
                <div className="w-1/4 flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-foreground">連絡先</span>
                </div>
                <div className="w-3/4 space-y-1 pl-2 border-l-2 border-gray-100">
                  {student.parentEmail && <p className="text-sm text-foreground">親のメール: <span className="font-medium">{student.parentEmail}</span></p>}
                  {student.homePhone && <p className="text-sm text-foreground">自宅電話: <span className="font-medium">{student.homePhone}</span></p>}
                  {student.parentMobile && <p className="text-sm text-foreground">親の携帯: <span className="font-medium">{student.parentMobile}</span></p>}
                  {student.studentMobile && <p className="text-sm text-foreground">生徒の携帯: <span className="font-medium">{student.studentMobile}</span></p>}
                  {!student.parentEmail && !student.homePhone && !student.parentMobile && !student.studentMobile && (
                    <p className="text-sm text-muted-foreground">未入力</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Заметки (общие для обоих типов) */}
          {entity.notes && (
            <div className="flex group">
              <div className="w-1/4 flex items-start">
                <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                <span className="text-sm font-medium text-foreground">メモ</span>
              </div>
              <div className="w-3/4 pl-2 border-l-2 border-gray-100">
                <p className="text-sm text-foreground whitespace-pre-wrap">{entity.notes}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
