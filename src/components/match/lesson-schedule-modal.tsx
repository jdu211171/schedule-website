"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Lesson } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WeeklySchedule from "./weekly-schedule";

interface ExtendedLesson {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  studentName: string;
  dayOfWeek: number; // 0-6, где 0 - воскресенье
  startTime: string;
  endTime: string;
  status: string;
  teacherId?: string;
  studentId?: string;
  room?: string;
}

interface LessonScheduleModalProps {
  lessons: Lesson[];
  onClose: () => void;
  teacherName: string;
  studentName: string;
  open: boolean;
  onAddLesson?: (lesson: Partial<Lesson>) => void;
}

export default function CustomLessonModal({
  lessons: propsLessons,
  onClose,
  teacherName,
  studentName,
  open,
  onAddLesson,
}: LessonScheduleModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<string>("90分");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<ExtendedLesson[]>([]);
  
  // Состояние для режима редактирования
  const [editMode, setEditMode] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ExtendedLesson | null>(null);

  // Преобразуем уроки из пропсов в формат ExtendedLesson и поддерживаем синхронизацию
  useEffect(() => {
    // Преобразуем уроки из пропсов в формат ExtendedLesson
    const formattedLessons: ExtendedLesson[] = propsLessons.map(lesson => {
      // Определяем предмет из имени урока
      const subjectKey = Object.keys({
        "physics": "物理",
        "chemistry": "化学",
        "math": "数学"
      }).find(key => lesson.name === key || lesson.name === getSubjectNameJapanese(key)) || lesson.name;
      
      return {
        id: lesson.id,
        name: getSubjectNameJapanese(subjectKey), // Используем японское название
        subject: subjectKey, // Сохраняем ключ для внутреннего использования
        teacherName: teacherName,
        studentName: studentName,
        dayOfWeek: typeof lesson.dayOfWeek === 'string' ? parseInt(lesson.dayOfWeek) : lesson.dayOfWeek || 0,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        status: lesson.status,
        teacherId: lesson.teacherId,
        studentId: lesson.studentId,
        room: selectedRoom || "未設定"
      };
    });

    // Обновляем локальное состояние, но сохраняем временные уроки
    setLessons(prevLessons => {
      // Находим временные уроки (созданные пользователем в интерфейсе)
      const tempLessons = prevLessons.filter(lesson => 
        lesson.id.startsWith('temp-') && 
        !formattedLessons.some(l => l.id === lesson.id)
      );
      
      // Объединяем уроки из пропсов с временными уроками
      return [...formattedLessons, ...tempLessons];
    });
  }, [propsLessons, teacherName, studentName, selectedRoom]);

  // Если модальное окно не открыто, не рендерим ничего
  if (!open) return null;

  // Валидация ввода времени (HH:MM с шагом в 15 минут)
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartTime(value);
    
    if (value) {
      const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      
      if (!timePattern.test(value)) {
        setTimeError("正しい時間形式を入力してください (HH:MM)");
        return;
      }
      
      const minutes = parseInt(value.split(":")[1]);
      if (minutes % 15 !== 0) {
        setTimeError("時間は15分単位でなければなりません (00, 15, 30, 45)");
        return;
      }
      
      setTimeError(null);
    } else {
      setTimeError(null);
    }
  };
  
  // Функция для пошагового изменения времени с шагом в 15 минут
  const handleTimeStep = (minutesToAdd: number) => {
    if (!startTime) {
      // Если время не задано, устанавливаем 12:00
      setStartTime("12:00");
      return;
    }

    try {
      const [hours, minutes] = startTime.split(":").map(Number);
      
      // Вычисляем новое время в минутах
      let totalMinutes = hours * 60 + minutes + minutesToAdd;
      
      // Обеспечиваем, чтобы время находилось в пределах суток (0:00 - 23:59)
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      totalMinutes %= 24 * 60;
      
      // Вычисляем новые часы и минуты
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      
      // Форматируем обратно в строку HH:MM
      const formattedHours = newHours.toString().padStart(2, "0");
      const formattedMinutes = newMinutes.toString().padStart(2, "0");
      
      const newTime = `${formattedHours}:${formattedMinutes}`;
      setStartTime(newTime);
      setTimeError(null);
    } catch (e) {
      console.error("Ошибка при изменении времени:", e);
    }
  };

  // Автоматический расчет времени окончания при изменении времени начала или продолжительности
  useEffect(() => {
    if (startTime && !timeError) {
      try {
        const [hours, minutes] = startTime.split(":").map(Number);
        let durationMinutes = 90; // По умолчанию
        
        if (selectedDuration === "60分") durationMinutes = 60;
        if (selectedDuration === "120分") durationMinutes = 120;
        
        const endMinutes = hours * 60 + minutes + durationMinutes;
        const endHours = Math.floor(endMinutes / 60) % 24; // Используем модуль 24 для корректной работы с временем после полуночи
        const endMins = endMinutes % 60;
        
        const formattedHours = endHours.toString().padStart(2, "0");
        const formattedMinutes = endMins.toString().padStart(2, "0");
        
        setEndTime(`${formattedHours}:${formattedMinutes}`);
      } catch (e) {
        // Если произошла ошибка парсинга времени, не обновляем endTime
        console.error("Ошибка расчета времени окончания:", e);
      }
    }
  }, [startTime, selectedDuration, timeError]);

  // Преобразование дня недели из строкового формата в числовой (0-6)
  const getDayOfWeekNumber = (day: string): number => {
    const dayMap: { [key: string]: number } = {
      "sunday": 0,
      "monday": 1,
      "tuesday": 2,
      "wednesday": 3,
      "thursday": 4, 
      "friday": 5,
      "saturday": 6
    };
    return dayMap[day] || 0;
  };

  // Получение японского названия предмета
  const getSubjectNameJapanese = (subject: string): string => {
    const subjectMap: { [key: string]: string } = {
      "physics": "物理",
      "chemistry": "化学",
      "math": "数学"
    };
    return subjectMap[subject] || subject;
  };

  // Получение японского названия дня недели
  const getDayOfWeekJapanese = (dayNumber: number): string => {
    const dayMap: { [key: number]: string } = {
      0: "日曜日",
      1: "月曜日",
      2: "火曜日",
      3: "水曜日",
      4: "木曜日", 
      5: "金曜日",
      6: "土曜日"
    };
    return dayMap[dayNumber] || "";
  };

  // Обработчик клика по уроку для редактирования
  const handleLessonClick = (lesson: ExtendedLesson) => {
    setEditMode(true);
    setEditingLesson(lesson);
    
    // Заполняем форму данными выбранного урока
    setSelectedSubject(lesson.subject);
    
    // Преобразуем числовой формат дня недели обратно в строковый
    const dayMapReverse: { [key: number]: string } = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday", 
      5: "friday",
      6: "saturday"
    };
    setSelectedDay(dayMapReverse[lesson.dayOfWeek] || "");
    
    // Определяем продолжительность урока из времени начала и окончания
    const [startHours, startMinutes] = lesson.startTime.split(":").map(Number);
    const [endHours, endMinutes] = lesson.endTime.split(":").map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    let duration = endTotalMinutes - startTotalMinutes;
    // Обработка уроков, переходящих через полночь
    if (duration < 0) {
      duration += 24 * 60;
    }
    
    // Устанавливаем ближайшее значение продолжительности
    if (duration <= 60) {
      setSelectedDuration("60分");
    } else if (duration <= 90) {
      setSelectedDuration("90分");
    } else {
      setSelectedDuration("120分");
    }
    
    setStartTime(lesson.startTime);
    setEndTime(lesson.endTime);
    setSelectedRoom(lesson.room || "");
  };

  // Обработчик обновления/добавления урока
  const handleSaveLesson = () => {
    if (!selectedSubject || !selectedDay || !startTime || !endTime) {
      // Проверка на заполнение всех полей
      alert("すべてのフィールドに入力してください。");
      return;
    }

    const now = new Date();
    const today = now.getDay(); 
    const currentTime = now.getHours() * 60 + now.getMinutes();  // текущее время в минутах
    
    const selectedDayNumber = getDayOfWeekNumber(selectedDay);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const lessonStartTimeInMinutes = startHours * 60 + startMinutes;

    if (selectedDayNumber < today || 
        (selectedDayNumber === today && lessonStartTimeInMinutes <= currentTime)) {
      alert("過去の時間に授業を追加することはできません。");
      return;
    }

    if (editMode && editingLesson) {
      // Режим редактирования - обновляем существующий урок
      const updatedLesson: ExtendedLesson = {
        ...editingLesson,
        subject: selectedSubject,
        name: getSubjectNameJapanese(selectedSubject),
        dayOfWeek: getDayOfWeekNumber(selectedDay),
        startTime,
        endTime,
        room: selectedRoom || "未設定"
      };

      // Обновляем урок в локальном состоянии
      setLessons(prevLessons => 
        prevLessons.map(lesson => 
          lesson.id === editingLesson.id ? updatedLesson : lesson
        )
      );

      // Передаем обновленные данные во внешний обработчик, если он есть
      if (onAddLesson) {
        onAddLesson({
          id: editingLesson.id,
          name: getSubjectNameJapanese(selectedSubject),
          dayOfWeek: getDayOfWeekNumber(selectedDay).toString(),
          startTime,
          endTime,
          status: editingLesson.status,
        });
      }
    } else {
      // Режим создания - добавляем новый урок
      const newLesson: ExtendedLesson = {
        id: `temp-${Date.now()}`, // Временный ID с префиксом для идентификации
        name: getSubjectNameJapanese(selectedSubject),
        subject: selectedSubject,
        teacherName: teacherName,
        studentName: studentName,
        dayOfWeek: getDayOfWeekNumber(selectedDay),
        startTime,
        endTime,
        status: "有効",
        room: selectedRoom || "未設定"
      };

      // Добавляем урок в локальное состояние
      setLessons(prevLessons => [...prevLessons, newLesson]);

      // Также передаем урок во внешний обработчик, если он есть
      if (onAddLesson) {
        onAddLesson({
          name: getSubjectNameJapanese(selectedSubject),
          dayOfWeek: getDayOfWeekNumber(selectedDay).toString(),
          startTime,
          endTime,
          status: "有効",
        });
      }
    }

    // Сбрасываем форму и режим редактирования после сохранения
    resetForm();
  };

  // Функция для сброса формы и режима редактирования
  const resetForm = () => {
    setSelectedSubject("");
    setSelectedDay("");
    setStartTime("");
    setEndTime("");
    setSelectedRoom("");
    setEditMode(false);
    setEditingLesson(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white w-[85%] max-w-[1200px] max-h-[95vh] rounded-lg shadow-lg flex flex-col">
        {/* Заголовок */}
        <div className="px-6 py-3 border-b flex justify-between items-center">
          <div>
            <h2 className="flex items-center text-xl font-bold">
              <BookOpen className="mr-2 h-5 w-5" />
              {editMode ? '授業を編集' : '授業設定'}
            </h2>
            <div className="text-sm text-gray-500">
              {teacherName} - {studentName}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Основное содержимое */}
        <div className="px-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-3 gap-8 py-3">
            <div>
              <Label className="block text-sm font-medium mb-1">科目</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="物理" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  <SelectItem value="physics" className="cursor-pointer">物理</SelectItem>
                  <SelectItem value="chemistry" className="cursor-pointer">化学</SelectItem>
                  <SelectItem value="math" className="cursor-pointer">数学</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">曜日</Label>
              <Select 
                value={selectedDay} 
                onValueChange={setSelectedDay}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="月曜日" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  <SelectItem value="monday" className="cursor-pointer">月曜日</SelectItem>
                  <SelectItem value="tuesday" className="cursor-pointer">火曜日</SelectItem>
                  <SelectItem value="wednesday" className="cursor-pointer">水曜日</SelectItem>
                  <SelectItem value="thursday" className="cursor-pointer">木曜日</SelectItem>
                  <SelectItem value="friday" className="cursor-pointer">金曜日</SelectItem>
                  <SelectItem value="saturday" className="cursor-pointer">土曜日</SelectItem>
                  <SelectItem value="sunday" className="cursor-pointer">日曜日</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">授業時間</Label>
              <div className="flex space-x-3">
                <Button 
                  variant={selectedDuration === "60分" ? "default" : "outline"} 
                  className={`flex-1 cursor-pointer ${selectedDuration === "60分" ? "bg-black text-white" : ""}`}
                  onClick={() => setSelectedDuration("60分")}
                >
                  60分
                </Button>
                <Button 
                  variant={selectedDuration === "90分" ? "default" : "outline"} 
                  className={`flex-1 cursor-pointer ${selectedDuration === "90分" ? "bg-black text-white" : ""}`}
                  onClick={() => setSelectedDuration("90分")}
                >
                  90分
                </Button>
                <Button 
                  variant={selectedDuration === "120分" ? "default" : "outline"} 
                  className={`flex-1 cursor-pointer ${selectedDuration === "120分" ? "bg-black text-white" : ""}`}
                  onClick={() => setSelectedDuration("120分")}
                >
                  120分
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">開始時刻</Label>
              <div className="relative">
                <div className="flex">
                  <Input
                    type="text"
                    placeholder="12:00"
                    value={startTime}
                    onChange={handleTimeChange}
                    className={`w-full cursor-text rounded-r-none ${timeError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <div className="flex flex-col border border-l-0 border-input rounded-r-md overflow-hidden">
                    <button 
                      onClick={() => handleTimeStep(15)}
                      className="flex-1 hover:bg-gray-100 px-2 cursor-pointer flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <div className="h-px bg-input w-full"></div>
                    <button 
                      onClick={() => handleTimeStep(-15)}
                      className="flex-1 hover:bg-gray-100 px-2 cursor-pointer flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>
                {timeError && (
                  <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs bg-red-100 text-red-800 border border-red-300 rounded z-10">
                    {timeError}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">15分単位で入力してください (例: 12:00, 12:15)</p>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">終了時刻</Label>
              <Input
                type="text"
                placeholder="自動計算"
                value={endTime}
                readOnly
                className="w-full bg-gray-50 cursor-not-allowed"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">ブース</Label>
              <Select 
                value={selectedRoom} 
                onValueChange={setSelectedRoom}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="ブースを選択" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer">
                  <SelectItem value="booth1" className="cursor-pointer">ブース1</SelectItem>
                  <SelectItem value="booth2" className="cursor-pointer">ブース2</SelectItem>
                  <SelectItem value="booth3" className="cursor-pointer">ブース3</SelectItem>
                  <SelectItem value="booth4" className="cursor-pointer">ブース4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className={`w-full py-6 cursor-pointer my-5 ${
              editMode 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-400 hover:bg-gray-500 text-white'
            }`}
            onClick={handleSaveLesson}
          >
            {editMode ? '授業を更新' : '授業を追加'}
          </Button>

          {/* Компонент расписания */}
          <div className="mt-2 border-t pt-2">
            <WeeklySchedule 
              lessons={lessons} 
              onLessonClick={(lesson) => {
                // Приводим типы перед вызовом обработчика
                handleLessonClick(lesson as ExtendedLesson);
              }}
            />
          </div>
        </div>

        {/* Футер */}
        <div className="px-6 py-3 border-t flex justify-between">
          {editMode && (
            <Button 
              variant="destructive" 
              onClick={resetForm}
              className="cursor-pointer"
            >
              キャンセル
            </Button>
          )}
          <div className="flex-grow"></div>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}