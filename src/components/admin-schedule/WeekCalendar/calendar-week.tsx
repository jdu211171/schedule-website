import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  ExtendedClassSessionWithRelations,
  useMultipleWeeksClassSessions,
  DayFilters
} from "@/hooks/useClassSessionQuery";
import {
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  startOfWeek,
} from "date-fns";
import { ja } from "date-fns/locale";
import { useCallback, useMemo, useState } from "react";
import WeekLessonCard from "./week-lesson-card";
import { classTypeColorClasses, isValidClassTypeColor, isHexColor, rgba, getContrastText, ClassTypeColor } from "@/lib/class-type-colors";
import { DayCalendarFilters } from "../DayCalendar/day-calendar-filters";

const weekDaysJa = ["月", "火", "水", "木", "金", "土", "日"];

interface CalendarWeekProps {
  selectedWeeks: Date[];
  onLessonSelect?: (lesson: ExtendedClassSessionWithRelations) => void;
  onEdit?: (lesson: ExtendedClassSessionWithRelations) => void;
  onDelete?: (lessonId: string) => void;
  onCreateLesson?: (date: Date) => void;
  filters?: DayFilters;
  onFiltersChange?: (filters: DayFilters) => void;
  selectedBranchId?: string;
}

export default function CalendarWeek({
  selectedWeeks,
  onLessonSelect,
  onEdit,
  onDelete,
  onCreateLesson,
  filters = {},
  onFiltersChange,
  selectedBranchId,
}: CalendarWeekProps) {
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const { weekQueries, allSessions, isLoading } = useMultipleWeeksClassSessions(selectedWeeks, {
    ...filters,
    ...(selectedBranchId && { branchId: selectedBranchId })
  });

  const handleLessonClick = useCallback(
    (lessonId: string) => {
      setExpandedLessonId(expandedLessonId === lessonId ? null : lessonId);
      if (onLessonSelect && lessonId && expandedLessonId !== lessonId) {
        const selectedLesson = allSessions.find(
          (session) => session.classId === lessonId
        );
        if (selectedLesson) {
          onLessonSelect(selectedLesson);
        }
      }
    },
    [expandedLessonId, allSessions, onLessonSelect]
  );

  const handleCreateLessonClick = useCallback(
    (date: Date) => {
      if (onCreateLesson) {
        onCreateLesson(date);
      }
    },
    [onCreateLesson]
  );

  const calculateLayout = useCallback((lessonsCount: number) => {
    if (lessonsCount <= 3) return { rows: 1, itemsPerRow: lessonsCount };
    if (lessonsCount === 4) return { rows: 2, itemsPerRow: 2 };
    if (lessonsCount === 5) return { rows: 1, itemsPerRow: 5 };
    if (lessonsCount === 6) return { rows: 2, itemsPerRow: 3 };
    if (lessonsCount === 7) return { rows: 2, itemsPerRow: 4 };
    if (lessonsCount === 8) return { rows: 2, itemsPerRow: 4 };
    if (lessonsCount === 9) return { rows: 3, itemsPerRow: 3 };
    if (lessonsCount === 10) return { rows: 2, itemsPerRow: 5 };

    return {
      rows: Math.ceil(lessonsCount / 5),
      itemsPerRow: 5,
    };
  }, []);

  const getLessonsForDay = useCallback(
    (date: Date) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return allSessions.filter((session) => {
        const sessionDate = new Date(session.date);
        return isWithinInterval(sessionDate, { start: dayStart, end: dayEnd });
      });
    },
    [allSessions]
  );

  // Group by class type name first, then by time within the group
  const groupLessonsByTypeThenTime = useCallback(
    (dayLessons: ExtendedClassSessionWithRelations[]) => {
      const byType = new Map<string, { typeName: string; colorKey: string | null; lessons: ExtendedClassSessionWithRelations[] }>();
      for (const lesson of dayLessons) {
        const typeName = (lesson.classTypeName || '未分類');
        const colorKey = ((lesson as any)?.classType?.color ?? (lesson as any)?.classTypeColor ?? null) as string | null;
        const key = typeName;
        if (!byType.has(key)) {
          byType.set(key, { typeName, colorKey, lessons: [] });
        }
        byType.get(key)!.lessons.push(lesson);
      }
      // Within each type, reuse time grouping
      const result = Array.from(byType.values()).map(group => {
        const grouped: { [timeSlot: string]: ExtendedClassSessionWithRelations[] } = {};
        const sorted = [...group.lessons].sort((a, b) => {
          const timeA = typeof a.startTime === 'string' ? a.startTime : format(a.startTime, 'HH:mm');
          const timeB = typeof b.startTime === 'string' ? b.startTime : format(b.startTime, 'HH:mm');
          return timeA.localeCompare(timeB);
        });
        for (const lesson of sorted) {
          const start = typeof lesson.startTime === 'string' ? lesson.startTime : format(lesson.startTime, 'HH:mm');
          const end = typeof lesson.endTime === 'string' ? lesson.endTime : format(lesson.endTime, 'HH:mm');
          const slot = `${start} - ${end}`;
          if (!grouped[slot]) grouped[slot] = [];
          grouped[slot].push(lesson);
        }
        return { ...group, lessonsByTime: grouped };
      });
      // Stable sort by type name
      result.sort((a, b) => a.typeName.localeCompare(b.typeName, 'ja'));
      return result;
    },
    []
  );

  const getWeekDays = (startDate: Date) => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startDate, i);
      return {
        date: day,
        dayName: weekDaysJa[i],
        formattedDate: format(day, "d MMMM", { locale: ja }),
        dayNumber: format(day, "d", { locale: ja }),
        isToday: isSameDay(day, new Date()),
      };
    });
  };

  const groupLessonsByTime = useCallback(
    (dayLessons: ExtendedClassSessionWithRelations[]) => {
      const grouped: { [timeSlot: string]: ExtendedClassSessionWithRelations[] } = {};

      const sortedLessons = [...dayLessons].sort((a, b) => {
        const timeA = typeof a.startTime === 'string' ? a.startTime : format(a.startTime, 'HH:mm');
        const timeB = typeof b.startTime === 'string' ? b.startTime : format(b.startTime, 'HH:mm');
        return timeA.localeCompare(timeB);
      });

      sortedLessons.forEach((lesson) => {
        const timeKey = typeof lesson.startTime === 'string'
          ? lesson.startTime
          : format(lesson.startTime, 'HH:mm');

        if (!grouped[timeKey]) {
          grouped[timeKey] = [];
        }
        grouped[timeKey].push(lesson);
      });

      return grouped;
    },
    []
  );

  return (
    <div className="flex flex-col space-y-4 p-4">
      {isLoading && (
        <div className="text-center p-4 text-primary dark:text-primary">
          カレンダーデータを更新中...
        </div>
      )}

      <div className="space-y-8">
        {selectedWeeks.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground dark:text-muted-foreground py-10">
            スケジュールを表示する週間を選択してください。
          </div>
        )}

        {selectedWeeks.map((week, index) => {
          const weekStart = startOfWeek(week, { weekStartsOn: 1 });
          const weekEnd = addDays(weekStart, 6);
          const weekDays = getWeekDays(weekStart);
          const weekQuery = weekQueries[index];
          const isLoadingThisWeek = weekQuery?.isLoading || weekQuery?.isFetching;

          if (isLoadingThisWeek && !weekQuery?.data) {
            return (
              <div
                key={`week-${index}`}
                className="border rounded-lg shadow-sm overflow-hidden bg-background dark:bg-background border-border dark:border-border"
              >
                <div className="p-3 border-b bg-muted dark:bg-muted border-border dark:border-border">
                  <Skeleton className="h-6 w-48 rounded" />
                </div>
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded" />
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={`week-${index}`}>
              <div className="border rounded-lg overflow-visible shadow-sm relative">
                <div className="bg-gray-100 dark:bg-[#171616] border-b text-foreground dark:text-foreground">
                  <div className="flex items-center justify-between px-4 py-2">
                    <h3 className="text-lg">
                      {format(weekStart, "d日M月", { locale: ja })} -{" "}
                      {format(weekEnd, "d日M月", { locale: ja })}
                    </h3>
                    {onFiltersChange && (
                      <div className="flex-1 flex justify-end">
                        <DayCalendarFilters
                          filters={filters}
                          onFiltersChange={onFiltersChange}
                          dateKey={`week-${index}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-7 border-b bg-muted">
                  {weekDays.map((day, ind) => (
                    <div
                      key={ind}
                      className={`text-center p-2 border-r last:border-r-0 font-medium ${
                        day.isToday ? "" : ""
                      }`}
                    >
                      <div className="mb-1">{day.dayName}</div>
                      <div className="text-base sm:text-lg">
                        {day.dayNumber}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 min-h-[600px]">
                  {weekDays.map((day, ind) => {
                    const dayLessons = getLessonsForDay(day.date);
                    const typeGroups = groupLessonsByTypeThenTime(dayLessons);

                    return (
                      <div
                        key={ind}
                        className={`border-r last:border-r-0 p-2 h-full flex flex-col ${
                          day.isToday ? "bg-blue-50/30 dark:bg-[#171616]" : ""
                        }`}
                      >
                        <div className="flex-1 space-y-4">
                          {typeGroups.map((group, gIdx) => {
                            // Compute header styles from class type color
                            const colorKey = group.colorKey || '';
                            const classColors = isValidClassTypeColor(colorKey)
                              ? classTypeColorClasses[colorKey as ClassTypeColor]
                              : undefined;
                            const headerStyle = (() => {
                              if (!classColors && isHexColor(colorKey)) {
                                const bg = rgba(colorKey!, 0.14) || undefined;
                                const border = rgba(colorKey!, 0.4) || undefined;
                                const textColor = getContrastText(colorKey!);
                                return { backgroundColor: bg, borderColor: border, color: textColor === 'white' ? '#f8fafc' : '#0f172a' } as React.CSSProperties;
                              }
                              return undefined as React.CSSProperties | undefined;
                            })();

                            return (
                              <div key={`${group.typeName}-${gIdx}`} className="mb-4">
                                <div className={`text-xs font-medium mb-2 px-2 py-1 border rounded ${classColors ? `${classColors.background} ${classColors.border} ${classColors.text}` : 'bg-muted/60 border-border'}`} style={headerStyle}>
                                  <span className="align-middle">{group.typeName}</span>
                                </div>

                                {Object.entries(group.lessonsByTime).map(([timeSlot, lessonsAtTime]) => {
                                  const { rows, itemsPerRow } = calculateLayout(lessonsAtTime.length);
                                  return (
                                    <div key={timeSlot} className="mb-3">
                                      <div className="text-xs font-medium mb-1 pl-1">
                                        {timeSlot}
                                      </div>
                                      {expandedLessonId && lessonsAtTime.some((lesson) => lesson.classId === expandedLessonId) ? (
                                        <div className="w-full">
                                          <WeekLessonCard
                                            lesson={lessonsAtTime.find((l) => l.classId === expandedLessonId)!}
                                            isExpanded={true}
                                            displayMode="full"
                                            onClick={handleLessonClick}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          {Array.from({ length: rows }).map((_, rowIndex) => {
                                            let rowItemsCount = itemsPerRow;
                                            if (lessonsAtTime.length === 7) {
                                              rowItemsCount = rowIndex === 0 ? 4 : 3;
                                            }

                                            const startIdx = rowIndex === 0 ? 0 : (lessonsAtTime.length === 7 ? 4 : rowIndex * itemsPerRow);
                                            const endIdx = rowIndex === 0 ? rowItemsCount : startIdx + rowItemsCount;
                                            const rowLessons = lessonsAtTime.slice(startIdx, endIdx);

                                            return (
                                              <div
                                                key={rowIndex}
                                                className="grid mb-1"
                                                style={{ gridTemplateColumns: `repeat(${rowItemsCount}, minmax(0, 1fr))`, gap: '2px' }}
                                              >
                                                {rowLessons.map((lesson) => {
                                                  let displayMode: "full" | "compact-2" | "compact-3" | "compact-5" | "compact-many" = "full";
                                                  if (itemsPerRow === 2 || rowItemsCount === 2) displayMode = "compact-2";
                                                  else if (itemsPerRow === 3 || rowItemsCount === 3) displayMode = "compact-3";
                                                  else if (itemsPerRow === 4 || rowItemsCount === 4) displayMode = "compact-3";
                                                  else if (itemsPerRow === 5 || rowItemsCount === 5) displayMode = "compact-5";
                                                  else if (itemsPerRow > 5) displayMode = "compact-many";

                                                  return (
                                                    <WeekLessonCard
                                                      key={lesson.classId}
                                                      lesson={lesson}
                                                      isExpanded={false}
                                                      displayMode={displayMode}
                                                      onClick={handleLessonClick}
                                                      onEdit={onEdit}
                                                      onDelete={onDelete}
                                                    />
                                                  );
                                                })}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}

                          {typeGroups.length === 0 && (
                            <div className="text-center text-gray-400 py-8 text-sm">予定なし</div>
                          )}
                        </div>

                        {/* Create Lesson Button */}
                        {onCreateLesson && (() => {
                          // Get current date and target date for comparison
                          const today = new Date();
                          const dayDate = new Date(day.date);
                          
                          // Normalize to start of day for accurate comparison
                          today.setHours(0, 0, 0, 0);
                          dayDate.setHours(0, 0, 0, 0);
                          
                          // Don't render button for past dates
                          if (dayDate < today) {
                            return null;
                          }
                          
                          return (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateLessonClick(day.date)}
                                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                授業を作成
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
