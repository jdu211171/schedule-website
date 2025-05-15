// Обновленная версия useModalSelects.ts с исправлением типов

import { useState, useEffect, useCallback } from 'react';
import { 
  Subject, 
  RegularClassTemplate, 
  TimeSlotPreference,
  ClassType,
} from '../types';
import { 
  fetchCompatibleSubjects, 
  fetchAvailableTimeSlots, 
  fetchAvailableBooths,
  createRegularClassTemplate,
  fetchClassTypes
} from '../api-client';

// Interface for available time slots
interface AvailableTimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isPreferredByStudent?: boolean;
}

// Interface for booths
interface Booth {
  boothId: string;
  name: string;
  status: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Hook parameters
interface UseModalSelectsProps {
  teacherId: string | null;
  studentId: string | null;
}

// Hook return values
interface UseModalSelectsReturn {
  // Поля для типов предметов
  subjectTypes: { subjectTypeId: string; name: string }[];
  selectedSubjectType: string;
  setSelectedSubjectType: (typeId: string) => void;
  
  subjects: Subject[];
  availableDays: { value: string; label: string }[];
  availableTimeSlots: AvailableTimeSlot[];
  availableStartTimes: string[];
  availableBooths: Booth[];
  classTypes: ClassType[];
  
  selectedSubject: string;
  selectedDay: string;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedDuration: string;
  selectedBooth: string;
  selectedClassType: string;
  selectedStartDate: string | null;
  selectedEndDate: string | null;
  
  setSelectedSubject: (subjectId: string) => void;
  setSelectedDay: (day: string) => void;
  setSelectedStartTime: (time: string) => void;
  setSelectedDuration: (duration: string) => void;
  setSelectedBooth: (boothId: string) => void;
  setSelectedClassType: (classTypeId: string) => void;
  setSelectedStartDate: (date: string | null) => void;
  setSelectedEndDate: (date: string | null) => void;
  
  loading: boolean;
  error: string | null;
  hasCommonSubjects: boolean;
  hasCommonDays: boolean;
  hasCommonTimeSlots: boolean;
  
  calculateEndTime: (startTime: string, duration: string) => string;
  getDayLabel: (dayValue: string) => string;
  getDurationOptions: () => { value: string; isAvailable: boolean }[];
  resetForm: () => void;
  handleTimeStep: (step: number) => void;
  createClassSession: (notes?: string) => Promise<boolean>;
  getMinMaxDates: () => { minStartDate: Date; maxEndDate: Date };
}

// Day of week mapping to Japanese
const dayMapping: Record<string, string> = {
  'MONDAY': '月曜日',
  'TUESDAY': '火曜日',
  'WEDNESDAY': '水曜日',
  'THURSDAY': '木曜日',
  'FRIDAY': '金曜日',
  'SATURDAY': '土曜日',
  'SUNDAY': '日曜日'
};

export function useModalSelects({
  teacherId,
  studentId,
}: UseModalSelectsProps): UseModalSelectsReturn {
  // Состояния данных для селектов
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableDays, setAvailableDays] = useState<{ value: string; label: string }[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlot[]>([]);
  const [availableStartTimes, setAvailableStartTimes] = useState<string[]>([]);
  const [availableBooths, setAvailableBooths] = useState<Booth[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  
  // Состояния для типов предметов
  const [subjectTypes, setSubjectTypes] = useState<{ subjectTypeId: string; name: string }[]>([]);
  const [selectedSubjectType, setSelectedSubjectType] = useState<string>('');
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  
  // Выбранные значения
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('90分');
  const [selectedBooth, setSelectedBooth] = useState<string>('');
  const [selectedClassType, setSelectedClassType] = useState<string>('');
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  
  // Состояния загрузки
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCommonSubjects, setHasCommonSubjects] = useState<boolean>(true);
  const [hasCommonDays, setHasCommonDays] = useState<boolean>(true);
  const [hasCommonTimeSlots, setHasCommonTimeSlots] = useState<boolean>(true);
  
  // Кэширование данных
  const [cachedData, setCachedData] = useState<{
    subjects?: { teacherId: string; studentId: string; data: Subject[] };
    timeSlots?: { teacherId: string; studentId: string; data: AvailableTimeSlot[] };
    booths?: { dayOfWeek: string; startTime: string; endTime: string; data: Booth[] };
    classTypes?: { data: ClassType[] };
  }>({});
  
  // Форматирование строки времени
  const formatTimeString = useCallback((timeString: string): string => {
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return timeString;
  }, []);
  
  // Конвертация времени в минуты
  const timeToMinutes = useCallback((time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);
  
// Извлечение уникальных типов предметов
const extractSubjectTypes = useCallback((subjectsList: Subject[]) => {
  const uniqueTypes = new Map<string, { subjectTypeId: string; name: string }>();
  
  subjectsList.forEach(subject => {
    if (subject.subjectTypeId) {
      let typeName = "";
      
      // Проверяем разные варианты формата данных
      if (typeof subject.subjectType === 'object' && subject.subjectType !== null) {
        if ('name' in subject.subjectType) {
          typeName = subject.subjectType.name as string;
        }
      } else if (typeof subject.subjectType === 'string') {
        typeName = subject.subjectType;
      } else {
        typeName = `Тип ${subject.subjectTypeId}`;
      }
      
      uniqueTypes.set(subject.subjectTypeId, {
        subjectTypeId: subject.subjectTypeId,
        name: typeName
      });
    }
  });
  
  return Array.from(uniqueTypes.values());
}, []);
  
  // Расчет времени окончания занятия
  const calculateEndTime = useCallback((startTime: string, duration: string): string => {
    if (!startTime) return '';
    
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      let durationMinutes = 90;
      
      if (duration === '60分') durationMinutes = 60;
      else if (duration === '120分') durationMinutes = 120;
      
      const endMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error('Error calculating end time:', e);
      return '';
    }
  }, []);
  
  // Получение метки дня недели
  const getDayLabel = useCallback((dayValue: string): string => {
    return dayMapping[dayValue] || dayValue;
  }, []);
  
  // Проверка соответствия длительности занятия
  const checkDurationFit = useCallback((startTime: string, durationMinutes: number, timeSlots: AvailableTimeSlot[]): boolean => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    
    return timeSlots.some(slot => {
      const slotEnd = formatTimeString(slot.endTime);
      const slotEndMinutes = timeToMinutes(slotEnd);
      return endMinutes <= slotEndMinutes;
    });
  }, [timeToMinutes, formatTimeString]);
  
