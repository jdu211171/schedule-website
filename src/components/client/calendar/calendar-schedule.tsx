'use client'

import { useState } from 'react'
import { addWeeks, subWeeks, startOfWeek, format, addDays, isSameDay } from 'date-fns'
import { ja as jaLocale } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { LessonCard } from '@/components/client/calendar/lesson-card'
import { LessonModal } from '@/components/client/calendar/lesson-modal'

export type Lesson = {
  title: string
  start: string // ISO
  end: string
  location: string
  teacher: string
  subject: string 
}

const mockLessons: Lesson[] = [
  {
    title: '数学Ⅰ',
    start: '2025-04-07T09:00:00',
    end: '2025-04-07T10:30:00',
    location: 'A101',
    teacher: '田中先生',
    subject: 'math',
  },
  {
    title: '英語Ⅱ',
    start: '2025-04-07T13:00:00',
    end: '2025-04-07T14:30:00',
    location: 'B202',
    teacher: '佐藤先生',
    subject: 'english',
  },
  {
    title: '物理',
    start: '2025-04-08T11:00:00',
    end: '2025-04-08T12:30:00',
    location: 'C303',
    teacher: '山本先生',
    subject: 'physics',
  },
  {
    title: '化学',
    start: '2025-04-10T09:00:00',
    end: '2025-04-10T10:30:00',
    location: 'D404',
    teacher: '鈴木先生',
    subject: 'chemistry',
  },
]

const dayLabels = ['月', '火', '水', '木', '金', '土', '日'] // Пн-Вс

export default function CalendarSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lessons, setLessons] = useState(mockLessons)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const goPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const goNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))

  const goToToday = () => setCurrentDate(new Date()) // Кнопка для возврата на "сегодня"

  const getLessonsForDay = (date: Date) => {
    return mockLessons
      .filter((lesson) => isSameDay(new Date(lesson.start), date))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  const isToday = (date: Date) => isSameDay(date, new Date()) // Проверка на сегодня

  // Стиль для белых кнопок с черными границами
  const buttonStyle = "bg-white border border-black hover:bg-gray-100 font-bold"

  const handleOpenModal = (lesson: Lesson) => {
    console.log(lessons);
    setSelectedLesson(lesson)
    setIsModalOpen(true)
  }
  
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedLesson(null)
  }
  
  const handleSaveChanges = (updatedLesson: Lesson) => {
    // Update the lesson in your state
    setLessons(prevLessons => 
      prevLessons.map(lesson => 
        lesson.start === selectedLesson?.start ? updatedLesson : lesson
      )
    )
    setIsModalOpen(false)
    setSelectedLesson(null)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Навигация по неделям с кнопкой today в центре */}
      <div className="flex items-center justify-between mb-4">
        <Button onClick={goPrevWeek} variant="outline" className={buttonStyle}>＜</Button>
        <Button onClick={goToToday} variant="outline" className={buttonStyle}>今日</Button>
        <Button onClick={goNextWeek} variant="outline" className={buttonStyle}>＞</Button>
      </div>

      {/* Отдельная строка для даты и фильтра */}
      <div className="flex items-center justify-between mb-4">
        {/* Текущая дата */}
        <div className="text-xl font-bold">
          {format(weekStart, 'yyyy年M月d日', { locale: jaLocale })} 〜{' '}
          {format(addDays(weekStart, 6), 'M月d日', { locale: jaLocale })}
        </div>
        
        <Button variant="outline" className={buttonStyle}>フィルタ</Button>
      </div>

      {/* Сетка дней */}
      <div className="grid grid-cols-7 gap-2 border border-gray-300 rounded-lg p-2">
        {daysOfWeek.map((date, index) => (
          <div
            key={index}
            className={`space-y-2 p-2 rounded-lg ${
              isToday(date) ? 'bg-yellow-100' : ''
            } border border-gray-300`}
          >
            <div
              className={`text-center font-semibold border-b pb-1 ${
                isToday(date) ? 'text-yellow-500' : 'text-black'
              }`}
            >
              {format(date, 'M月d日', { locale: jaLocale })}（{dayLabels[index]}）
            </div>

            {getLessonsForDay(date).map((lesson, idx) => (
              <LessonCard
                key={idx}
                lesson={lesson}
                onClick={() => handleOpenModal(lesson)}
                subjectColor={getSubjectColor(lesson.subject)}
              />
            ))}
          </div>
        ))}
      </div>
      <LessonModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        lesson={selectedLesson}
        onSaveChanges={handleSaveChanges}
      />
    </div>
  )
}

// Функция для получения цвета по предмету
const getSubjectColor = (subject: string) => {
  const subjectColors: Record<string, string> = {
    math: 'bg-blue-500',      // Математика — синий
    english: 'bg-green-500',  // Английский — зеленый
    physics: 'bg-red-500',    // Физика — красный
    chemistry: 'bg-yellow-500', // Химия — желтый
  }
  return subjectColors[subject] || 'bg-gray-500' // Если предмет не найден — серый
}