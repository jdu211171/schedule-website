"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import { LessonDialog } from "../DayCalendar/lesson-dialog"
import { useClassSession } from "@/hooks/useClassSessionQuery"
import { useBooths } from "@/hooks/useBoothQuery"
import { useTeachers } from "@/hooks/useTeacherQuery"
import { useStudents } from "@/hooks/useStudentQuery"
import { useSubjects } from "@/hooks/useSubjectQuery"
import { FilterCombobox } from "./filter-combobox"
import { toast } from "sonner"

interface ClassSession {
  classId: string // Changed from id to classId
  teacherId: string
  teacherName: string
  studentId: string
  studentName: string
  subjectId: string
  subjectName: string
  classTypeId: string
  classTypeName: string
  boothId: string
  boothName: string
  branchId: string
  branchName: string
  date: string
  startTime: string
  endTime: string
  duration: number
  notes: string
  createdAt: string
  updatedAt: string
  seriesId: string | null
}

type SortOrder = "asc" | "desc" | null

export const AdminCalendarList = () => {
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("edit")
  const [filters, setFilters] = useState({
    teacherName: "",
    studentName: "",
    subjectName: "",
    boothName: "",
    date: null as Date | null,
  })
  const [timeSort, setTimeSort] = useState<SortOrder>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [allSessions, setAllSessions] = useState<ClassSession[]>([])

  // Log API base URL for debugging
  useEffect(() => {
    console.log("API Base URL:", process.env.NEXT_PUBLIC_API_BASE_URL || "(empty)");
  }, []);

  // Fetch option data for LessonDialog (same as 日次 view)
  const { data: boothsResponse } = useBooths({ limit: 100, status: true })
  const { data: teachersResponse } = useTeachers({ limit: 100 })
  const { data: studentsResponse } = useStudents({ limit: 100 })
  const { data: subjectsResponse } = useSubjects({ limit: 100 })

  const booths = useMemo(() => boothsResponse?.data || [], [boothsResponse])
  const teachers = useMemo(() => teachersResponse?.data || [], [teachersResponse])
  const students = useMemo(() => studentsResponse?.data || [], [studentsResponse])
  const subjects = useMemo(() => subjectsResponse?.data || [], [subjectsResponse])

  // Fetch the currently selected session with relations for the shared dialog
  const { data: selectedLesson } = useClassSession(selectedLessonId || undefined)

  // GET - Fetch ALL class sessions
  const { isLoading, refetch } = useQuery({
    queryKey: ["allClassSessions"],
    queryFn: async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const response = await fetch(`${baseUrl}/api/class-sessions`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Failed to fetch sessions:", {
            status: response.status,
            statusText: response.statusText,
            errorData
          })
          throw new Error(`授業データの取得に失敗しました: ${response.status}`)
        }

        const result = await response.json()
        console.log("API Response:", result)

        const sessions = Array.isArray(result) ? result : result.data || []
        setAllSessions(sessions)
        return sessions as ClassSession[]
      } catch (error) {
        console.error("Error fetching sessions:", error)
        toast.error(error instanceof Error ? error.message : "授業データの取得に失敗しました")
        return []
      }
    },
  })

  // Check if session exists with improved error handling
  const checkSessionExists = async (classId: string): Promise<boolean> => {
    try {
      console.log("Checking if session exists:", classId)
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const checkUrl = `${baseUrl}/api/class-sessions/${classId}`
      console.log("Check URL:", checkUrl)

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(checkUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Log full response details
        console.log("Session check response:", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()])
        });

        if (!response.ok) {
          // Try to get error details
          try {
            const errorData = await response.json();
            console.error("Session check failed with data:", errorData);
          } catch (parseError) {
            console.error("Session check failed but couldn't parse response:", parseError);
          }
          return false;
        }

        // Try to parse the response to ensure it's valid
        try {
          const data = await response.json();
          console.log("Session check succeeded with data:", data);
          return true;
        } catch (parseError) {
          console.error("Session exists but couldn't parse response:", parseError);
          // If we got a 200 OK but couldn't parse JSON, we'll still consider it a success
          return response.ok;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Type guard for AbortError
        const isAbortError = (err: unknown): err is { name: string } =>
          typeof err === "object" && err !== null && "name" in err && typeof (err as { name: string }).name === "string";

        if (isAbortError(fetchError) && fetchError.name === 'AbortError') {
          console.error("Session check timed out after 5 seconds");
        } else {
          console.error("Fetch error during session check:", fetchError);
        }
        return false;
      }
    } catch (error) {
      console.error("Unexpected error checking session existence:", error);
      return false;
    }
  }

  // Применяем фильтры на клиентской стороне
  const filteredSessions = useMemo(() => {
    return allSessions.filter((session) => {
      // Проверяем каждый фильтр
      if (filters.teacherName && session.teacherName !== filters.teacherName) return false
      if (filters.studentName && session.studentName !== filters.studentName) return false
      if (filters.subjectName && session.subjectName !== filters.subjectName) return false
      if (filters.boothName && session.boothName !== filters.boothName) return false

      // Проверяем фильтр по дате
      if (filters.date) {
        const filterDate = format(filters.date, "yyyy-MM-dd")
        const sessionDate = session.date.split("T")[0] // Убираем время из даты
        if (sessionDate !== filterDate) return false
      }

      return true
    })
  }, [allSessions, filters])

  // Пагинация на клиентской стороне
  const paginatedSessions = useMemo(() => {
    const startIndex = (page - 1) * limit
    return filteredSessions.slice(startIndex, startIndex + limit)
  }, [filteredSessions, page, limit])

  // DELETE - Delete a class session
  const deleteSessionMutation = useMutation({
    mutationFn: async (classId: string) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""
        const deleteUrl = `${baseUrl}/api/class-sessions/${classId}`
        console.log("Deleting session at URL:", deleteUrl)

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(deleteUrl, {
            method: "DELETE",
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log("Delete response:", {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText
          });

          if (!response.ok) {
            let errorMessage = "授業の削除に失敗しました";

            try {
              const errorData = await response.json();
              console.error("Delete failed with data:", errorData);
              errorMessage = `授業の削除に失敗しました: ${response.status} ${JSON.stringify(errorData)}`;
            } catch (parseError) {
              console.error("Delete failed but couldn't parse response:", parseError);
            }

            throw new Error(errorMessage);
          }

          return response.json().catch(() => ({ success: true }));
        } catch (fetchError) {
          clearTimeout(timeoutId);

          // Type guard for AbortError
          const isAbortError = (err: unknown): err is { name: string } =>
            typeof err === "object" && err !== null && "name" in err && typeof (err as { name: string }).name === "string";

          if (isAbortError(fetchError) && fetchError.name === 'AbortError') {
            throw new Error("授業の削除がタイムアウトしました");
          }
          throw fetchError;
        }
      } catch (error) {
        console.error("Error deleting session:", error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success("授業が正常に削除されました")
      refetch()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "授業の削除に失敗しました")
    }
  })

  const handleDelete = (session: ClassSession) => {
    if (window.confirm("この授業を削除してもよろしいですか？")) {
      deleteSessionMutation.mutate(session.classId) // Changed from id to classId
    }
  }

  const handleEdit = async (session: ClassSession) => {
    try {
      // First check if the session still exists
      const exists = await checkSessionExists(session.classId) // Changed from id to classId

      if (exists) {
        console.log("Session exists, opening LessonDialog for session ID:", session.classId)
        setSelectedLessonId(session.classId)
        setDialogMode("edit")
        setIsLessonDialogOpen(true)
      } else {
        console.error("Session not found before editing:", session.classId)
        toast.error("このセッションは既に削除されています。ページを更新します。")
        refetch()
      }
    } catch (error) {
      console.error("Error in handleEdit:", error)
      toast.error("セッションの確認中にエラーが発生しました")
    }
  }

  // Callbacks for shared LessonDialog
  const handleDialogSave = (_lessonId: string) => {
    setIsLessonDialogOpen(false)
    setSelectedLessonId(null)
    refetch()
  }

  const handleDialogDelete = (_lessonId: string) => {
    setIsLessonDialogOpen(false)
    setSelectedLessonId(null)
    refetch()
  }

  // フィルターをリセットする (Reset filters)
  const resetFilters = () => {
    setFilters({
      teacherName: "",
      studentName: "",
      subjectName: "",
      boothName: "",
      date: null,
    })
    setTimeSort(null)
    setPage(1) // Сбрасываем страницу при сбросе фильтров
  }

  // Unique values for filters - получаем из всех сессий
  const uniqueTeachers = Array.from(new Set(allSessions.map((session) => session.teacherName)))
  const uniqueStudents = Array.from(new Set(allSessions.map((session) => session.studentName)))
  const uniqueSubjects = Array.from(new Set(allSessions.map((session) => session.subjectName)))
  const uniqueBooths = Array.from(new Set(allSessions.map((session) => session.boothName)))

  // Сортировка сессий по времени, если необходимо
  const sortedSessions = [...paginatedSessions].sort((a, b) => {
    if (!timeSort) return 0

    // Сначала сортируем по дате
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateComparison !== 0) return timeSort === "asc" ? dateComparison : -dateComparison

    // Если даты равны, сортируем по времени начала
    const timeA = a.startTime.split(":").map(Number)
    const timeB = b.startTime.split(":").map(Number)

    const hourComparison = timeA[0] - timeB[0]
    if (hourComparison !== 0) return timeSort === "asc" ? hourComparison : -hourComparison

    const minuteComparison = timeA[1] - timeB[1]
    return timeSort === "asc" ? minuteComparison : -minuteComparison
  })

  // Обработчик для переключения сортировки
  const toggleTimeSort = () => {
    if (timeSort === null) setTimeSort("asc")
    else if (timeSort === "asc") setTimeSort("desc")
    else setTimeSort(null)
  }

  // Обработчики пагинации
  const handleNextPage = () => {
    setPage((prev) => prev + 1)
  }

  const handlePrevPage = () => {
    setPage((prev) => (prev > 1 ? prev - 1 : 1))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>授業カレンダー管理</CardTitle>
        <CardDescription>授業スケジュールの表示、編集、削除ができます</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Фильтры над таблицей */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="w-full">
            <FilterCombobox
              label="講師"
              options={uniqueTeachers.map((name) => ({ label: name, value: name }))}
              value={filters.teacherName}
              onChange={(value) => setFilters({ ...filters, teacherName: value })}
            />
          </div>

          <div className="w-full">
            <FilterCombobox
              label="生徒"
              options={uniqueStudents.map((name) => ({ label: name, value: name }))}
              value={filters.studentName}
              onChange={(value) => setFilters({ ...filters, studentName: value })}
            />
          </div>

          <div className="w-full">
            <FilterCombobox
              label="科目"
              options={uniqueSubjects.map((name) => ({ label: name, value: name }))}
              value={filters.subjectName}
              onChange={(value) => setFilters({ ...filters, subjectName: value })}
            />
          </div>

          <div className="w-full">
            <FilterCombobox
              label="ブース"
              options={uniqueBooths.map((name) => ({ label: name, value: name }))}
              value={filters.boothName}
              onChange={(value) => setFilters({ ...filters, boothName: value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">日付</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !filters.date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date ? format(filters.date, "yyyy年MM月dd日", { locale: ja }) : "日付を選択"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.date || undefined}
                  onSelect={(date) => setFilters({ ...filters, date: date || null })}
                  initialFocus
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Button onClick={resetFilters} variant="outline" className="mr-2">
            フィルターをリセット
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">読み込み中...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead onClick={toggleTimeSort} className="cursor-pointer select-none">
                    <div className="flex items-center">
                      時間
                      {timeSort === null && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      {timeSort === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
                      {timeSort === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
                    </div>
                  </TableHead>
                  <TableHead>講師</TableHead>
                  <TableHead>生徒</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>ブース</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSessions && sortedSessions.length > 0 ? (
                  sortedSessions.map((session) => (
                    <TableRow key={session.classId}>
                      <TableCell>{new Date(session.date).toLocaleDateString("ja-JP")}</TableCell>
                      <TableCell>
                        {session.startTime} - {session.endTime}
                      </TableCell>
                      <TableCell>{session.teacherName}</TableCell>
                      <TableCell>{session.studentName}</TableCell>
                      <TableCell>{session.subjectName}</TableCell>
                      <TableCell>{session.boothName}</TableCell>
                      <TableCell>{session.duration}分</TableCell>
                      <TableCell>{session.notes}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(session)}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(session)}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      授業データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Пагинация */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {filteredSessions.length > 0
                  ? `全 ${filteredSessions.length} 件中 ${Math.min((page - 1) * limit + 1, filteredSessions.length)}-${Math.min(
                    page * limit,
                    filteredSessions.length,
                  )} 件を表示`
                  : ""}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>
                  前へ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page * limit >= filteredSessions.length}
                >
                  次へ
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {isLessonDialogOpen && selectedLesson && (
        <LessonDialog
          open={isLessonDialogOpen}
          onOpenChange={(open) => {
            setIsLessonDialogOpen(open)
            if (!open) {
              setSelectedLessonId(null)
            }
          }}
          lesson={selectedLesson}
          mode={dialogMode}
          onModeChange={setDialogMode}
          onSave={handleDialogSave}
          onDelete={handleDialogDelete}
          booths={booths}
          teachers={teachers}
          students={students}
          subjects={subjects}
        />
      )}
    </Card>
  )
}

export default AdminCalendarList
