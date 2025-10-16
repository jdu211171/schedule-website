"use client";

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
  hasTeacherOverlap?: boolean;
  hasStudentOverlap?: boolean;
  cellWidth?: number;
  // True when this session overlaps with any other session in the same booth (ignores cancellation)
  hasAnyBoothOverlap?: boolean;
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
  hasTeacherOverlap = false,
  hasStudentOverlap = false,
  cellWidth = 50,
  hasAnyBoothOverlap = false,
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

  // For Day view, prefer live overlap computation over stored status
  const isConflictVisual = Boolean(hasBoothOverlap || hasTeacherOverlap || hasStudentOverlap);

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
          background: "bg-destructive",
          border: "border-destructive",
          // omit text; we force text color globally below
          text: "",
          hover: "hover:brightness-95 dark:hover:brightness-110",
        },
        colorStyle: undefined as React.CSSProperties | undefined,
        textClass: undefined,
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
      const solid = colorKey!;
      const style: React.CSSProperties = {
        backgroundColor: solid,
        borderColor: solid,
      };
      return { colorClasses: undefined, colorStyle: style, textClass: undefined };
    }
    // fallback to previous behavior (series-based)
    const isRecurringLesson = lesson.seriesId !== null && lesson.seriesId !== undefined;
    const fallback = isRecurringLesson
      ? {
          background: "bg-indigo-100 dark:bg-indigo-900",
          border: "border-indigo-300 dark:border-indigo-700",
          text: "",
          hover: "hover:bg-indigo-200 dark:hover:bg-indigo-800",
        }
      : {
          background: "bg-slate-100 dark:bg-slate-800",
          border: "border-slate-300 dark:border-slate-600",
          text: "",
          hover: "hover:bg-slate-200 dark:hover:bg-slate-700",
        };
    return { colorClasses: fallback, colorStyle: undefined, textClass: undefined };
  }, [isConflictVisual, lesson.seriesId, (lesson as any)?.classTypeColor, (lesson as any)?.classType?.color]);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lesson.classId });

  const style = useMemo(
    () => {
      // Create a small horizontal gap so adjacent cards are visually separated.
      // Scales with cell width but remains subtle.
      const gap = Math.max(1, Math.min(4, Math.round(cellWidth * 0.06)));
      const leftPad = Math.floor(gap / 2);
      const rightPad = gap - leftPad;
      const computedLeft = effectiveStartIndex * cellWidth + 100 + leftPad;
      const computedWidth = Math.max(1, effectiveDuration * cellWidth - (leftPad + rightPad));

      return (({
        position: "absolute",
        left: `${computedLeft}px`,
        top: `${rowTopOffset + laneIndex * (laneHeight ?? timeSlotHeight)}px`,
        width: `${computedWidth}px`,
        height: `${(laneHeight ?? timeSlotHeight) - 2}px`,
        zIndex: isDragging ? maxZIndex : maxZIndex - 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        touchAction: 'none'
      }) as React.CSSProperties);
    },
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
      cellWidth,
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
  // Always allow clicks to pass through cancelled lessons so users can
  // create new sessions on top of, or beside, any remaining portion of
  // a cancelled block. Previously this depended on whether the cancelled
  // lesson overlapped any other session in the same booth, which made the
  // uncovered portion non-clickable after placing a partial replacement.
  const cancelledClickableThrough = isCancelled;

  // Dynamically scale font/padding to use available vertical space
  const rowHeightPx = (laneHeight ?? timeSlotHeight) - 2;
  const baseFontSize = useMemo(() => {
    // Slightly smaller to favor full names
    // ~50px row → ~15px font (cap at 16)
    return Math.min(16, Math.max(12, Math.round(rowHeightPx * 0.29)));
  }, [rowHeightPx]);
  const badgeFontSize = Math.max(9, baseFontSize - 3);
  const badgeFontSizeT = Math.max(10, baseFontSize - 2);
  const innerPadding = Math.max(1, Math.round(baseFontSize * 0.08));

  // Card width for responsiveness
  const cardWidthPx = effectiveDuration * cellWidth; // mirrors layout width calc
  const compactTop = cardWidthPx <= 140; // compact top-row layout for narrow cards

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute rounded border shadow-sm cursor-grab active:cursor-grabbing
        transition-colors duration-100 ease-in-out transform
        ring-1 ring-inset ring-black/10 dark:ring-white/10
        after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-[-1px] after:w-px after:bg-black/15 dark:after:bg-white/20
        ${cancelledClickableThrough ? 'pointer-events-none' : 'pointer-events-auto'} after:pointer-events-none
        ${colorClasses ? `${colorClasses.background} ${colorClasses.border} ${colorClasses.hover}` : ''}
        ${textClass ?? ''}
        ${isCancelled ? 'opacity-60 grayscale !text-black dark:!text-white' : ''}
        !text-black dark:!text-white
        active:scale-[0.98] hover:shadow-md
        overflow-hidden truncate
      `}
      data-conflict={isConflictVisual ? 'true' : 'false'}
      style={{
        ...style,
        ...(colorStyle || {}),
        ...(isConflictVisual
          ? {
              // Make stripe thickness responsive to the cell width so it looks right when cells are smaller
              backgroundImage: (() => {
                const stripe = Math.max(2, Math.round(cellWidth * 0.1)); // ~10% of a cell, min 2px
                return `repeating-linear-gradient(45deg, rgba(220,38,38,.20) 0 ${stripe}px, transparent ${stripe}px ${stripe * 2}px)`;
              })()
            }
          : {}),
      }}
      onClick={() => onClick(lesson)}
      {...attributes}
      {...listeners}
    >
      <div
        className="flex flex-col h-full justify-center gap-1 relative"
        style={{ fontSize: baseFontSize, lineHeight: 1.08, padding: innerPadding, paddingBottom: 0 }}
      >
        {/* Labels removed: visual state indicated by color styles */}
        {/* Top row */}
        {compactTop ? (
          <div className="flex flex-col gap-0.5 min-w-0" style={{ fontSize: Math.max(11, baseFontSize - 1) }}>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className="whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title={studentName}>{studentName}</span>
              {/* Hide grade label in ultra-compact mode to favor names */}
            </div>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className="whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title={teacherName}>{teacherName}</span>
              <span
                className="px-[2px] bg-gray-600 dark:bg-gray-700 text-white dark:!text-white rounded flex-shrink-0"
                style={{ fontSize: badgeFontSizeT }}
              >
                T
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="min-w-0 flex items-center gap-1">
              <span className="truncate" title={studentName}>{studentName}</span>
              {studentTypeLabel && (
                <span
                  className="px-[2px] bg-gray-600 dark:bg-gray-700 text-white dark:!text-white rounded flex-shrink-0"
                  style={{ fontSize: badgeFontSize }}
                >
                  {studentTypeLabel}
                </span>
              )}
            </div>
            <div className="flex-1" />
            <div className="min-w-0 flex items-center gap-0.5 justify-end pr-1">
              <span className="truncate" title={teacherName}>{teacherName}</span>
              <span
                className="px-[2px] bg-gray-600 dark:bg-gray-700 text-white dark:!text-white rounded flex-shrink-0"
                style={{ fontSize: badgeFontSizeT }}
              >
                T
              </span>
            </div>
          </div>
        )}

        {/* Bottom row */}
        {!isNarrow && !compactTop && (
          <div className="flex justify-between items-end mt-0">
            <span className="truncate max-w-[56%]">{boothName}</span>
            <span className="truncate text-right max-w-[42%]">
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
    // Re-render when placement or visual-conflict inputs change
    return (
      prevProps.lesson.classId === nextProps.lesson.classId &&
      prevProps.timeSlotHeight === nextProps.timeSlotHeight &&
      prevProps.lesson.startTime === nextProps.lesson.startTime &&
      prevProps.lesson.endTime === nextProps.lesson.endTime &&
      prevProps.lesson.boothId === nextProps.lesson.boothId &&
      prevProps.lesson.seriesId === nextProps.lesson.seriesId &&
      // Include status because stripes depend on CONFLICTED
      (prevProps.lesson as any).status === (nextProps.lesson as any).status &&
      // Include cancellation visual state
      (prevProps.lesson as any).isCancelled === (nextProps.lesson as any).isCancelled &&
      // Include computed overlap flag and lane assignment
      prevProps.hasBoothOverlap === nextProps.hasBoothOverlap &&
      // Ensure click-through state updates when raw booth-overlap changes
      prevProps.hasAnyBoothOverlap === nextProps.hasAnyBoothOverlap &&
      prevProps.laneIndex === nextProps.laneIndex &&
      // Top offset can change when preceding booth lane counts change; must re-render
      prevProps.rowTopOffset === nextProps.rowTopOffset &&
      (prevProps.laneHeight ?? prevProps.timeSlotHeight) === (nextProps.laneHeight ?? nextProps.timeSlotHeight) &&
      // Include width for responsive stripe thickness
      prevProps.cellWidth === nextProps.cellWidth
    );
  },
);
