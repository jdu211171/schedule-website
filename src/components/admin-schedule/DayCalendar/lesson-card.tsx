import React, { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ExtendedClassSessionWithRelations } from "@/hooks/useClassSessionQuery";
import { TimeSlot } from "./day-calendar";
import { AlertTriangle } from "lucide-react";
import { classTypeColorClasses, isValidClassTypeColor, isHexColor, rgba, getContrastText } from "@/lib/class-type-colors";

interface Booth {
  boothId: string;
  name?: string;
}

interface LessonCardProps {
  lesson: ExtendedClassSessionWithRelations;
  booths: Booth[];
  onClick: (lesson: ExtendedClassSessionWithRelations) => void;
  timeSlotHeight: number;
  timeSlots: TimeSlot[];
  maxZIndex?: number;
  laneIndex?: number;
  laneHeight?: number;
  rowTopOffset?: number;
  hasBoothOverlap?: boolean;
}

export const extractTime = (timeValue: string | Date | undefined): string => {
  if (!timeValue) return "";

  try {
    if (typeof timeValue === "string") {
      if (/^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }

      const timeMatch = timeValue.match(/T(\d{2}:\d{2}):/);
      if (timeMatch && timeMatch[1]) {
        return timeMatch[1];
      }
    } else if (timeValue instanceof Date) {
      return `${timeValue.getHours().toString().padStart(2, "0")}:${timeValue
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }
    return "";
  } catch {
    return "";
  }
};

const LessonCardComponent: React.FC<LessonCardProps> = ({
  lesson,
  booths,
  onClick,
  timeSlotHeight,
  timeSlots,
  maxZIndex = 10,
  laneIndex = 0,
  laneHeight,
  rowTopOffset = 0,
  hasBoothOverlap = false,
}) => {
  const startTime = useMemo(
    () => extractTime(lesson.startTime),
    [lesson.startTime],
  );
  const endTime = useMemo(() => extractTime(lesson.endTime), [lesson.endTime]);

  const startSlotIndex = useMemo(() => {
    const exactMatch = timeSlots.findIndex((slot) => slot.start === startTime);
    if (exactMatch >= 0) return exactMatch;

    return timeSlots.findIndex((slot) => {
      const slotTime = slot.start.split(":").map(Number);
      const startTimeArr = startTime.split(":").map(Number);

      if (!slotTime[0] || !startTimeArr[0]) return false;

      const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
      const startMinutes = startTimeArr[0] * 60 + (startTimeArr[1] || 0);

      return slotMinutes <= startMinutes && startMinutes < slotMinutes + 30;
    });
  }, [startTime, timeSlots]);

  const endSlotIndex = useMemo(() => {
    const exactMatch = timeSlots.findIndex((slot) => slot.start === endTime);
    if (exactMatch >= 0) return exactMatch;

    const matchedIndex = timeSlots.findIndex((slot) => {
      const slotTime = slot.start.split(":").map(Number);
      const endTimeArr = endTime.split(":").map(Number);

      if (!slotTime[0] || !endTimeArr[0]) return false;

      const slotMinutes = slotTime[0] * 60 + (slotTime[1] || 0);
      const endMinutes = endTimeArr[0] * 60 + (endTimeArr[1] || 0);

      return slotMinutes <= endMinutes && endMinutes < slotMinutes + 30;
    });

    return matchedIndex >= 0 ? matchedIndex : startSlotIndex + 3;
  }, [endTime, timeSlots, startSlotIndex]);

  const boothIndex = useMemo(() => {
    const exactMatch = booths.findIndex(
      (booth) => booth.boothId === lesson.boothId,
    );
    if (exactMatch >= 0) return exactMatch;

    const nameMatch = booths.findIndex(
      (booth) =>
        booth.name === lesson.boothName ||
        (typeof lesson.booth === "object" &&
          lesson.booth &&
          booth.name === lesson.booth.name),
    );

    return nameMatch >= 0 ? nameMatch : 0;
  }, [booths, lesson.boothId, lesson.boothName, lesson.booth]);

  const isValidPosition =
    startSlotIndex >= 0 && endSlotIndex > startSlotIndex && boothIndex >= 0;

  const isConflicted = (lesson as any)?.status === "CONFLICTED";
  const isConflictVisual = isConflicted || hasBoothOverlap;

  const { effectiveStartIndex, effectiveDuration } = useMemo(() => {
    if (isValidPosition) {
      return {
        effectiveStartIndex: startSlotIndex,
        effectiveDuration: Math.max(1, endSlotIndex - startSlotIndex),
      };
    }

    console.warn(`Невалидная позиция урока: ${lesson.classId}`, {
      startTime,
      endTime,
      startSlotIndex,
      endSlotIndex,
      boothId: lesson.boothId,
      boothIndex,
    });

    const calculateDurationInSlots = () => {
      if (!startTime || !endTime) return 3;

      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      if (
        isNaN(startHour) ||
        isNaN(startMin) ||
        isNaN(endHour) ||
        isNaN(endMin)
      ) {
        return 3;
      }

      const durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);
      return Math.max(1, Math.ceil(durationMinutes / 30));
    };

    const durationSlots = calculateDurationInSlots();

    if (startTime) {
      const [hour, minute] = startTime.split(":").map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        const totalMinutes = hour * 60 + minute;
        let closestSlotIndex = -1;
        let minDiff = Infinity;

        timeSlots.forEach((slot, index) => {
          const [slotHour, slotMinute] = slot.start.split(":").map(Number);
          if (!isNaN(slotHour) && !isNaN(slotMinute)) {
            const slotTotalMinutes = slotHour * 60 + slotMinute;
            const diff = Math.abs(totalMinutes - slotTotalMinutes);
            if (diff < minDiff) {
              minDiff = diff;
              closestSlotIndex = index;
            }
          }
        });

        if (closestSlotIndex >= 0) {
          return {
            effectiveStartIndex: closestSlotIndex,
            effectiveDuration: durationSlots,
          };
        }
      }
    }

    return {
      effectiveStartIndex: 0,
      effectiveDuration: durationSlots,
    };
  }, [
    isValidPosition,
    startSlotIndex,
    endSlotIndex,
    startTime,
    endTime,
    timeSlots,
    lesson.classId,
    boothIndex,
    lesson.boothId,
  ]);

  const { colorClasses, colorStyle, textClass } = useMemo(() => {
    if (isConflictVisual) {
      return {
        colorClasses: {
          background: "bg-destructive/15 dark:bg-destructive/25",
          border: "border-destructive/80 dark:border-destructive/70",
          text: "text-destructive dark:!text-white",
          hover: "hover:bg-destructive/25 dark:hover:bg-destructive/30",
        },
        colorStyle: undefined as React.CSSProperties | undefined,
        textClass: "font-semibold",
      };
    }
    const colorKey = ((lesson as any)?.classType?.color ?? (lesson as any)?.classTypeColor) as string | undefined;
    if (isValidClassTypeColor(colorKey)) {
      return {
        colorClasses: classTypeColorClasses[colorKey],
        colorStyle: undefined as React.CSSProperties | undefined,
        textClass: undefined,
      };
    }
    if (isHexColor(colorKey || '')) {
      const bg = rgba(colorKey!, 0.18) || undefined;
      const border = rgba(colorKey!, 0.5) || undefined;
      const textColor = getContrastText(colorKey!);
      const style: React.CSSProperties = {
        backgroundColor: bg,
        borderColor: border,
      };
      const customTextClass = textColor === 'white'
        ? 'text-white dark:!text-white'
        : 'text-slate-900 dark:!text-white';
      return { colorClasses: undefined, colorStyle: style, textClass: customTextClass };
    }
    // fallback to previous behavior (series-based)
    const isRecurringLesson = lesson.seriesId !== null && lesson.seriesId !== undefined;
    const fallback = isRecurringLesson
      ? {
          background: "bg-indigo-100 dark:bg-indigo-900/70",
          border: "border-indigo-300 dark:border-indigo-700",
          text: "text-indigo-800 dark:!text-white",
          hover: "hover:bg-indigo-200 dark:hover:bg-indigo-800",
        }
      : {
          background: "bg-slate-100 dark:bg-slate-800/60",
          border: "border-slate-300 dark:border-slate-600",
          text: "text-slate-800 dark:!text-white",
          hover: "hover:bg-slate-200 dark:hover:bg-slate-700",
        };
    return { colorClasses: fallback, colorStyle: undefined, textClass: undefined };
  }, [isConflictVisual, lesson.seriesId, (lesson as any)?.classTypeColor, (lesson as any)?.classType?.color]);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lesson.classId });

  const style = useMemo(
    () =>
      ({
        position: "absolute",
        left: `${effectiveStartIndex * 50 + 100}px`,
        top: `${rowTopOffset + laneIndex * (laneHeight ?? timeSlotHeight)}px`,
        width: `${effectiveDuration * 50}px`,
        height: `${(laneHeight ?? timeSlotHeight) - 2}px`,
        zIndex: isDragging ? maxZIndex : maxZIndex - 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        touchAction: 'none',
      }) as React.CSSProperties,
    [
      effectiveStartIndex,
      effectiveDuration,
      rowTopOffset,
      laneIndex,
      laneHeight,
      timeSlotHeight,
      maxZIndex,
      isDragging,
      transform,
    ],
  );

  const isNarrow = effectiveDuration <= 1;

  if (effectiveStartIndex < 0) {
    console.error(
      "Невозможно отобразить урок - недопустимый индекс начала:",
      effectiveStartIndex,
    );
    return null;
  }

  const subjectName =
    lesson.subject?.name || lesson.subjectName || "Предмет не указан";
  const teacherName =
    lesson.teacher?.name || lesson.teacherName || "Преподаватель не указан";
  const studentName =
    lesson.student?.name || lesson.studentName || "Студент не указан";
  const boothName = lesson.booth?.name || lesson.boothName || "Бут не указан";

  // Get student type and grade
  const studentType =
    lesson.studentTypeName || lesson.student?.studentType?.name || "";
  const gradeYear = lesson.studentGradeYear || lesson.student?.gradeYear || "";
  const studentTypeLabel =
    studentType && gradeYear ? `${studentType.charAt(0)}${gradeYear}` : "";

  const isCancelled = Boolean((lesson as any)?.isCancelled);

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute rounded border shadow-sm cursor-grab active:cursor-grabbing
        transition-colors duration-100 ease-in-out transform
        ${colorClasses ? `${colorClasses.background} ${colorClasses.border} ${colorClasses.text} ${colorClasses.hover}` : ''}
        ${textClass ?? ''}
        ${isCancelled ? 'opacity-60 grayscale !text-black dark:!text-white' : ''}
        active:scale-[0.98] hover:shadow-md
        overflow-hidden truncate pointer-events-auto
        dark:!text-white
      `}
      data-conflict={isConflictVisual ? 'true' : 'false'}
      style={{
        ...style,
        ...(colorStyle || {}),
        ...(isConflictVisual
          ? {
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(220,38,38,.20) 0 6px, transparent 6px 12px)'
            }
          : {}),
      }}
      onClick={() => onClick(lesson)}
      {...attributes}
      {...listeners}
    >
      <div className="text-[11px] p-1 flex flex-col h-full justify-between relative">
        {/* Labels removed: visual state indicated by color styles */}
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1">
            <span className="truncate font-medium">{studentName}</span>
            {studentTypeLabel && (
              <span className="text-[8px] px-1 bg-gray-600 dark:bg-gray-700 text-white dark:!text-white rounded flex-shrink-0">
                {studentTypeLabel}
              </span>
            )}
          </div>
          <span className="truncate text-right ml-2">
            {teacherName}
            <span className="text-[10px] px-1 bg-gray-600 dark:bg-gray-700 text-white dark:!text-white rounded flex-shrink-0">
              T
            </span>
          </span>
        </div>

        {/* Bottom row */}
        {!isNarrow && (
          <div className="flex justify-between items-end mt-auto">
            <span className="truncate">{boothName}</span>
            <span className="truncate text-right font-medium">
              {subjectName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

LessonCardComponent.displayName = "LessonCard";

export const LessonCard = React.memo(
  LessonCardComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.lesson.classId === nextProps.lesson.classId &&
      prevProps.timeSlotHeight === nextProps.timeSlotHeight &&
      prevProps.lesson.startTime === nextProps.lesson.startTime &&
      prevProps.lesson.endTime === nextProps.lesson.endTime &&
      prevProps.lesson.boothId === nextProps.lesson.boothId &&
      prevProps.lesson.seriesId === nextProps.lesson.seriesId
    );
  },
);
