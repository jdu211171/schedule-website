"use client"

import type React from "react"
import { useMemo, useState, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterBar, type DateRangeFilterConfig, type AnyFilterConfig } from "@/components/filter-bar"
import { EnhancedTableHeader } from "@/components/enhanced-table-header"
import { useClassSessions, type ClassSessionWithRelations } from "@/hooks/useClassSessionQuery"
import { EditTemplateClassSessionForm } from "./edit-template-class-session-form"
import { EditStandaloneClassSessionForm } from "./edit-standalone-class-session-form"
import type {
  UpdateStandaloneClassSessionSchema,
  UpdateTemplateClassSessionSchema,
} from "@/schemas/class-session.schema"
import type { z } from "zod"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

// Define specific session types for the edit forms
type EditTemplateClassSessionFormSession = z.infer<typeof UpdateTemplateClassSessionSchema>
type EditStandaloneClassSessionFormSession = z.infer<typeof UpdateStandaloneClassSessionSchema>

// Define SortConfig type
type SortConfig = {
  key: keyof ClassSessionWithRelations | "boothName" | "subjectName"
  direction: "ascending" | "descending" | null
}

// Define FilterState type
type FilterState = Record<string, string[]>

// Props for the dialogs that wrap the forms
type EditTemplateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: EditTemplateClassSessionFormSession | null
  onSessionUpdated: () => void
}

type EditStandaloneDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: EditStandaloneClassSessionFormSession | null
  onSessionUpdated: () => void
}

// Define the FormConfig discriminated union
type FormConfig =
  | {
  type: "template"
  component: React.FC<EditTemplateDialogProps>
  props: EditTemplateDialogProps
}
  | {
  type: "standalone"
  component: React.FC<EditStandaloneDialogProps>
  props: EditStandaloneDialogProps
}
  | {
  type: null
  component: null
  props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    session: null
    onSessionUpdated: () => void
  }
}

