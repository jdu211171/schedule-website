import { Card } from '@/components/ui/card'
import { format } from 'date-fns'

// Типы для уроков
export type Lesson = {
  title: string
  start: string // ISO
  end: string
  location: string
  teacher: string
  subject: string // параметр для определения цвета
  reason?: string
}

interface LessonCardProps {
  lesson: Lesson
  onClick: () => void
  subjectColor: string
}

const LessonCard: React.FC<LessonCardProps> = ({ lesson, onClick, subjectColor }) => {
  return (
    <Card
      className={`p-2 text-sm cursor-pointer ${subjectColor} text-white rounded-lg shadow-md`}
      onClick={onClick}
    >
      <div className="font-medium">{lesson.title}</div>
      <div>
        {format(new Date(lesson.start), 'HH:mm')} 〜 {format(new Date(lesson.end), 'HH:mm')}
      </div>
      <div>{lesson.location}</div>
      <div className="text-muted-foreground">{lesson.teacher}</div>
    </Card>
  )
}

export { LessonCard }