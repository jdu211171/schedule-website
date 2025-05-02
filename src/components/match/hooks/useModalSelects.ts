// components/match/hooks/useModalSelects.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Subject } from '../types';

interface AvailableTimeSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isPreferredByStudent?: boolean;
}

interface Booth {
  boothId: string;
  name: string;
  status: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseModalSelectsProps {
  teacherId: string | null;
  studentId: string | null;
}

interface UseModalSelectsReturn {
  subjects: Subject[];
  availableDays: { value: string; label: string }[];
  availableTimeSlots: AvailableTimeSlot[];
  availableStartTimes: string[];
  availableBooths: Booth[];
  
  selectedSubject: string;
  selectedDay: string;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedDuration: string;
  selectedBooth: string;
  
  setSelectedSubject: (subjectId: string) => void;
  setSelectedDay: (day: string) => void;
  setSelectedStartTime: (time: string) => void;
  setSelectedDuration: (duration: string) => void;
  setSelectedBooth: (boothId: string) => void;
  
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
}

const dayMapping: Record<string, string> = {
  'MONDAY': '月曜日',
  'TUESDAY': '火曜日',
  'WEDNESDAY': '水曜日',
  'THURSDAY': '木曜日',
  'FRIDAY': '金曜日',
  'SATURDAY': '土曜日',
  'SUNDAY': '日曜日'
};

const API_URL = 'http://localhost:3000/api';

export function useModalSelects({
  teacherId,
  studentId,
}: UseModalSelectsProps): UseModalSelectsReturn {
  // Data for selects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableDays, setAvailableDays] = useState<{ value: string; label: string }[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlot[]>([]);
  const [availableStartTimes, setAvailableStartTimes] = useState<string[]>([]);
  const [availableBooths, setAvailableBooths] = useState<Booth[]>([]);
  
  // Selected values
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('90分');
  const [selectedBooth, setSelectedBooth] = useState<string>('');
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCommonSubjects, setHasCommonSubjects] = useState<boolean>(true);
  const [hasCommonDays, setHasCommonDays] = useState<boolean>(true);
  const [hasCommonTimeSlots, setHasCommonTimeSlots] = useState<boolean>(true);
  
  // Data caching
  const [cachedData, setCachedData] = useState<{
    subjects?: { teacherId: string; studentId: string; data: Subject[] };
    timeSlots?: { teacherId: string; studentId: string; data: AvailableTimeSlot[] };
    booths?: { dayOfWeek: string; startTime: string; endTime: string; data: Booth[] };
  }>({});
  
  // Format time string to uniform HH:MM format
  const formatTimeString = useCallback((timeString: string): string => {
    // Если время в формате ISO строки (например, "1970-01-01T14:00:00.000Z")
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return timeString;
  }, []);
  
