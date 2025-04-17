export type Lesson = {
    title: string
    start: string
    end: string
    location: string
    teacher: string
  }
  
  export const lessons: Lesson[] = [
    {
      title: '数学Ⅰ',
      start: '2025-04-07T09:00:00',
      end: '2025-04-07T10:30:00',
      location: 'A101',
      teacher: '田中先生',
    },
    {
      title: '英語Ⅱ',
      start: '2025-04-07T13:00:00',
      end: '2025-04-07T14:30:00',
      location: 'B202',
      teacher: '佐藤先生',
    },
    {
      title: '物理',
      start: '2025-04-08T11:00:00',
      end: '2025-04-08T12:30:00',
      location: 'C303',
      teacher: '山本先生',
    },
    {
      title: '化学',
      start: '2025-04-10T09:00:00',
      end: '2025-04-10T10:30:00',
      location: 'D404',
      teacher: '鈴木先生',
    },
  ]
  