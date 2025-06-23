import { Card, CardContent } from "@/components/ui/card";
import { MapPin, UserCheck, GraduationCap, Edit } from "lucide-react";
import React from "react";
import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { format } from "date-fns";

interface WeekLessonCardProps {
  lesson: ExtendedClassSessionWithRelations;
  isExpanded: boolean;
  displayMode:
    | "full"
    | "compact-2"
    | "compact-3"
    | "compact-5"
    | "compact-many";
  onClick: (id: string) => void;
  onEdit?: (lesson: ExtendedClassSessionWithRelations) => void;
  onDelete?: (lessonId: string) => void;
}

const getStatusColor = (seriesId: string | null | undefined) => {
  const isRecurringLesson = seriesId !== null && seriesId !== undefined;
  
  if (isRecurringLesson) {
    return {
      background: 'bg-blue-100 dark:bg-blue-900/70',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-100',
      hover: 'hover:bg-blue-200 dark:hover:bg-blue-800',
      compactBg: 'bg-blue-100 dark:bg-blue-900/70 hover:bg-blue-200 dark:hover:bg-blue-800',
      compactText: 'text-blue-800 dark:text-blue-100'
    };
  } else {
    return {
      background: 'bg-red-100 dark:bg-red-900/70',
      border: 'border-red-300 dark:border-red-700',
      text: 'text-red-800 dark:text-red-100',
      hover: 'hover:bg-red-200 dark:hover:bg-red-800',
      compactBg: 'bg-red-100 dark:bg-red-900/70 hover:bg-red-200 dark:hover:bg-red-800',
      compactText: 'text-red-800 dark:text-red-100'
    };
  }
};

const formatTimeDisplay = (time: Date | string): string => {
  if (typeof time === 'string') {
    return time;
  }
  return format(time, 'HH:mm');
};

const getShortName = (fullName: string): string => {
  const parts = fullName.split(' ');
  return parts[0] || fullName; 
};

const WeekLessonCard: React.FC<WeekLessonCardProps> = ({
  lesson,
  isExpanded,
  displayMode,
  onClick,
  onEdit,
}) => {
  const colors = getStatusColor(lesson.seriesId);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(lesson);
  };

  if (isExpanded) {
    return (
      <div className="w-full cursor-pointer" onClick={() => onClick(lesson.classId)}>
        <Card className={`p-2 space-y-2 ${colors.background} ${colors.border} ${colors.hover} border h-full transition-colors duration-100`}>
          <CardContent className={`p-1.5 space-y-1.5 ${colors.text}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{lesson.subjectName}</h3>
              <div className="flex gap-1">
                <button
                  onClick={handleEdit}
                  className="p-0 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                  title="編集"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-sm">
              {formatTimeDisplay(lesson.startTime)} - {formatTimeDisplay(lesson.endTime)}
            </div>

            <div className="flex items-center text-sm">
              <UserCheck className="w-3 h-3 mr-2 opacity-75" />
              <span>{lesson.teacherName}</span>
            </div>

            <div className="flex items-center text-sm">
              <GraduationCap className="w-3 h-3 mr-2 opacity-75" />
              <span>{lesson.studentName}</span>
            </div>

            <div className="flex items-center text-sm">
              <MapPin className="w-3 h-3 mr-2 opacity-75" />
              <span>{lesson.boothName}</span>
            </div>

            {lesson.notes && (
              <div className="text-xs opacity-90 pt-1">
                {lesson.notes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } else {
    switch (displayMode) {
      case "full":
        return (
          <div
            className="w-full cursor-pointer"
            onClick={() => onClick(lesson.classId)}
          >
            <div
              className={`${colors.compactBg} ${colors.compactText} p-1.5 px-2 rounded flex items-center justify-between mb-1 text-xs transition-colors duration-100`}
            >
              <div className="flex items-center gap-0.5 overflow-hidden">
                <span className="font-medium truncate">{getShortName(lesson.teacherName || '')}</span>
                <span className="opacity-60">・</span>
                <span className="truncate">{getShortName(lesson.studentName || '')}</span>
                <span className="opacity-60">・</span>
                <span className="text-[10px] opacity-90">{lesson.boothName}</span>
              </div>
            </div>
          </div>
        );

      case "compact-2":
        return (
          <div
            className="w-full cursor-pointer pr-0.5 group relative"
            onClick={() => onClick(lesson.classId)}
          >
            <div
              className={`${colors.compactBg} ${colors.compactText} p-1 rounded flex items-center justify-center mb-1 transition-colors duration-100`}
            >
              <div className="text-xs truncate font-medium">{lesson.boothName}</div>
            </div>
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg invisible group-hover:visible whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="font-medium">{lesson.subjectName}</div>
              <div>{lesson.teacherName} → {lesson.studentName}</div>
              <div>{lesson.boothName} | {formatTimeDisplay(lesson.startTime)} - {formatTimeDisplay(lesson.endTime)}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        );

      case "compact-3":
        return (
          <div
            className="w-full cursor-pointer pr-0.5 group relative"
            onClick={() => onClick(lesson.classId)}
          >
            <div
              className={`${colors.compactBg} ${colors.compactText} p-0.5 px-1 rounded flex items-center justify-center mb-1 transition-colors duration-100`}
            >
              <div className="text-[11px] font-bold">
                {lesson.boothName?.replace('Booth-', '').substring(0, 1)}
              </div>
            </div>
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg invisible group-hover:visible whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="font-medium">{lesson.subjectName}</div>
              <div>{lesson.teacherName} → {lesson.studentName}</div>
              <div>{lesson.boothName} | {formatTimeDisplay(lesson.startTime)} - {formatTimeDisplay(lesson.endTime)}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        );

      case "compact-5":
        return (
          <div
            className="w-full cursor-pointer pr-0.5 group relative"
            onClick={() => onClick(lesson.classId)}
          >
            <div
              className={`${colors.compactBg} ${colors.compactText} h-6 rounded flex justify-center items-center mb-1 transition-colors duration-100`}
            >
              <div className="text-[10px] font-bold">
                {lesson.boothName?.replace('Booth-', '').substring(0, 1)}
              </div>
            </div>
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg invisible group-hover:visible whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="font-medium">{lesson.subjectName}</div>
              <div>{lesson.teacherName} → {lesson.studentName}</div>
              <div>{lesson.boothName} | {formatTimeDisplay(lesson.startTime)} - {formatTimeDisplay(lesson.endTime)}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        );

      case "compact-many":
      default:
        return (
          <div
            className="w-full cursor-pointer pr-0.5 group relative"
            onClick={() => onClick(lesson.classId)}
          >
            <div
              className={`${colors.compactBg} rounded-sm h-5 w-5 mx-auto mb-1 transition-colors duration-100`}
            ></div>
            <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg invisible group-hover:visible whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="font-medium">{lesson.subjectName}</div>
              <div>{lesson.teacherName} → {lesson.studentName}</div>
              <div>{lesson.boothName} | {formatTimeDisplay(lesson.startTime)} - {formatTimeDisplay(lesson.endTime)}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        );
    }
  }
};

export default WeekLessonCard;