  // Helper function for converting time to minutes
  const timeToMinutes = useCallback((time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);
  
  // Function for calculating the end time of the lesson
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
      console.error('Ошибка расчета времени окончания:', e);
      return '';
    }
  }, []);
  
  // Function to get day of week label
  const getDayLabel = useCallback((dayValue: string): string => {
    return dayMapping[dayValue] || dayValue;
  }, []);
  
  // Helper function for calculating duration
  const checkDurationFit = useCallback((startTime: string, durationMinutes: number, timeSlots: AvailableTimeSlot[]): boolean => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    
    return timeSlots.some(slot => {
      const slotEnd = formatTimeString(slot.endTime);
      const slotEndMinutes = timeToMinutes(slotEnd);
      return endMinutes <= slotEndMinutes;
    });
  }, [timeToMinutes, formatTimeString]);
  
  // Update end time when start time or duration changes
  const updateEndTime = useCallback((startTime: string, duration: string) => {
    if (!startTime) {
      setSelectedEndTime('');
      return;
    }
    
    const endTime = calculateEndTime(startTime, duration);
    setSelectedEndTime(endTime);
  }, [calculateEndTime]);
  
  // Method to reset the form
  const resetForm = useCallback(() => {
    setSelectedSubject('');
    setSelectedDay('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedDuration('90分');
    setSelectedBooth('');
  }, []);
  
  // Extract unique days of the week from time slots
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
  
  // Function to get duration options
  const getDurationOptions = useCallback((): { value: string; isAvailable: boolean }[] => {
    if (!selectedStartTime || !selectedDay || availableTimeSlots.length === 0) {
      return [
        { value: '60分', isAvailable: true },
        { value: '90分', isAvailable: true },
        { value: '120分', isAvailable: true }
      ];
    }
    
    // Find an available time slot that contains the selected start time
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
    
    // Determine which durations fit into the available slot
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
  
  // Handler for changing time with step
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
    
    // Round up to the nearest 15 minutes
    totalMinutes = Math.round(totalMinutes / 15) * 15;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    setSelectedStartTime(newTime);
  }, [selectedStartTime, availableTimeSlots, availableStartTimes, formatTimeString, timeToMinutes]);
  
  // Loading compatible subjects
  const loadCompatibleSubjects = useCallback(async () => {
    if (!teacherId || !studentId) return;
    
    if (cachedData.subjects && 
        cachedData.subjects.teacherId === teacherId && 
        cachedData.subjects.studentId === studentId) {
      setSubjects(cachedData.subjects.data);
      setHasCommonSubjects(cachedData.subjects.data.length > 0);
      
      if (cachedData.subjects.data.length === 1) {
        setSelectedSubject(cachedData.subjects.data[0].subjectId);
      }
      
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
        params: {
          action: 'compatible-subjects',
          teacherId,
          studentId
        }
      });
      
      console.log('API response for compatible subjects:', data);
      
      // Используем только общие предметы (commonSubjects)
      const commonSubjects = data.data?.commonSubjects || [];
      setSubjects(commonSubjects);
      setHasCommonSubjects(commonSubjects.length > 0);
      
      // If there is only one item, select it automatically
      if (commonSubjects.length === 1) {
        setSelectedSubject(commonSubjects[0].subjectId);
      }
      
      setCachedData(prev => ({
        ...prev,
        subjects: {
          teacherId,
          studentId,
          data: commonSubjects
        }
      }));
    } catch (err) {
      console.error('Error loading compatible subjects:', err);
      setError('Ошибка при загрузке доступных предметов');
      setHasCommonSubjects(false);
    } finally {
      setLoading(false);
    }
  }, [teacherId, studentId, cachedData.subjects]);
  
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
      const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
        params: {
          action: 'available-time-slots',
          teacherId,
          studentId
        }
      });
      
      console.log('API response for available time slots:', data);
      
      // Get available time slots from API response
      const availableSlots = data.data?.availableSlots || [];
      setAvailableTimeSlots(availableSlots);
      setHasCommonTimeSlots(availableSlots.length > 0);
      
      extractAvailableDays(availableSlots);
      
      setCachedData(prev => ({
        ...prev,
        timeSlots: {
          teacherId,
          studentId,
          data: availableSlots
        }
      }));
    } catch (err) {
      console.error('Error loading available time slots:', err);
      setError('Ошибка при загрузке доступных временных слотов');
      setHasCommonTimeSlots(false);
    } finally {
      setLoading(false);
    }
  }, [teacherId, studentId, cachedData.timeSlots, extractAvailableDays]);
  
  // Generate available class start times in 15 minute increments
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
  
  // Loading available booths
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
      const { data } = await axios.get(`${API_URL}/regular-class-templates`, {
        params: {
          action: 'available-booths',
          dayOfWeek: selectedDay,
          startTime: selectedStartTime,
          endTime: selectedEndTime
        }
      });
      
      
      const boothsData = data.data || [];
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
      setError('Ошибка при загрузке доступных кабинетов');
      setAvailableBooths([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, selectedStartTime, selectedEndTime, cachedData.booths]);
  
  // Handler for changing the selected day
  const handleDayChange = useCallback((day: string) => {
    setSelectedDay(day);
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedBooth('');
  }, []);
  
  // Duration change handler
  const handleStartTimeChange = useCallback((time: string) => {
    setSelectedStartTime(time);
    setSelectedBooth('');
  }, []);
  
  // Обработчик изменения продолжительности
  const handleDurationChange = useCallback((duration: string) => {
    setSelectedDuration(duration);
    if (selectedStartTime) {
      updateEndTime(selectedStartTime, duration);
    }
    setSelectedBooth('');
  }, [selectedStartTime, updateEndTime]);
  
  // Effect for loading data when opening modal window
  useEffect(() => {
    if (teacherId && studentId) {
      loadCompatibleSubjects();
      loadAvailableTimeSlots();
    }
  }, [teacherId, studentId, loadCompatibleSubjects, loadAvailableTimeSlots]);
  
  // Effect for generating available start times when selecting a day
  useEffect(() => {
    if (selectedDay) {
      generateAvailableStartTimes();
    } else {
      setAvailableStartTimes([]);
    }
  }, [selectedDay, generateAvailableStartTimes]);
  
  // Effect for loading cabinets when time changes
  useEffect(() => {
    if (selectedDay && selectedStartTime && selectedEndTime) {
      loadAvailableBooths();
    } else {
      setAvailableBooths([]);
    }
  }, [selectedDay, selectedStartTime, selectedEndTime, loadAvailableBooths]);
  
  // Effect to update end time when start time or duration changes
  useEffect(() => {
    updateEndTime(selectedStartTime, selectedDuration);
  }, [selectedStartTime, selectedDuration, updateEndTime]);
  
  return {
    // Data for selects
    subjects,
    availableDays,
    availableTimeSlots,
    availableStartTimes,
    availableBooths,
    
    // Selected values
    selectedSubject,
    selectedDay,
    selectedStartTime,
    selectedEndTime,
    selectedDuration,
    selectedBooth,
    
    // Setters for selected values
    setSelectedSubject,
    setSelectedDay: handleDayChange,
    setSelectedStartTime: handleStartTimeChange,
    setSelectedDuration: handleDurationChange,
    setSelectedBooth,
    
    // Loading states
    loading,
    error,
    hasCommonSubjects,
    hasCommonDays,
    hasCommonTimeSlots,
    
    // Useful methods
    calculateEndTime,
    getDayLabel,
    getDurationOptions,
    resetForm,
    handleTimeStep
  };
}