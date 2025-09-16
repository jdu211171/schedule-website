import { Card, CardContent } from "@/components/ui/card";
import { MapPin, UserCheck, GraduationCap, Edit } from "lucide-react";
import React, { useMemo } from "react";
import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { format } from "date-fns";
import { classTypeColorClasses, isValidClassTypeColor, isHexColor, rgba, getContrastText } from "@/lib/class-type-colors";

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

const useLessonColors = (lesson: ExtendedClassSessionWithRelations) => {
  return useMemo(() => {
    const colorKey = ((lesson as any)?.classType?.color ?? (lesson as any)?.classTypeColor) as string | undefined;
    if (isValidClassTypeColor(colorKey)) {
      const cls = classTypeColorClasses[colorKey];
      return {
        classes: {
          background: cls.background,
          border: cls.border,
          text: cls.text,
          hover: cls.hover,
          compactBg: `${cls.background} ${cls.hover}`,
          compactText: cls.text,
        },
        style: undefined as React.CSSProperties | undefined,
        compactStyle: undefined as React.CSSProperties | undefined,
      };
    }
    if (isHexColor(colorKey || '')) {
      const bg = rgba(colorKey!, 0.18) || undefined;
      const border = rgba(colorKey!, 0.5) || undefined;
      const textColor = getContrastText(colorKey!);
      const style: React.CSSProperties = {
        backgroundColor: bg,
        borderColor: border,
        color: textColor === 'white' ? '#f8fafc' : '#0f172a',
      };
      return {
        classes: undefined,
        style,
        compactStyle: style,
      };
    }
    const isRecurringLesson = lesson.seriesId !== null && lesson.seriesId !== undefined;
    const fallback = isRecurringLesson
      ? {
          background: 'bg-indigo-100 dark:bg-indigo-900/70',
          border: 'border-indigo-300 dark:border-indigo-700',
          text: 'text-indigo-800 dark:text-indigo-100',
          hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800',
          compactBg: 'bg-indigo-100 dark:bg-indigo-900/70 hover:bg-indigo-200 dark:hover:bg-indigo-800',
          compactText: 'text-indigo-800 dark:text-indigo-100',
        }
      : {
          background: 'bg-slate-100 dark:bg-slate-800/60',
          border: 'border-slate-300 dark:border-slate-600',
          text: 'text-slate-800 dark:text-slate-100',
          hover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
          compactBg: 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700',
          compactText: 'text-slate-800 dark:text-slate-100',
        };
    return { classes: fallback, style: undefined, compactStyle: undefined };
  }, [lesson]);
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
  const { classes: colors, style, compactStyle } = useLessonColors(lesson);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(lesson);
  };

  // Get student type and grade
  const studentType = lesson.studentTypeName || lesson.student?.studentType?.name || '';
  const gradeYear = lesson.studentGradeYear || lesson.student?.gradeYear || '';
  const studentTypeLabel = studentType && gradeYear ? `${studentType.charAt(0)}${gradeYear}` : '';

  if (isExpanded) {
    return (
      <div className="w-full cursor-pointer" onClick={() => onClick(lesson.classId)}>
        <Card className={`p-2 space-y-2 ${colors ? `${colors.background} ${colors.border} ${colors.hover}` : ''} border h-full transition-colors duration-100`} style={style}>
          <CardContent className={`p-1.5 space-y-2 ${colors ? colors.text : ''} relative`}>
            {/* Edit button */}
            <div className="flex justify-end">
              <button
                onClick={handleEdit}
                className="p-0 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
                title="編集"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {/* Top row */}
            <div className="flex justify-between items-start text-sm">
              <div className="flex items-center gap-1">
                <span className="truncate font-medium">
                  {lesson.studentName}
                </span>
                {studentTypeLabel && (
                  <span className="text-[8px] px-1 bg-gray-600 dark:bg-gray-400 text-white dark:text-gray-900 rounded flex-shrink-0">
                    {studentTypeLabel}
                  </span>
                )}
              </div>
              <span className="truncate text-right ml-2">
                {lesson.teacherName}
              </span>
            </div>

            {/* Bottom row */}
            <div className="flex justify-between items-end text-sm">
              <span className="truncate">
                {lesson.boothName}
              </span>
              <span className="truncate text-right font-medium">
                {lesson.subjectName}
              </span>
            </div>

            {lesson.notes && (
              <div
                className="text-xs opacity-90 pt-1 border-t"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
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
              className={`${colors ? `${colors.compactBg} ${colors.compactText}` : ''} p-1.5 px-2 rounded flex items-center justify-between mb-1 text-xs transition-colors duration-100`}
              style={compactStyle}
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
              className={`${colors ? `${colors.compactBg} ${colors.compactText}` : ''} p-1 rounded flex items-center justify-center mb-1 transition-colors duration-100`}
              style={compactStyle}
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
              className={`${colors ? `${colors.compactBg} ${colors.compactText}` : ''} p-0.5 px-1 rounded flex items-center justify-center mb-1 transition-colors duration-100`}
              style={compactStyle}
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
              className={`${colors ? `${colors.compactBg} ${colors.compactText}` : ''} h-6 rounded flex justify-center items-center mb-1 transition-colors duration-100`}
              style={compactStyle}
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
              className={`${colors ? colors.compactBg : ''} rounded-sm h-5 w-5 mx-auto mb-1 transition-colors duration-100`}
              style={compactStyle}
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