export default function AdminCalendarListEnhanced() {
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ClassSessionWithRelations | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<ClassSessionWithRelations | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "ascending",
  })

  // Initialize filter state with empty arrays for each filter
  const [filters, setFilters] = useState<FilterState>({
    teacherIds: [],
    studentIds: [],
    subjectIds: [],
    subjectTypeIds: [],
    boothIds: [],
    classTypeIds: [],
  })

  // Add date range filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const { data: sessionsData, isLoading } = useClassSessions()
  const classSessions = useMemo(() => sessionsData?.data || [], [sessionsData])

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const teachers = Array.from(new Set(classSessions.map((s) => s.teacherId).filter((id): id is string => !!id))).map(
      (id) => ({
        value: id,
        label: classSessions.find((s) => s.teacherId === id)?.teacher?.name || id,
      }),
    )

    const students = Array.from(new Set(classSessions.map((s) => s.studentId).filter((id): id is string => !!id))).map(
      (id) => ({
        value: id,
        label: classSessions.find((s) => s.studentId === id)?.student?.name || id,
      }),
    )

    const subjects = Array.from(new Set(classSessions.map((s) => s.subjectId).filter((id): id is string => !!id))).map(
      (id) => ({
        value: id,
        label: classSessions.find((s) => s.subjectId === id)?.subject?.name || id,
      }),
    )

    const subjectTypes = Array.from(
      new Set(classSessions.map((s) => s.subjectTypeId).filter((id): id is string => !!id)),
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.subjectTypeId === id)?.subjectType?.name || id,
    }))

    const booths = Array.from(new Set(classSessions.map((s) => s.boothId).filter((id): id is string => !!id))).map(
      (id) => ({
        value: id,
        label: classSessions.find((s) => s.boothId === id)?.booth?.name || id,
      }),
    )

    const classTypes = Array.from(
      new Set(classSessions.map((s) => s.classTypeId).filter((id): id is string => !!id)),
    ).map((id) => ({
      value: id,
      label: classSessions.find((s) => s.classTypeId === id)?.classType?.name || id,
    }))

    return { teachers, students, subjects, subjectTypes, booths, classTypes }
  }, [classSessions])

  // Create filter configurations
  const filterConfigs = useMemo<AnyFilterConfig[]>(
    () => [
      {
        id: "teacherIds",
        label: "講師",
        placeholder: "講師を選択",
        options: filterOptions.teachers,
      },
      {
        id: "studentIds",
        label: "生徒",
        placeholder: "生徒を選択",
        options: filterOptions.students,
      },
      {
        id: "subjectIds",
        label: "科目",
        placeholder: "科目を選択",
        options: filterOptions.subjects,
      },
      {
        id: "subjectTypeIds",
        label: "科目タイプ",
        placeholder: "科目タイプを選択",
        options: filterOptions.subjectTypes,
      },
      {
        id: "boothIds",
        label: "ブース",
        placeholder: "ブースを選択",
        options: filterOptions.booths,
      },
      {
        id: "classTypeIds",
        label: "授業タイプ",
        placeholder: "授業タイプを選択",
        options: filterOptions.classTypes,
      },
      {
        id: "dateRange",
        label: "日付",
        type: "date-range",
        placeholder: "授業タイプを選択",
      } as DateRangeFilterConfig,
    ],
    [filterOptions],
  )
  const handleSort = useCallback((key: SortConfig["key"]) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key
          ? prevConfig.direction === "ascending"
            ? "descending"
            : prevConfig.direction === "descending"
              ? null
              : "ascending"
          : "ascending",
    }))
  }, [])

  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [filterId]: values,
    }))
  }, [])

  const handleDateRangeChange = useCallback((filterId: string, range: DateRange | undefined) => {
    setDateRange(range)
  }, [])

  const getSortValue = useCallback((session: ClassSessionWithRelations, key: SortConfig["key"]) => {
    if (key === "boothName") {
      return session.booth?.name || ""
    }
    if (key === "subjectName") {
      return session.subject?.name || ""
    }
    if (key in session) {
      const value = session[key as keyof ClassSessionWithRelations]
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value as string | number | null | undefined
    }
    return ""
  }, [])

  // Function to check if a specific field matches active filters
  const isFieldFiltered = useCallback(
    (session: ClassSessionWithRelations, field: string): boolean => {
      switch (field) {
        case "date":
          if (!dateRange?.from) return false
          const sessionDate = session.date instanceof Date ? session.date : new Date(session.date || "")
          if (dateRange.to) {
            return isWithinInterval(sessionDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to),
            })
          }
          return sessionDate >= startOfDay(dateRange.from)

        case "teacher":
          return filters.teacherIds.length > 0 && !!session.teacherId && filters.teacherIds.includes(session.teacherId)

        case "student":
          return filters.studentIds.length > 0 && !!session.studentId && filters.studentIds.includes(session.studentId)

        case "subject":
          return filters.subjectIds.length > 0 && !!session.subjectId && filters.subjectIds.includes(session.subjectId)

        case "subjectType":
          return (
            filters.subjectTypeIds.length > 0 &&
            !!session.subjectTypeId &&
            filters.subjectTypeIds.includes(session.subjectTypeId)
          )

        case "booth":
          return filters.boothIds.length > 0 && !!session.boothId && filters.boothIds.includes(session.boothId)

        case "classType":
          return (
            filters.classTypeIds.length > 0 &&
            !!session.classTypeId &&
            filters.classTypeIds.includes(session.classTypeId)
          )

        default:
          return false
      }
    },
    [filters, dateRange],
  )

  // Apply filters before sorting
  const filteredSessions = useMemo(() => {
    return classSessions.filter((session) => {
      // For each filter category, check if no filters are selected or if the session matches any selected filter
      const teacherMatch =
        filters.teacherIds.length === 0 || (session.teacherId && filters.teacherIds.includes(session.teacherId))

      const studentMatch =
        filters.studentIds.length === 0 || (session.studentId && filters.studentIds.includes(session.studentId))

      const subjectMatch =
        filters.subjectIds.length === 0 || (session.subjectId && filters.subjectIds.includes(session.subjectId))

      const subjectTypeMatch =
        filters.subjectTypeIds.length === 0 ||
        (session.subjectTypeId && filters.subjectTypeIds.includes(session.subjectTypeId))

      const boothMatch =
        filters.boothIds.length === 0 || (session.boothId && filters.boothIds.includes(session.boothId))

      const classTypeMatch =
        filters.classTypeIds.length === 0 || (session.classTypeId && filters.classTypeIds.includes(session.classTypeId))

      // Date range filter
      let dateMatch = true
      if (dateRange?.from) {
        const sessionDate = session.date instanceof Date ? session.date : new Date(session.date || "")

        if (dateRange.to) {
          // If we have a complete range, check if the session date is within that range
          dateMatch = isWithinInterval(sessionDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          })
        } else {
          // If we only have a start date, check if the session date is on or after that date
          dateMatch = sessionDate >= startOfDay(dateRange.from)
        }
      }

      return (
        teacherMatch && studentMatch && subjectMatch && subjectTypeMatch && boothMatch && classTypeMatch && dateMatch
      )
    })
  }, [classSessions, filters, dateRange])

  const sortedSessions = useMemo(() => {
    if (!sortConfig.direction) return filteredSessions

    return [...filteredSessions].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key)
      const bValue = getSortValue(b, sortConfig.key)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })
  }, [filteredSessions, sortConfig, getSortValue])

  const openEditDialog = (session: ClassSessionWithRelations) => {
    setEditingSession(session)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (session: ClassSessionWithRelations) => {
    setSessionToDelete(session)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setSessionToDelete(null)
  }

  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete) return
    console.log("Deleting session:", sessionToDelete.classId)
    queryClient.invalidateQueries({ queryKey: ["classSessions"] })
    closeDeleteDialog()
  }, [sessionToDelete, queryClient])

  const handleSessionUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["classSessions"] })
    setIsEditDialogOpen(false)
    setEditingSession(null)
  }, [queryClient])

  const formatTimeForSchema = (date: Date | string | null | undefined): string | undefined => {
    if (!date) return undefined
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return undefined
      return format(d, "HH:mm")
    } catch {
      return undefined
    }
  }

  const formConfig = useMemo<FormConfig>(() => {
    if (!isEditDialogOpen || !editingSession) {
      return {
        type: null,
        component: null,
        props: {
          open: false,
          onOpenChange: setIsEditDialogOpen,
          session: null,
          onSessionUpdated: handleSessionUpdated,
        },
      }
    }

    if (typeof editingSession.templateId === "string" && editingSession.templateId !== null) {
      const sessionForTemplateForm: EditTemplateClassSessionFormSession = {
        classId: editingSession.classId,
        startTime: formatTimeForSchema(editingSession.startTime),
        endTime: formatTimeForSchema(editingSession.endTime),
        boothId: editingSession.boothId ?? undefined,
        subjectTypeId: editingSession.subjectTypeId ?? undefined,
        notes: editingSession.notes ?? undefined,
      }
      return {
        type: "template",
        component: EditTemplateClassSessionForm as React.FC<EditTemplateDialogProps>,
        props: {
          open: isEditDialogOpen,
          onOpenChange: setIsEditDialogOpen,
          session: sessionForTemplateForm,
          onSessionUpdated: handleSessionUpdated,
        },
      }
    } else {
      const sessionForStandaloneForm: EditStandaloneClassSessionFormSession = {
        classId: editingSession.classId,
        date: editingSession.date
          ? editingSession.date instanceof Date
            ? editingSession.date
            : new Date(editingSession.date)
          : undefined,
        startTime: formatTimeForSchema(editingSession.startTime),
        endTime: formatTimeForSchema(editingSession.endTime),
        boothId: editingSession.boothId ?? undefined,
        classTypeId: editingSession.classTypeId ?? undefined,
        teacherId: editingSession.teacherId ?? undefined,
        studentId: editingSession.studentId ?? undefined,
        subjectId: editingSession.subjectId ?? undefined,
        subjectTypeId: editingSession.subjectTypeId ?? undefined,
        notes: editingSession.notes ?? undefined,
      }
      return {
        type: "standalone",
        component: EditStandaloneClassSessionForm as React.FC<EditStandaloneDialogProps>,
        props: {
          open: isEditDialogOpen,
          onOpenChange: setIsEditDialogOpen,
          session: sessionForStandaloneForm,
          onSessionUpdated: handleSessionUpdated,
        },
      }
    }
  }, [isEditDialogOpen, editingSession, handleSessionUpdated])

  if (isLoading) {
    return <div>Loading...</div>
  }

  const formatDate = (d: Date | string | null) => {
    if (!d) return "N/A"
    return format(new Date(d), "dd.MM.yy")
  }

  const formatTime = (t: Date | string | null) => {
    if (!t) return "N/A"
    const dateObj = t instanceof Date ? t : new Date(t)
    if (isNaN(dateObj.getTime())) return "Invalid time"
    return format(dateObj, "HH:mm")
  }

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some((filterValues) => filterValues.length > 0) || !!dateRange?.from

  const ActiveForm = formConfig.component

  return (
    <div>
      {ActiveForm && formConfig.props.open && <ActiveForm {...formConfig.props} />}

      {/* Enhanced Filter Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3"/>
        <FilterBar
          filters={filterConfigs}
          selectedFilters={filters}
          dateRangeFilter={{ id: "dateRange", value: dateRange }}
          onFilterChange={handleFilterChange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <EnhancedTableHeader
                  label="日付"
                  sortKey="date"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="開始"
                  sortKey="startTime"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="終了"
                  sortKey="endTime"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="講師"
                  sortKey="teacherId"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="生徒"
                  sortKey="studentId"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="科目"
                  sortKey="subjectId"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="科目タイプ"
                  sortKey="subjectTypeId"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="ブース"
                  sortKey="boothId"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>
                <EnhancedTableHeader
                  label="授業タイプ"
                  sortKey="classTypeId"
                  currentSortKey={sortConfig.key}
                  currentSortDirection={sortConfig.direction}
                  onSort={(key: string) => handleSort(key as SortConfig["key"])}
                />
              </TableHead>
              <TableHead>備考</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              sortedSessions.map((session) => (
                <TableRow key={session.classId}>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "date") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {formatDate(session.date)}
                    </span>
                  </TableCell>
                  <TableCell>{formatTime(session.startTime)}</TableCell>
                  <TableCell>{formatTime(session.endTime)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "teacher") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {session.teacher?.name || session.teacherId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "student") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {session.student?.name || session.studentId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "subject") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {session.subject?.name || session.subjectId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "subjectType") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {session.subjectType?.name || session.subjectTypeId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "booth") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {session.booth?.name || session.boothId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        hasActiveFilters &&
                        isFieldFiltered(session, "classType") &&
                        "underline decoration-2 underline-offset-4",
                      )}
                    >
                      {session.classType?.name || session.classTypeId || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>{session.notes || ""}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(session)}>
                        編集
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(session)}>
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isDeleteDialogOpen && sessionToDelete && (
        <AlertDialog open onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>削除の確認</AlertDialogTitle>
              <AlertDialogDescription>
                {formatDate(sessionToDelete.date)}の{formatTime(sessionToDelete.startTime)}
                の授業を本当に削除しますか？この操作は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSession}>削除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
