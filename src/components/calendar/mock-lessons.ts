import { 
  SubjectId, 
  SUBJECTS, 
  TEACHERS, 
  STUDENTS 
} from './subjectUtils';

export interface MockLesson {
  id: string;
  subject: string;
  teacher: string;
  student: string;
  room: string;
  startTime: Date;
  endTime: Date;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
}

type LessonStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';

// Функция для генерации тестовых данных
export const generateMockLessons = (): MockLesson[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lessons: MockLesson[] = [];
  
  // Вспомогательная функция для создания даты с учетом базовой даты
  const createDate = (baseDate: Date, hours: number, minutes: number = 0) => {
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };
  
  // 3 параллельных урока в одно время (сегодня)
  lessons.push(
    {
      id: '1',
      subject: 'math',
      teacher: '1',
      student: '1',
      room: '101',
      startTime: createDate(today, 9, 0),
      endTime: createDate(today, 10, 0),
      status: 'completed'
    },
    {
      id: '2',
      subject: 'physics',
      teacher: '2',
      student: '2',
      room: '102',
      startTime: createDate(today, 9, 0),
      endTime: createDate(today, 10, 0),
      status: 'completed'
    },
    {
      id: '3',
      subject: 'english',
      teacher: '3',
      student: '3',
      room: '103',
      startTime: createDate(today, 9, 0),
      endTime: createDate(today, 10, 0),
      status: 'completed'
    }
  );
  
  // Текущий урок (происходящий прямо сейчас)
  lessons.push({
    id: '4',
    subject: 'chemistry',
    teacher: '4',
    student: '4',
    room: '104',
    startTime: createDate(today, now.getHours() - 1, 0),
    endTime: createDate(today, now.getHours() + 1, 0),
    status: 'ongoing'
  });
  
  // Отложенный урок (сегодня)
  lessons.push({
    id: '5',
    subject: 'biology',
    teacher: '1',
    student: '2',
    room: '105',
    startTime: createDate(today, 11, 30),
    endTime: createDate(today, 12, 30),
    status: 'postponed'
  });
  
  // Отмененный урок (сегодня)
  lessons.push({
    id: '5a',
    subject: 'history',
    teacher: '4',
    student: '1',
    room: '106',
    startTime: createDate(today, 11, 30),
    endTime: createDate(today, 12, 30),
    status: 'cancelled'
  });
  
  // 2 параллельных урока (сегодня)
  lessons.push(
    {
      id: '6',
      subject: 'history',
      teacher: '3',
      student: '4',
      room: '201',
      startTime: createDate(today, 13, 0),
      endTime: createDate(today, 14, 0),
      status: 'upcoming'
    },
    {
      id: '7',
      subject: 'japanese',
      teacher: '2',
      student: '1',
      room: '202',
      startTime: createDate(today, 13, 0),
      endTime: createDate(today, 14, 0),
      status: 'upcoming'
    }
  );
  
  // 4 параллельных урока (2x2) (сегодня)
  lessons.push(
    {
      id: '8',
      subject: 'math',
      teacher: '1',
      student: '2',
      room: '301',
      startTime: createDate(today, 15, 0),
      endTime: createDate(today, 16, 0),
      status: 'upcoming'
    },
    {
      id: '9',
      subject: 'physics',
      teacher: '2',
      student: '3',
      room: '302',
      startTime: createDate(today, 15, 0),
      endTime: createDate(today, 16, 0),
      status: 'upcoming'
    },
    {
      id: '10',
      subject: 'english',
      teacher: '3',
      student: '4',
      room: '303',
      startTime: createDate(today, 15, 0),
      endTime: createDate(today, 16, 0),
      status: 'upcoming'
    },
    {
      id: '11',
      subject: 'chemistry',
      teacher: '4',
      student: '1',
      room: '304',
      startTime: createDate(today, 15, 0),
      endTime: createDate(today, 16, 0),
      status: 'upcoming'
    }
  );
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  // Обычный урок на завтра
  lessons.push({
    id: '12',
    subject: 'biology',
    teacher: '3',
    student: '1',
    room: '101',
    startTime: createDate(tomorrow, 10, 0),
    endTime: createDate(tomorrow, 11, 0),
    status: 'upcoming'
  });
  
  // Отмененный урок на завтра
  lessons.push({
    id: '13',
    subject: 'history',
    teacher: '4',
    student: '2',
    room: '102',
    startTime: createDate(tomorrow, 11, 30),
    endTime: createDate(tomorrow, 12, 30),
    status: 'cancelled'
  });
  
  // 6 параллельных уроков (3x2) на завтра
  const statuses: LessonStatus[] = ['upcoming', 'completed', 'ongoing', 'cancelled', 'postponed', 'upcoming'];
  
  for (let i = 0; i < 6; i++) {
    lessons.push({
      id: `six-${i}`,
      subject: Object.keys(SUBJECTS)[i % Object.keys(SUBJECTS).length] as SubjectId,
      teacher: Object.keys(TEACHERS)[i % Object.keys(TEACHERS).length],
      student: Object.keys(STUDENTS)[i % Object.keys(STUDENTS).length],
      room: `${201 + i}`,
      startTime: createDate(tomorrow, 13, 0),
      endTime: createDate(tomorrow, 14, 0),
      status: statuses[i]
    });
  }
  
  // 9 параллельных занятий (3x3) на послезавтра
  for (let i = 0; i < 9; i++) {
    lessons.push({
      id: `nine-${i}`,
      subject: Object.keys(SUBJECTS)[i % Object.keys(SUBJECTS).length] as SubjectId,
      teacher: Object.keys(TEACHERS)[i % Object.keys(TEACHERS).length],
      student: Object.keys(STUDENTS)[i % Object.keys(STUDENTS).length],
      room: `${301 + i}`,
      startTime: createDate(dayAfterTomorrow, 11, 0),
      endTime: createDate(dayAfterTomorrow, 12, 0),
      status: 'upcoming'
    });
  }
  
  // 10 параллельных занятий (5x2) на послезавтра
  for (let i = 0; i < 10; i++) {
    lessons.push({
      id: `ten-${i}`,
      subject: Object.keys(SUBJECTS)[i % Object.keys(SUBJECTS).length] as SubjectId,
      teacher: Object.keys(TEACHERS)[i % Object.keys(TEACHERS).length],
      student: Object.keys(STUDENTS)[i % Object.keys(STUDENTS).length],
      room: `${401 + i}`,
      startTime: createDate(dayAfterTomorrow, 14, 0),
      endTime: createDate(dayAfterTomorrow, 15, 0),
      status: 'upcoming'
    });
  }
  
  return lessons;
};

export const mockLessons = generateMockLessons();