import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type ClassSessionRaw = {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  studentId: string;
  subjectId: string;
  boothId: string;
  templateId: string | null;
  notes: string | null;
  booth: { name: string } | null;
  classType: { name: string } | null;
  subject: { name: string } | null;
  teacher: { name: string } | null;
  student: { name: string } | null;
  regularClassTemplate: string | null;
  studentClassEnrollments: unknown[];
};

type ClassSessionProcessed = {
  teacher: string;
  student: string;
  subject: string;
  startTime: string;
  endTime: string;
  day: string;
  date: number;
  status: string;
  classTypeName: string;
};

const fetchClassSessions = async () => {
  try {
    const response = await axios.get<{ data: ClassSessionRaw[] }>('http://localhost:3000/api/class-session');
    if (response.status !== 200) {
      throw new Error(`Ошибка сервера, статус: ${response.status}`);
    }
    return response.data.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Ошибка при запросе данных:', error.message);
    } else {
      console.error('Неизвестная ошибка при запросе данных:', error);
    }
    throw error;
  }
};

export const useClassSessions = (): { data: ClassSessionProcessed[] | undefined; isLoading: boolean; error: string | null } => {
  const [data, setData] = useState<ClassSessionProcessed[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchClassSessions();
        const processedData: ClassSessionProcessed[] = result.map((session) => {
          const date = new Date(session.date);
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);

          return {
            teacher: session.teacher?.name || '---',
            student: session.student?.name || '---',
            subject: session.subject?.name || '---',
            startTime: format(startTime, 'HH:mm', { locale: ja }),
            endTime: format(endTime, 'HH:mm', { locale: ja }),
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
            date: date.getDate(),
            status: session.regularClassTemplate || '---',
            classTypeName: session.classType?.name || '---',
          };
        });
        setData(processedData);
      } catch (error: unknown) {
        setError('クラスセッションの読み込みに失敗しました');
        if (error instanceof Error) {
          console.error('Ошибка при получении данных о сессиях:', error.message);
        } else {
          console.error('Неизвестная ошибка при получении данных о сессиях:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
};
