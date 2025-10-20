import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit3,
  SkipForward,
  Zap,
  RotateCcw,
  AlertTriangle,
  Check,
  X as XIcon,
} from "lucide-react";
import { TimeInput } from "@/components/ui/time-input";
import { ConflictResponse, SessionAction } from "./types/class-session";

interface ConflictRowState {
  selected: boolean;
  action: SessionAction["action"] | null;
  editedTime?: { startTime: string; endTime: string };
  isEditing: boolean;
  tempStartTime?: string;
  tempEndTime?: string;
}

interface ConflictResolutionTableProps {
  conflictData: ConflictResponse;
  originalTime: { startTime: string; endTime: string };
  onSubmit: (actions: SessionAction[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const getConflictTypeLabel = (type: string): string => {
  switch (type) {
    case "STUDENT_UNAVAILABLE":
      return "生徒不在";
    case "TEACHER_UNAVAILABLE":
      return "講師不在";
    case "STUDENT_WRONG_TIME":
      return "生徒時間不一致";
    case "TEACHER_WRONG_TIME":
      return "講師時間不一致";
    case "VACATION":
      return "休暇期間";
    case "BOOTH_CONFLICT":
      return "ブース競合";
    case "TEACHER_CONFLICT":
      return "講師重複";
    case "STUDENT_CONFLICT":
      return "生徒重複";
    default:
      return "競合";
  }
};

const getConflictTypeColor = (type: string): string => {
  switch (type) {
    case "STUDENT_UNAVAILABLE":
    case "TEACHER_UNAVAILABLE":
      return "text-red-600 bg-red-50 border-red-200";
    case "STUDENT_WRONG_TIME":
    case "TEACHER_WRONG_TIME":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "VACATION":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "BOOTH_CONFLICT":
      return "text-purple-600 bg-purple-50 border-purple-200";
    case "TEACHER_CONFLICT":
    case "STUDENT_CONFLICT":
      return "text-purple-700 bg-purple-50 border-purple-300";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

export const ConflictResolutionTable: React.FC<
  ConflictResolutionTableProps
> = ({ conflictData, originalTime, onSubmit, onCancel, isLoading = false }) => {
  const [rowStates, setRowStates] = useState<Record<string, ConflictRowState>>(
    () => {
      const initialState: Record<string, ConflictRowState> = {};
      // Initialize one state per DATE (not per conflict)
      const uniqueDates = new Set<string>();
      if (conflictData.conflictsByDate) {
        Object.keys(conflictData.conflictsByDate).forEach((d) =>
          uniqueDates.add(d)
        );
      } else {
        conflictData.conflicts.forEach((c) => uniqueDates.add(c.date));
      }
      Array.from(uniqueDates).forEach((date) => {
        initialState[date] = {
          selected: false,
          action: null,
          isEditing: false,
        };
      });
      return initialState;
    }
  );

  const [selectAll, setSelectAll] = useState(false);

  // Convert availability slots to boolean array
  const convertSlotsToAvailability = (
    slots: { startTime: string; endTime: string }[]
  ): boolean[] => {
    const availability = new Array(57).fill(false);

    slots.forEach((slot) => {
      const startHour = parseInt(slot.startTime.split(":")[0]);
      const startMinute = parseInt(slot.startTime.split(":")[1]);
      const endHour = parseInt(slot.endTime.split(":")[0]);
      const endMinute = parseInt(slot.endTime.split(":")[1]);

      const startIndex = (startHour - 8) * 4 + Math.floor(startMinute / 15);
      const endIndex = (endHour - 8) * 4 + Math.floor(endMinute / 15);

      for (let i = Math.max(0, startIndex); i < Math.min(57, endIndex); i++) {
        availability[i] = true;
      }
    });

    return availability;
  };

  // Create time slots for TimeInput
  const timeSlots = useMemo(() => {
    return Array.from({ length: 57 }, (_, i) => {
      const hours = Math.floor(i / 4) + 8;
      const startMinutes = (i % 4) * 15;
      let endHours, endMinutes;

      if (startMinutes === 45) {
        endHours = hours + 1;
        endMinutes = 0;
      } else {
        endHours = hours;
        endMinutes = startMinutes + 15;
      }

      return {
        index: i,
        start: `${hours.toString().padStart(2, "0")}:${startMinutes.toString().padStart(2, "0")}`,
        end: `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`,
        display: `${hours}:${startMinutes === 0 ? "00" : startMinutes} - ${endHours}:${endMinutes === 0 ? "00" : endMinutes}`,
        shortDisplay: i % 4 === 0 ? `${hours}:00` : "",
      };
    });
  }, []);

  // Computed values
  // One row per DATE
  const selectedRows = useMemo(() => {
    return Object.entries(rowStates)
      .filter(([_, state]) => state.selected)
      .map(([date]) => date);
  }, [rowStates]);

  const hasAnyChanges = useMemo(() => {
    return Object.values(rowStates).some((state) => state.action !== null);
  }, [rowStates]);

  // Event handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setRowStates((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((date) => {
        updated[date] = { ...updated[date], selected: checked };
      });
      return updated;
    });
  };

