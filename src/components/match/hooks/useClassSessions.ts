// C:\schedule-website\src\components\match\hooks\useClassSessions.ts
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
  regularClassTemplate: any | null; // Тип может быть более конкретным, если известен
  studentClassEnrollments: any[]; // Тип может быть более конкретным, если известен
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
};

// Функция для получения данных о сессиях классов
const fetchClassSessions = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/class-session');

    // Логируем ответ для отладки
    console.log('Response from API:', response);

    // Проверка на успешный статус ответа
    if (response.status !== 200) {
      throw new Error(`Ошибка сервера, статус: ${response.status}`);
    }

    // Возвращаем данные, если статус 200 OK
    return response.data.data as ClassSessionRaw[];
  } catch (error: any) {
    // Логируем ошибку
    console.error('Ошибка при запросе данных:', error.message);
    throw error; // Перебрасываем ошибку, чтобы обработать ее в хук
  }
};

// Хук для получения данных о сессиях
export const useClassSessions = (): { data: ClassSessionProcessed[] | undefined; isLoading: boolean; error: string | null } => {
  const [data, setData] = useState<ClassSessionProcessed[] | undefined>(undefined); // Данные сессий классов
  const [isLoading, setIsLoading] = useState<boolean>(true); // Статус загрузки
  const [error, setError] = useState<string | null>(null); // Ошибка

  useEffect(() => {
    // Запрос к API
    const fetchData = async () => {
      try {
        setIsLoading(true); // Устанавливаем статус загрузки в true
        const result = await fetchClassSessions(); // Получаем данные
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
            status: session.regularClassTemplate , // Берем значение из regularClassTemplate
          };
        });
        setData(processedData); // Устанавливаем обработанные данные
      } catch (error: any) {
        // Обрабатываем ошибку
        setError('クラスセッションの読み込みに失敗しました'); // Сообщение об ошибке
        console.error('Ошибка при получении данных о сессиях:', error.message);
      } finally {
        setIsLoading(false); // Завершаем загрузку
      }
    };

    fetchData(); // Вызов асинхронной функции для загрузки данных
  }, []); // Пустой массив зависимостей для загрузки данных один раз

  return { data, isLoading, error };
};
