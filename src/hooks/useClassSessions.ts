import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type ClassSessionRaw = {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  templateId: string | null;
  teacher?: { name?: string };
  student?: { name?: string };
  subject?: { name?: string };
  classType?: { name?: string };
};

export type ClassSessionProcessed = {
  teacher: string;
  student: string;
  subject: string;
  startTime: string;
  endTime: string;
  day: string;
  date: Date; // <--- Изменено на Date
  status: string;
  classTypeName: string;
  classId: string;
};

type UseClassSessionsResult = {
  data: ClassSessionProcessed[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  setTemplates: Dispatch<SetStateAction<ClassSessionProcessed[] | undefined>>;
};

export const useClassSessions = (): UseClassSessionsResult => {
  const [data, setData] = useState<ClassSessionProcessed[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const fetchData = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await fetch('/api/class-session');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: { data: ClassSessionRaw[] } = await response.json();
      const processedData: ClassSessionProcessed[] = result.data.map((session) => {
        const date = new Date(session.date);
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);

        let status: string;
        if (session.templateId === null) {
          status = 'default';
        } else {
          status = 'rare';
        }

        return {
          teacher: session.teacher?.name || '---',
          student: session.student?.name || '---',
          subject: session.subject?.name || '---',
          startTime: format(startTime, 'HH:mm', { locale: ja }),
          endTime: format(endTime, 'HH:mm', { locale: ja }),
          day: date.toLocaleDateString('en-GB', { weekday: 'long' }),
          date: date, // <--- Сохраняем весь объект Date
          status: status,
          classTypeName: session.classType?.name || '---',
          classId: session.classId,
        };
      });
      setData(processedData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return { data, isLoading, error, setTemplates: setData };
};