  const handleRowSelect = (date: string, checked: boolean) => {
    setRowStates((prev) => ({
      ...prev,
      [date]: { ...prev[date], selected: checked },
    }));

    const newSelectedCount = Object.values({
      ...rowStates,
      [date]: { ...rowStates[date], selected: checked },
    }).filter((state) => state.selected).length;

    setSelectAll(
      newSelectedCount ===
        (conflictData.conflictsByDate
          ? Object.keys(conflictData.conflictsByDate).length
          : new Set(conflictData.conflicts.map((c) => c.date)).size)
    );
  };

  const handleIndividualAction = (
    date: string,
    action: SessionAction["action"]
  ) => {
    setRowStates((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        action,
        isEditing: action === "USE_ALTERNATIVE",
        tempStartTime:
          action === "USE_ALTERNATIVE" ? originalTime.startTime : undefined,
        tempEndTime:
          action === "USE_ALTERNATIVE" ? originalTime.endTime : undefined,
      },
    }));
  };

  const handleStartTimeEdit = (date: string) => {
    setRowStates((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        action: "USE_ALTERNATIVE",
        isEditing: true,
        tempStartTime:
          prev[date].editedTime?.startTime || originalTime.startTime,
        tempEndTime: prev[date].editedTime?.endTime || originalTime.endTime,
      },
    }));
  };

  const handleTimeChange = (
    date: string,
    field: "start" | "end",
    value: string
  ) => {
    setRowStates((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field === "start" ? "tempStartTime" : "tempEndTime"]: value,
      },
    }));
  };

  const handleSaveTimeEdit = (date: string) => {
    const rowState = rowStates[date];
    if (rowState.tempStartTime && rowState.tempEndTime) {
      setRowStates((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          isEditing: false,
          editedTime: {
            startTime: rowState.tempStartTime!,
            endTime: rowState.tempEndTime!,
          },
          tempStartTime: undefined,
          tempEndTime: undefined,
        },
      }));
    }
  };

  const handleCancelTimeEdit = (date: string) => {
    setRowStates((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        isEditing: false,
        tempStartTime: undefined,
        tempEndTime: undefined,
        action: prev[date].editedTime ? "USE_ALTERNATIVE" : null,
      },
    }));
  };

  const handleBulkAction = (action: SessionAction["action"]) => {
    if (selectedRows.length === 0) return;

    setRowStates((prev) => {
      const updated = { ...prev };
      selectedRows.forEach((date) => {
        updated[date] = {
          ...updated[date],
          action,
          isEditing: false,
        };
      });
      return updated;
    });
  };

  const handleBulkReset = () => {
    if (selectedRows.length > 0) {
      setRowStates((prev) => {
        const updated = { ...prev };
        selectedRows.forEach((date) => {
          updated[date] = {
            ...updated[date],
            action: null,
            editedTime: undefined,
            isEditing: false,
          };
        });
        return updated;
      });
    } else {
      setRowStates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((date) => {
          updated[date] = {
            ...updated[date],
            action: null,
            editedTime: undefined,
            isEditing: false,
          };
        });
        return updated;
      });
    }
  };

  const handleReset = (date: string) => {
    setRowStates((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        action: null,
        editedTime: undefined,
        isEditing: false,
      },
    }));
  };

  const handleSubmit = async () => {
    const actions: SessionAction[] = [];

    Object.entries(rowStates).forEach(([date, state]) => {
      if (state.action && state.action !== "RESET") {
        const action: SessionAction = {
          date,
          action: state.action as "SKIP" | "FORCE_CREATE" | "USE_ALTERNATIVE",
        };

        if (state.action === "USE_ALTERNATIVE" && state.editedTime) {
          action.alternativeStartTime = state.editedTime.startTime;
          action.alternativeEndTime = state.editedTime.endTime;
        }

        actions.push(action);
      }
    });

    console.log("Session actions being submitted:", actions);
    await onSubmit(actions);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    return format(date, "yyyy年MM月dd日 (E)", { locale: ja });
  };

  const getRowStateStyles = (state: ConflictRowState): string => {
    if (state.action) return "opacity-70";
    return "";
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Fixed header with bulk actions */}
      <div className="p-3 bg-muted rounded-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                disabled={isLoading}
              />
              <span className="text-sm font-medium">すべて選択</span>
              <span className="text-xs text-muted-foreground">
                ({selectedRows.length}/
                {conflictData.conflictsByDate
                  ? Object.keys(conflictData.conflictsByDate).length
                  : new Set(conflictData.conflicts.map((c) => c.date)).size}
                )
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("SKIP")}
                disabled={selectedRows.length === 0 || isLoading}
              >
                <SkipForward className="w-4 h-4 mr-1" />
                スキップ
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction("FORCE_CREATE")}
                disabled={selectedRows.length === 0 || isLoading}
              >
                <Zap className="w-4 h-4 mr-1" />
                強制作成
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkReset}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                {selectedRows.length > 0
                  ? `選択をリセット (${selectedRows.length})`
                  : "すべてをリセット"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable table container with fixed height */}
      <div className="border rounded-md overflow-hidden flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>日付</TableHead>
                <TableHead>時間</TableHead>
                <TableHead>競合タイプ</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const dateKeys = conflictData.conflictsByDate
                  ? Object.keys(conflictData.conflictsByDate)
                  : Array.from(
                      new Set(conflictData.conflicts.map((c) => c.date))
                    );

                return dateKeys.map((dateKey) => {
                  const conflictsForDate = conflictData.conflictsByDate
                    ? conflictData.conflictsByDate[dateKey]
                    : conflictData.conflicts.filter((c) => c.date === dateKey);

                  const rowState = rowStates[dateKey];
                  const displayTime = rowState.editedTime
                    ? `${rowState.editedTime.startTime}-${rowState.editedTime.endTime}`
                    : `${originalTime.startTime}-${originalTime.endTime}`;

                  // Aggregate availability slots across conflicts for this date
                  const aggregatedTeacherSlots = conflictsForDate.flatMap(
                    (c) => c.teacherSlots || []
                  );
                  const aggregatedStudentSlots = conflictsForDate.flatMap(
                    (c) => c.studentSlots || []
                  );

                  return (
                    <React.Fragment key={dateKey}>
                      {/* One or more message rows for this date */}
                      {conflictsForDate.map((conflict, idx) => (
                        <TableRow
                          className="border-b-0"
                          key={`${dateKey}-msg-${idx}`}
                        >
                          <TableCell className="w-12"></TableCell>
                          <TableCell
                            colSpan={4}
                            className="py-2 text-sm text-muted-foreground bg-muted/30"
                          >
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{conflict.details}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Single main action row per date */}
                      <TableRow
                        className={`hover:bg-muted/50 ${getRowStateStyles(rowState)}`}
                      >
                        <TableCell className="w-12">
                          <Checkbox
                            checked={rowState.selected}
                            onCheckedChange={(checked) =>
                              handleRowSelect(dateKey, !!checked)
                            }
                            disabled={isLoading}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(dateKey)}
                        </TableCell>
                        <TableCell>
                          {rowState.isEditing ? (
                            <div className="flex items-start gap-3">
                              {(() => {
                                const startTime =
                                  rowState.tempStartTime ||
                                  originalTime.startTime;
                                const endTime =
                                  rowState.tempEndTime || originalTime.endTime;
                                const isInvalidTime = startTime >= endTime;

                                return (
                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[11px] text-muted-foreground pl-0.5">
                                        開始
                                      </span>
                                      <div
                                        className={`${isInvalidTime ? "ring-2 ring-red-500 rounded-md" : ""}`}
                                      >
                                        <TimeInput
                                          value={startTime}
                                          onChange={(value) =>
                                            handleTimeChange(
                                              dateKey,
                                              "start",
                                              value
                                            )
                                          }
                                          className="w-28"
                                          teacherAvailability={convertSlotsToAvailability(
                                            aggregatedTeacherSlots
                                          )}
                                          studentAvailability={convertSlotsToAvailability(
                                            aggregatedStudentSlots
                                          )}
                                          timeSlots={timeSlots}
                                          usePortal={true}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[11px] text-muted-foreground pl-0.5">
                                        終了
                                      </span>
                                      <div
                                        className={`${isInvalidTime ? "ring-2 ring-red-500 rounded-md" : ""}`}
                                      >
                                        <TimeInput
                                          value={endTime}
                                          onChange={(value) =>
                                            handleTimeChange(
                                              dateKey,
                                              "end",
                                              value
                                            )
                                          }
                                          className="w-28"
                                          teacherAvailability={convertSlotsToAvailability(
                                            aggregatedTeacherSlots
                                          )}
                                          studentAvailability={convertSlotsToAvailability(
                                            aggregatedStudentSlots
                                          )}
                                          timeSlots={timeSlots}
                                          usePortal={true}
                                        />
                                      </div>
                                    </div>
                                    {isInvalidTime && (
                                      <span className="text-xs text-red-500">
                                        終了は開始より後にしてください
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded ${
                                  rowState.editedTime
                                    ? "font-semibold text-green-600"
                                    : ""
                                }`}
                                onClick={() => handleStartTimeEdit(dateKey)}
                              >
                                {displayTime}
                              </span>
                              {rowState.editedTime && (
                                <span className="text-xs text-green-600">
                                  (編集済み)
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {rowState.isEditing ? (
                            <div className="flex flex-col items-start gap-2">
                              {conflictsForDate.length === 1 ? (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs border ${getConflictTypeColor(conflictsForDate[0].type)}`}
                                >
                                  {getConflictTypeLabel(
                                    conflictsForDate[0].type
                                  )}
                                </span>
                              ) : (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs border`}
                                >
                                  複数の競合
                                </span>
                              )}
                              {(() => {
                                const startTime =
                                  rowState.tempStartTime ||
                                  originalTime.startTime;
                                const endTime =
                                  rowState.tempEndTime || originalTime.endTime;
                                const isInvalidTime = startTime >= endTime;
                                return (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      aria-label="保存"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleSaveTimeEdit(dateKey)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-green-100 text-green-600"
                                      disabled={isInvalidTime}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      aria-label="キャンセル"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleCancelTimeEdit(dateKey)
                                      }
                                      className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                                    >
                                      <XIcon className="w-4 h-4" />
                                    </Button>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <>
                              {conflictsForDate.length === 1 ? (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs border ${getConflictTypeColor(conflictsForDate[0].type)}`}
                                >
                                  {getConflictTypeLabel(
                                    conflictsForDate[0].type
                                  )}
                                </span>
                              ) : (
                                <span
                                  className={`px-1 py-0.5 rounded text-xs border`}
                                >
                                  複数の競合
                                </span>
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleIndividualAction(
                                  dateKey,
                                  "USE_ALTERNATIVE"
                                )
                              }
                              disabled={isLoading}
                              className={`hover:bg-accent/50 ${
                                rowState.action === "USE_ALTERNATIVE"
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                                  : ""
                              }`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleIndividualAction(dateKey, "SKIP")
                              }
                              disabled={isLoading}
                              className={`hover:bg-accent/50 ${
                                rowState.action === "SKIP"
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 border border-red-300 dark:border-red-700"
                                  : ""
                              }`}
                            >
                              <SkipForward className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleIndividualAction(dateKey, "FORCE_CREATE")
                              }
                              disabled={isLoading}
                              className={`hover:bg-accent/50 ${
                                rowState.action === "FORCE_CREATE"
                                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800"
                                  : ""
                              }`}
                            >
                              <Zap className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReset(dateKey)}
                              disabled={isLoading || !rowState.action}
                              className="hover:bg-accent/50"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Fixed footer with main actions */}
      <div className="flex items-center justify-between pt-4 shrink-0">
        <div className="text-sm text-muted-foreground">
          {hasAnyChanges
            ? `${Object.values(rowStates).filter((s) => s.action).length}件の変更があります`
            : "変更はありません"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!hasAnyChanges || isLoading}>
            {isLoading ? "処理中..." : "変更を送信"}
          </Button>
        </div>
      </div>
    </div>
  );
};
