import { Teacher, Student, Subject, Evaluation, Grade, StudentType } from "./types";
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
import SchoolTypeBadge from "./school-type-badge";

interface DetailDialogProps {
  entity: Teacher | Student;
  type: "teacher" | "student";
  subjects?: Subject[];
  evaluation?: Evaluation | null;
  grade?: Grade | null;
  studentType?: StudentType | null;
  open: boolean;
  onClose: () => void;
}

export default function DetailDialog({
  entity,
  type,
  subjects = [],
  evaluation = null,
  grade = null,
  studentType = null,
  open,
  onClose,
}: DetailDialogProps) {
  const formatDate = (date: Date | null) => {
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
  const student = isStudent ? entity as Student : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{entity.name}</DialogTitle>
          {isStudent && (student as Student).kanaName && (
            <p className="text-gray-500 text-sm">{(student as Student).kanaName}</p>
          )}
          {isTeacher && (evaluation || (teacher as Teacher).evaluation) && (
            <div className="mt-1">
              {(() => {
                const teacherEvaluation = evaluation || (teacher as Teacher).evaluation;
                return (
                  <Badge 
                    className={`
                      ${teacherEvaluation?.score && teacherEvaluation.score >= 4 ? 'bg-green-100 text-green-800' : 
                      teacherEvaluation?.score && teacherEvaluation.score >= 3 ? 'bg-blue-100 text-blue-800' : 
                      teacherEvaluation?.score && teacherEvaluation.score >= 2 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}
                      px-2 py-1 rounded-full text-xs
                    `}
                  >
                    {teacherEvaluation?.name}
                  </Badge>
                );
              })()}
            </div>
          )}
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Содержимое для учителя */}
          {isTeacher && teacher && (
            <>
              {/* Образование */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">教育</div>
                <div className="col-span-3 space-y-1">
                  {teacher.university ? (
                    <p className="text-sm">{teacher.university}</p>
                  ) : (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                  {teacher.faculty && (
                    <p className="text-sm text-gray-600">{teacher.faculty}{teacher.department ? ` / ${teacher.department}` : ''}</p>
                  )}
                  {teacher.enrollmentStatus && (
                    <p className="text-sm text-gray-600">{teacher.enrollmentStatus}</p>
                  )}
                </div>
              </div>
              
              {/* Предметы */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">科目</div>
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-1">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} />
                      ))
                    ) : teacher.subjects && teacher.subjects.length > 0 ? (
                      teacher.subjects.map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">未入力</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Языковые навыки */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">言語スキル</div>
                <div className="col-span-3 space-y-1">
                  {teacher.englishProficiency ? (
                    <p className="text-sm">英語: {teacher.englishProficiency}</p>
                  ) : (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                  {teacher.toeic && <p className="text-sm">TOEIC: {teacher.toeic}</p>}
                  {teacher.toefl && <p className="text-sm">TOEFL: {teacher.toefl}</p>}
                </div>
              </div>
              
              {/* Сертификаты */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">証明書</div>
                <div className="col-span-3 space-y-1">
                  {teacher.mathCertification && <p className="text-sm">数学: {teacher.mathCertification}</p>}
                  {teacher.kanjiCertification && <p className="text-sm">漢字: {teacher.kanjiCertification}</p>}
                  {teacher.otherCertifications && <p className="text-sm">その他: {teacher.otherCertifications}</p>}
                  {!teacher.mathCertification && !teacher.kanjiCertification && !teacher.otherCertifications && (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                </div>
              </div>
              
              {/* Контактная информация */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">連絡先</div>
                <div className="col-span-3 space-y-1">
                  {teacher.email && <p className="text-sm">メール: {teacher.email}</p>}
                  {teacher.mobileNumber && <p className="text-sm">電話: {teacher.mobileNumber}</p>}
                  {!teacher.email && !teacher.mobileNumber && (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Содержимое для студента */}
          {isStudent && student && (
            <>
              {/* Школа и класс */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">学校と学年</div>
                <div className="col-span-3 space-y-2">
                  {student.examSchoolCategoryType && (
                    <div>
                      <SchoolTypeBadge type={student.examSchoolCategoryType} />
                      {student.examSchoolType && (
                        <span className="text-sm ml-2">
                          {student.examSchoolType === "PUBLIC" ? "公立" : "私立"}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {student.schoolName && (
                    <p className="text-sm">{student.schoolName}</p>
                  )}
                  
                  {(grade || student.grade) && (
                    <p className="text-sm">
                      {(grade || student.grade)?.name}
                    </p>
                  )}
                  
                  {(studentType || student.studentType) && (
                    <p className="text-sm text-gray-600">
                      {(studentType || student.studentType)?.name}
                    </p>
                  )}
                  
                  {!student.examSchoolCategoryType && !student.schoolName && !(grade || student.grade) && (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                </div>
              </div>
              
              {/* Предметы */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">希望科目</div>
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-1">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} />
                      ))
                    ) : student.subjects && student.subjects.length > 0 ? (
                      student.subjects.map((subject) => (
                        <SubjectBadge key={subject.subjectId} subject={subject} />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">未入力</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Предпочтения по школам */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">希望学校</div>
                <div className="col-span-3 space-y-1">
                  {student.firstChoiceSchool && (
                    <p className="text-sm">第一志望: {student.firstChoiceSchool}</p>
                  )}
                  {student.secondChoiceSchool && (
                    <p className="text-sm">第二志望: {student.secondChoiceSchool}</p>
                  )}
                  {!student.firstChoiceSchool && !student.secondChoiceSchool && (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                </div>
              </div>
              
              {/* Даты */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">日付</div>
                <div className="col-span-3 space-y-1">
                  {student.birthDate && (
                    <p className="text-sm">誕生日: {formatDate(student.birthDate)}</p>
                  )}
                  {student.enrollmentDate && (
                    <p className="text-sm">入学日: {formatDate(student.enrollmentDate)}</p>
                  )}
                  {!student.birthDate && !student.enrollmentDate && (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                </div>
              </div>
              
              {/* Контактная информация */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-sm font-medium">連絡先</div>
                <div className="col-span-3 space-y-1">
                  {student.parentEmail && <p className="text-sm">親のメール: {student.parentEmail}</p>}
                  {student.homePhone && <p className="text-sm">自宅電話: {student.homePhone}</p>}
                  {student.parentMobile && <p className="text-sm">親の携帯: {student.parentMobile}</p>}
                  {student.studentMobile && <p className="text-sm">生徒の携帯: {student.studentMobile}</p>}
                  {!student.parentEmail && !student.homePhone && !student.parentMobile && !student.studentMobile && (
                    <p className="text-sm text-gray-500">未入力</p>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Заметки (общие для обоих типов) */}
          {entity.notes && (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-sm font-medium">メモ</div>
              <div className="col-span-3">
                <p className="text-sm whitespace-pre-wrap">{entity.notes}</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}