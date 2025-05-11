import React from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  getSubjectColor,
  getSubjectName,
  getTeacherName,
  getStudentName,
} from './subjectUtils';
import { Clock, User, Users, MapPin, AlertTriangle, CheckCircle, Clock3, Ban } from 'lucide-react';

export type Lesson = {
  id: string;
  subject: string;
  teacher: string;
  student: string;
  room: string;
  startTime: Date;
  endTime: Date;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
};

interface WeekLessonCardProps {
  lesson: Lesson;
  isExpanded: boolean;
  displayMode: 'full' | 'compact-2' | 'compact-3' | 'compact-5' | 'compact-many';
  onClick: (id: string) => void;
}

// Вспомогательная функция для определения статуса урока
export const getLessonStatus = (lesson: Lesson): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'postponed' => {
  if (lesson.status) return lesson.status;
  const now = new Date();
  if (now < lesson.startTime) return 'upcoming';
  if (now >= lesson.startTime && now <= lesson.endTime) return 'ongoing';
  return 'completed';
};

// Функция для определения режима отображения карточки
export const getDisplayMode = (count: number): 'full' | 'compact-2' | 'compact-3' | 'compact-5' | 'compact-many' => {
  if (count === 1) return 'full';
  if (count === 2) return 'compact-2';
  if (count === 3 || count === 4 || count === 6) return 'compact-3';
  if (count === 5 || count === 10) return 'compact-5';
  return 'compact-many';
};

// Функция для форматирования времени в формате HH:MM
const formatTime = (date: Date) => {
  return format(date, 'HH:mm');
};

// Компонент карточки урока
const WeekLessonCard: React.FC<WeekLessonCardProps> = ({
  lesson,
  isExpanded,
  displayMode,
  onClick
}) => {
  const status = lesson.status || getLessonStatus(lesson);

  // Определяем цвета и стили в зависимости от статуса
  const colorClass = getSubjectColor(lesson.subject);
  const [bgColorClass] = colorClass.split(' ');
  const textColor = bgColorClass.includes('bg-yellow-') ? 'text-gray-800' : 'text-white';
  let statusIcon;
  let statusColor;

  switch (status) {
    case 'ongoing':
      statusIcon = <Clock3 className="w-3 h-3 text-white" />;
      statusColor = 'bg-blue-500 text-white';
      break;
    case 'completed':
      statusIcon = <CheckCircle className="w-3 h-3 text-white" />;
      statusColor = 'bg-green-500 text-white';
      break;
    case 'cancelled':
      statusIcon = <Ban className="w-3 h-3 text-white" />;
      statusColor = 'bg-red-500 text-white';
      break;
    case 'postponed':
      statusIcon = <AlertTriangle className="w-3 h-3 text-white" />;
      statusColor = 'bg-yellow-500 text-white';
      break;
    default: // upcoming
      statusIcon = <Clock className="w-3 h-3 text-white" />;
      statusColor = 'bg-gray-400 text-white';
  }

  if (isExpanded) {
    // Развернутая карточка
    return (
      <div className="w-full cursor-pointer" onClick={() => onClick(lesson.id)}>
        <Card className={`${bgColorClass} ${textColor} border-0 h-full`}>
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{getSubjectName(lesson.subject)}</h3>
              <div className={`rounded-full p-1 ${statusColor}`}>
                {statusIcon}
              </div>
            </div>

            <div className="text-sm">
              {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
            </div>

            <div className="flex items-center text-sm">
              <User className={`w-3 h-3 mr-2 ${textColor} opacity-75`} />
              <span>{getTeacherName(lesson.teacher)}</span>
            </div>

            <div className="flex items-center text-sm">
              <Users className={`w-3 h-3 mr-2 ${textColor} opacity-75`} />
              <span>{getStudentName(lesson.student)}</span>
            </div>

            <div className="flex items-center text-sm">
              <MapPin className={`w-3 h-3 mr-2 ${textColor} opacity-75`} />
              <span>ブース {lesson.room}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    // Различные варианты свернутых карточек в зависимости от количества параллельных уроков
    switch (displayMode) {
      case 'full':
        // Полная карточка
        return (
          <div
            className="w-full cursor-pointer"
            onClick={() => onClick(lesson.id)}
          >
            <div
              className={`${bgColorClass} ${textColor} p-1 px-2 rounded flex justify-between items-center mb-1`}
            >
              <div className="flex-grow truncate">
                <div className="text-xs truncate">
                  {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)} | {lesson.room}
                </div>
              </div>
              <div className="ml-1 flex-shrink-0">
                <div className={`rounded-full p-0.5 ${statusColor}`}>
                  {statusIcon}
                </div>
              </div>
            </div>
          </div>
        );

      case 'compact-2':
        // Компактная карточка
        return (
          <div
            className="w-full cursor-pointer pr-0.5"
            onClick={() => onClick(lesson.id)}
          >
            <div
              className={`${bgColorClass} ${textColor} p-1 rounded flex justify-between items-center mb-1`}
            >
              <div className="text-xs truncate">
                {lesson.room}
              </div>
              <div className={`rounded-full p-0.5 ${statusColor}`}>
                {statusIcon}
              </div>
            </div>
          </div>
        );

      case 'compact-3':
        return (
          <div
            className="w-full cursor-pointer pr-0.5"
            onClick={() => onClick(lesson.id)}
          >
            <div
              className={`${bgColorClass} ${textColor} p-1 rounded flex justify-between items-center mb-1`}
            >
              <div className="text-xs truncate">
                {lesson.room}
              </div>
              <div className={`rounded-full p-0.5 ${statusColor}`}>
                {statusIcon}
              </div>
            </div>
          </div>
        );

      case 'compact-5':
        // Минимальная карточка
        return (
          <div
            className="w-full cursor-pointer pr-0.5"
            onClick={() => onClick(lesson.id)}
          >
            <div
              className={`${bgColorClass} ${textColor} py-1 px-1 rounded flex justify-center items-center mb-1`}
            >
              <div className={`rounded-full p-0.5 ${statusColor}`}>
                {statusIcon}
              </div>
            </div>
          </div>
        );

      case 'compact-many':
      default:
        // Максимально компактная
        return (
          <div
            className="w-full cursor-pointer pr-0.5"
            onClick={() => onClick(lesson.id)}
          >
            <div
              className={`${bgColorClass} rounded-full flex justify-center items-center w-6 h-6 mx-auto mb-1`}
            >
              <div className={`rounded-full p-0.5 ${statusColor} scale-75`}>
                {statusIcon}
              </div>
            </div>
          </div>
        );
    }
  }
};

export default WeekLessonCard;