  // Обновление времени окончания при изменении начала или длительности
  const updateEndTime = useCallback((startTime: string, duration: string) => {
    if (!startTime) {
      setSelectedEndTime('');
      return;
    }
    
    const endTime = calculateEndTime(startTime, duration);
    setSelectedEndTime(endTime);
  }, [calculateEndTime]);
  
  // Получение минимальной и максимальной даты для выбора
  const getMinMaxDates = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = selectedStartDate ? new Date(selectedStartDate) : today;
    const maxDate = new Date(startDate);
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    
    return {
      minStartDate: today,
      maxEndDate: maxDate
    };
  }, [selectedStartDate]);
  
  // Сброс формы
  const resetForm = useCallback(() => {
    setSelectedSubjectType('');
    setSelectedSubject('');
    setSelectedDay('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedDuration('90分');
    setSelectedBooth('');
    
    // Установка сегодняшней даты как даты начала
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setSelectedStartDate(formattedDate);
    setSelectedEndDate(null);
    
    // Фильтрация предметов по типу (сброс фильтра)
    if (allSubjects.length > 0) {
      setSubjects(allSubjects);
    }
  }, [allSubjects]);
  
  // Извлечение доступных дней недели из временных слотов
  const extractAvailableDays = useCallback((timeSlots: AvailableTimeSlot[]) => {
    if (!timeSlots || timeSlots.length === 0) {
      setAvailableDays([]);
      setHasCommonDays(false);
      return;
    }
    
    const uniqueDaysSet = new Set<string>();
    
    timeSlots.forEach(slot => {
      uniqueDaysSet.add(slot.dayOfWeek);
    });
    
    const uniqueDays = Array.from(uniqueDaysSet);
    const formattedDays = uniqueDays.map(day => ({
      value: day,
      label: dayMapping[day] || day
    }));
    
    setAvailableDays(formattedDays);
    setHasCommonDays(formattedDays.length > 0);
    
    if (formattedDays.length === 1) {
      setSelectedDay(formattedDays[0].value);
    }
  }, []);
  
  // Получение опций длительности
  const getDurationOptions = useCallback((): { value: string; isAvailable: boolean }[] => {
    if (!selectedStartTime || !selectedDay || availableTimeSlots.length === 0) {
      return [
        { value: '60分', isAvailable: true },
        { value: '90分', isAvailable: true },
        { value: '120分', isAvailable: true }
      ];
    }
    
    const relevantTimeSlots = availableTimeSlots.filter(slot => {
      const slotStart = formatTimeString(slot.startTime);
      const slotEnd = formatTimeString(slot.endTime);
      
      const slotStartMinutes = timeToMinutes(slotStart);
      const slotEndMinutes = timeToMinutes(slotEnd);
      const selectedTimeMinutes = timeToMinutes(selectedStartTime);
      
      return selectedTimeMinutes >= slotStartMinutes && selectedTimeMinutes < slotEndMinutes;
    });
    
    if (relevantTimeSlots.length === 0) {
      return [
        { value: '60分', isAvailable: false },
        { value: '90分', isAvailable: false },
        { value: '120分', isAvailable: false }
      ];
    }
    
    return [
      { 
        value: '60分', 
        isAvailable: checkDurationFit(selectedStartTime, 60, relevantTimeSlots) 
      },
      { 
        value: '90分', 
        isAvailable: checkDurationFit(selectedStartTime, 90, relevantTimeSlots) 
      },
      { 
        value: '120分', 
        isAvailable: checkDurationFit(selectedStartTime, 120, relevantTimeSlots) 
      }
    ];
  }, [selectedStartTime, selectedDay, availableTimeSlots, timeToMinutes, formatTimeString, checkDurationFit]);
  
  // Обработчик изменения времени с шагом
  const handleTimeStep = useCallback((minutesToAdd: number) => {
    if (!selectedStartTime) {
      if (availableStartTimes.length > 0) {
        setSelectedStartTime(availableStartTimes[0]);
      } else {
        setSelectedStartTime('12:00');
      }
      return;
    }
    
    const [hours, minutes] = selectedStartTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + minutesToAdd;
    
    const validTime = availableTimeSlots.some(slot => {
      const slotStart = formatTimeString(slot.startTime);
      const slotEnd = formatTimeString(slot.endTime);
      const slotStartMinutes = timeToMinutes(slotStart);
      const slotEndMinutes = timeToMinutes(slotEnd);
      
      return totalMinutes >= slotStartMinutes && totalMinutes <= slotEndMinutes - 60;
    });
    
    if (!validTime) {
      if (minutesToAdd > 0) {
        const currentIndex = availableStartTimes.indexOf(selectedStartTime);
        if (currentIndex < availableStartTimes.length - 1) {
          setSelectedStartTime(availableStartTimes[currentIndex + 1]);
        }
      } else {
        const currentIndex = availableStartTimes.indexOf(selectedStartTime);
        if (currentIndex > 0) {
          setSelectedStartTime(availableStartTimes[currentIndex - 1]);
        }
      }
      return;
    }
    
    totalMinutes = Math.round(totalMinutes / 15) * 15;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    setSelectedStartTime(newTime);
  }, [selectedStartTime, availableTimeSlots, availableStartTimes, formatTimeString, timeToMinutes]);
  
  // Загрузка типов классов
  const loadClassTypes = useCallback(async () => {
    if (cachedData.classTypes) {
      setClassTypes(cachedData.classTypes.data);
      
      const defaultType = cachedData.classTypes.data.find((type: ClassType) => type.name === '通常授業');
      if (defaultType) {
        setSelectedClassType(defaultType.classTypeId);
      } else if (cachedData.classTypes.data.length > 0) {
        setSelectedClassType(cachedData.classTypes.data[0].classTypeId);
      }
      
      return;
    }
    
    try {
      const response = await fetchClassTypes();
      const classTypesData = response.data || [];
      setClassTypes(classTypesData);
      
      const defaultType = classTypesData.find((type: ClassType) => type.name === '通常授業');
      if (defaultType) {
        setSelectedClassType(defaultType.classTypeId);
      } else if (classTypesData.length > 0) {
        setSelectedClassType(classTypesData[0].classTypeId);
      }
      
      setCachedData(prev => ({
        ...prev,
        classTypes: {
          data: classTypesData
        }
      }));
    } catch (err) {
      console.error('Error loading class types:', err);
    }
  }, [cachedData.classTypes]);
  
  // Загрузка совместимых предметов
  // Модифицированная функция loadCompatibleSubjects
const loadCompatibleSubjects = useCallback(async () => {
  if (!teacherId || !studentId) return;
  
  if (cachedData.subjects && 
      cachedData.subjects.teacherId === teacherId && 
      cachedData.subjects.studentId === studentId) {
    setSubjects(cachedData.subjects.data);
    setHasCommonSubjects(cachedData.subjects.data.length > 0);
    
    const types = extractSubjectTypes(cachedData.subjects.data);
    setSubjectTypes(types);
    
    return;
  }
  
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetchCompatibleSubjects(teacherId, studentId);
    
    // Получаем сырые предметы из API
    const rawSubjects = response.data?.commonSubjects || [];
    
    // Преобразуем предметы, добавляя имя, если оно отсутствует
    const processedSubjects = rawSubjects.map(subject => {
      // Если у предмета нет name, но есть вложенный subject с name
      if (!subject.name && subject.subject && subject.subject.name) {
        return {
          ...subject,
          name: subject.subject.name // Добавляем имя из вложенного объекта
        };
      }
      return subject;
    });
    
    setAllSubjects(processedSubjects);
    setSubjects(processedSubjects);
    setHasCommonSubjects(processedSubjects.length > 0);
    
    // Извлекаем уникальные типы предметов
    const types = extractSubjectTypes(processedSubjects);
    setSubjectTypes(types);
    
    // Если есть хотя бы один тип, выбираем его по умолчанию
    if (types.length > 0) {
      setSelectedSubjectType(types[0].subjectTypeId);
    }
    
    setCachedData(prev => ({
      ...prev,
      subjects: {
        teacherId,
        studentId,
        data: processedSubjects
      }
    }));
  } catch (err) {
    console.error('Error loading compatible subjects:', err);
    setError('Error loading available subjects');
    setHasCommonSubjects(false);
  } finally {
    setLoading(false);
  }
}, [teacherId, studentId, cachedData.subjects, extractSubjectTypes]);
  
  // Загрузка доступных временных слотов
  const loadAvailableTimeSlots = useCallback(async () => {
    if (!teacherId || !studentId) return;
    
    if (cachedData.timeSlots && 
        cachedData.timeSlots.teacherId === teacherId && 
        cachedData.timeSlots.studentId === studentId) {
      
      setAvailableTimeSlots(cachedData.timeSlots.data);
      extractAvailableDays(cachedData.timeSlots.data);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchAvailableTimeSlots(teacherId, studentId);
      
      const timeSlots: AvailableTimeSlot[] = [];
      
      const studentPreferences = response.data?.studentPreferences || [];
      studentPreferences.forEach((pref: TimeSlotPreference) => {
        if (pref.dayOfWeek && pref.startTime && pref.endTime) {
          timeSlots.push({
            dayOfWeek: pref.dayOfWeek,
            startTime: pref.startTime,
            endTime: pref.endTime,
            isPreferredByStudent: true
          });
        }
      });
      
      const availableSlots = response.data?.availableSlots || [];
      availableSlots.forEach((slot: TimeSlotPreference) => {
        if (slot.dayOfWeek && slot.startTime && slot.endTime) {
          if (!timeSlots.some(s => 
            s.dayOfWeek === slot.dayOfWeek && 
            s.startTime === slot.startTime && 
            s.endTime === slot.endTime)) {
            timeSlots.push({
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime
            });
          }
        }
      });
      
      setAvailableTimeSlots(timeSlots);
      setHasCommonTimeSlots(timeSlots.length > 0);
      
      extractAvailableDays(timeSlots);
      
      setCachedData(prev => ({
        ...prev,
        timeSlots: {
          teacherId,
          studentId,
          data: timeSlots
        }
      }));
    } catch (err) {
      console.error('Error loading available time slots:', err);
      setError('Error loading available time slots');
      setHasCommonTimeSlots(false);
    } finally {
      setLoading(false);
    }
  }, [teacherId, studentId, cachedData.timeSlots, extractAvailableDays]);
  
  // Генерация доступных времен начала с шагом 15 минут
  const generateAvailableStartTimes = useCallback(() => {
    if (!selectedDay || availableTimeSlots.length === 0) {
      setAvailableStartTimes([]);
      return;
    }
    
    const daySlots = availableTimeSlots.filter(slot => slot.dayOfWeek === selectedDay);
    
    if (daySlots.length === 0) {
      setAvailableStartTimes([]);
      return;
    }
    
    const allTimes: string[] = [];
    
    daySlots.forEach(slot => {
      const startTimeFormatted = formatTimeString(slot.startTime);
      const endTimeFormatted = formatTimeString(slot.endTime);
      
      const startMinutes = timeToMinutes(startTimeFormatted);
      const endMinutes = timeToMinutes(endTimeFormatted);
      
      for (let time = startMinutes; time <= endMinutes - 60; time += 15) {
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        if (!allTimes.includes(timeString)) {
          allTimes.push(timeString);
        }
      }
    });
    
    allTimes.sort();
    setAvailableStartTimes(allTimes);
    
    if (allTimes.length > 0 && !selectedStartTime) {
      setSelectedStartTime(allTimes[0]);
      updateEndTime(allTimes[0], selectedDuration);
    }
  }, [selectedDay, availableTimeSlots, selectedStartTime, selectedDuration, formatTimeString, timeToMinutes, updateEndTime]);
  
  // Загрузка доступных кабинетов
  const loadAvailableBooths = useCallback(async () => {
    if (!selectedDay || !selectedStartTime || !selectedEndTime) return;
    
    if (cachedData.booths && 
        cachedData.booths.dayOfWeek === selectedDay && 
        cachedData.booths.startTime === selectedStartTime &&
        cachedData.booths.endTime === selectedEndTime) {
      
      setAvailableBooths(cachedData.booths.data);
      
      if (cachedData.booths.data.length === 1) {
        setSelectedBooth(cachedData.booths.data[0].boothId);
      }
      
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchAvailableBooths(selectedDay, selectedStartTime, selectedEndTime);
      
      const boothsData = response.data || [];
      setAvailableBooths(boothsData);

      if (boothsData.length === 1) {
        setSelectedBooth(boothsData[0].boothId);
      }
      
      setCachedData(prev => ({
        ...prev,
        booths: {
          dayOfWeek: selectedDay,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          data: boothsData
        }
      }));
    } catch (err) {
      console.error('Error loading available booths:', err);
      setError('Error loading available booths');
      setAvailableBooths([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, selectedStartTime, selectedEndTime, cachedData.booths]);
  
  // Создание регулярного занятия
  const createClassSession = useCallback(async (notes?: string): Promise<boolean> => {
    if (!teacherId || !studentId || !selectedSubject || !selectedDay || 
        !selectedStartTime || !selectedEndTime || !selectedBooth) {
      setError('すべての必須フィールドを入力してください');
      return false;
    }
    
    // Находим выбранный предмет для получения subjectTypeId
    const selectedSubjectObj = allSubjects.find(s => s.subjectId === selectedSubject);
    if (!selectedSubjectObj || !selectedSubjectObj.subjectTypeId) {
      setError('選択された科目のタイプがありません');
      return false;
    }
    
    // Находим ID типа класса "通常授業" (обычное занятие)
    const defaultClassType = classTypes.find(type => type.name === '通常授業');
    if (!defaultClassType) {
      setError('デフォルトのクラスタイプが見つかりません');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const templateData: RegularClassTemplate = {
        dayOfWeek: selectedDay,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        teacherId: teacherId,
        subjectId: selectedSubject,
        subjectTypeId: selectedSubjectObj.subjectTypeId,
        boothId: selectedBooth,
        studentIds: [studentId],
        classTypeId: defaultClassType.classTypeId,
        startDate: selectedStartDate || undefined,
        endDate: selectedEndDate || undefined,
        notes: notes || `${getDayLabel(selectedDay)} ${selectedStartTime}-${selectedEndTime}`
      };

      console.log('API Request:', JSON.stringify(templateData, null, 2));
      
      await createRegularClassTemplate(templateData);
      
      resetForm();
      
      return true;
    } catch (err) {
      console.error('Error creating class session:', err);
      setError('Error creating class session');
      return false;
    } finally {
      setLoading(false);
    }
  }, [
    teacherId, studentId, selectedSubject, selectedDay, selectedStartTime, 
    selectedEndTime, selectedBooth, getDayLabel, resetForm, 
    allSubjects, classTypes, selectedStartDate, selectedEndDate
  ]);
  
  // Обработчик изменения дня
  const handleDayChange = useCallback((day: string) => {
    setSelectedDay(day);
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedBooth('');
  }, []);
  
  // Обработчик изменения времени начала
  const handleStartTimeChange = useCallback((time: string) => {
    setSelectedStartTime(time);
    setSelectedBooth('');
  }, []);
  
  // Обработчик изменения длительности
  const handleDurationChange = useCallback((duration: string) => {
    setSelectedDuration(duration);
    if (selectedStartTime) {
      updateEndTime(selectedStartTime, duration);
    }
    setSelectedBooth('');
  }, [selectedStartTime, updateEndTime]);
  
  // Эффект для фильтрации предметов при выборе типа предмета
  // Эффект для фильтрации предметов по типу
useEffect(() => {
  if (selectedSubjectType && allSubjects.length > 0) {
    const filtered = allSubjects.filter(
      subject => subject.subjectTypeId === selectedSubjectType
    );
    
    setSubjects(filtered);
    
    // Если отфильтрованный список пуст, показываем сообщение об ошибке
    if (filtered.length === 0) {
      setErrorMessage(`No subjects found for the selected type: ${selectedSubjectType}`);
    } else {
      setErrorMessage(''); // Очистить сообщение об ошибке, если есть предметы
    }
    
    // Если выбранный предмет не принадлежит к выбранному типу, сбрасываем его
    if (selectedSubject) {
      const subjectExists = filtered.some(s => s.subjectId === selectedSubject);
      if (!subjectExists) {
        setSelectedSubject('');
      }
    }
    
    // Автоматически выбираем предмет, если он только один
    if (filtered.length === 1) {
      setSelectedSubject(filtered[0].subjectId);
    }
  } else if (allSubjects.length > 0) {
    // Если тип не выбран, показываем все предметы
    setSubjects(allSubjects);
  }
}, [selectedSubjectType, allSubjects, selectedSubject, setSelectedSubject]);
  
  // Установка даты начала по умолчанию
  useEffect(() => {
    if (!selectedStartDate) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setSelectedStartDate(formattedDate);
    }
  }, [selectedStartDate]);
  
  // Эффект для загрузки данных при открытии модального окна
  useEffect(() => {
    loadClassTypes();
    
    if (teacherId && studentId) {
      loadCompatibleSubjects();
      loadAvailableTimeSlots();
    }
  }, [teacherId, studentId, loadCompatibleSubjects, loadAvailableTimeSlots, loadClassTypes]);
  
  // Эффект для генерации доступных времен начала при выборе дня
  useEffect(() => {
    if (selectedDay) {
      generateAvailableStartTimes();
    } else {
      setAvailableStartTimes([]);
    }
  }, [selectedDay, generateAvailableStartTimes]);
  
  // Эффект для загрузки кабинетов при изменении времени
  useEffect(() => {
    if (selectedDay && selectedStartTime && selectedEndTime) {
      loadAvailableBooths();
    } else {
      setAvailableBooths([]);
    }
  }, [selectedDay, selectedStartTime, selectedEndTime, loadAvailableBooths]);
  
  // Эффект для обновления времени окончания при изменении времени начала или длительности
  useEffect(() => {
    updateEndTime(selectedStartTime, selectedDuration);
  }, [selectedStartTime, selectedDuration, updateEndTime]);
  
  return {
    // Данные для селектов
    subjectTypes,
    selectedSubjectType,
    setSelectedSubjectType,
    subjects,
    availableDays,
    availableTimeSlots,
    availableStartTimes,
    availableBooths,
    classTypes,
    
    // Выбранные значения
    selectedSubject,
    selectedDay,
    selectedStartTime,
    selectedEndTime,
    selectedDuration,
    selectedBooth,
    selectedClassType,
    selectedStartDate,
    selectedEndDate,
    
    // Сеттеры для выбранных значений
    setSelectedSubject,
    setSelectedDay: handleDayChange,
    setSelectedStartTime: handleStartTimeChange,
    setSelectedDuration: handleDurationChange,
    setSelectedBooth,
    setSelectedClassType,
    setSelectedStartDate,
    setSelectedEndDate,
    
    // Состояния загрузки
    loading,
    error,
    hasCommonSubjects,
    hasCommonDays,
    hasCommonTimeSlots,
    
    // Полезные методы
    calculateEndTime,
    getDayLabel,
    getDurationOptions,
    resetForm,
    handleTimeStep,
    createClassSession,
    getMinMaxDates
  };
}