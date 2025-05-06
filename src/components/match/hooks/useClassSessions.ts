import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type ClassSession = {
  teacherStudent: string;
  subject: string;
  time: string;
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
    return response.data.data;
  } catch (error) {
    // Логируем ошибку
    console.error('Ошибка при запросе данных:', error);
    throw error; // Перебрасываем ошибку, чтобы обработать ее в хук
  }
};

// Хук для получения данных о сессиях
export const useClassSessions = (): { data: ClassSession[] | undefined; isLoading: boolean; error: string | null } => {
  const [data, setData] = useState<ClassSession[] | undefined>(undefined); // Данные сессий классов
  const [isLoading, setIsLoading] = useState<boolean>(true); // Статус загрузки
  const [error, setError] = useState<string | null>(null); // Ошибка

  useEffect(() => {
    // Запрос к API
    const fetchData = async () => {
      try {
        setIsLoading(true); // Устанавливаем статус загрузки в true
        const result = await fetchClassSessions(); // Получаем данные
        const processedData: ClassSession[] = result.map((session: any) => {
          const date = new Date(session.date);
          const startTime = session.startTime ? new Date(session.startTime) : null;
          const endTime = session.endTime ? new Date(session.endTime) : null;

          return {
            teacherStudent: `${session.teacher.name} - ${session.student.name}`, // Связь ученик - преподаватель
            subject: session.subject.name,
            time: `${startTime ? format(startTime, 'HH:mm', { locale: ja }) : '--:--'} - ${endTime ? format(endTime, 'HH:mm', { locale: ja }) : '--:--'}`,
            day: date.toLocaleDateString('en-GB', { weekday: 'long' }), // День недели
            date: date.getDate(), // Число
            status: session.regularClassTemplate ? 'Regular Class' : 'No Template', // Статус
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
