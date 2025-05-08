// components/match/hooks/useModalSelects.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  Subject, 
  RegularClassTemplate, 
  TimeSlotPreference,
  ClassType
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
  // Data for selects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableDays, setAvailableDays] = useState<{ value: string; label: string }[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlot[]>([]);
  const [availableStartTimes, setAvailableStartTimes] = useState<string[]>([]);
  const [availableBooths, setAvailableBooths] = useState<Booth[]>([]);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  
  // Selected values
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('90分');
  const [selectedBooth, setSelectedBooth] = useState<string>('');
  const [selectedClassType, setSelectedClassType] = useState<string>('');
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  
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
    classTypes?: { data: ClassType[] };
  }>({});
  
  // Format time string to uniform HH:MM format
  const formatTimeString = useCallback((timeString: string): string => {
    // If time is in ISO string format (e.g., "1970-01-01T14:00:00.000Z")
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
      console.error('Error calculating end time:', e);
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
  
  // Function to get min and max dates for date pickers
  const getMinMaxDates = useCallback(() => {
    // Today at midnight - минимальная дата начала
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // For maxEndDate, calculate 2 years from selectedStartDate if exists, otherwise 2 years from today
    const startDate = selectedStartDate ? new Date(selectedStartDate) : today;
    const maxDate = new Date(startDate);
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    
    return {
      minStartDate: today,
      maxEndDate: maxDate
    };
  }, [selectedStartDate]);
  
  // Method to reset the form
  const resetForm = useCallback(() => {
    setSelectedSubject('');
    setSelectedDay('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedDuration('90分');
    setSelectedBooth('');
    
    // Set default class type (通常授業) if available
    const defaultType = classTypes.find(type => type.name === '通常授業');
    if (defaultType) {
      setSelectedClassType(defaultType.classTypeId);
    } else if (classTypes.length > 0) {
      setSelectedClassType(classTypes[0].classTypeId);
    } else {
      setSelectedClassType('');
    }
    
    // Set today as start date
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setSelectedStartDate(formattedDate);
    setSelectedEndDate(null);
  }, [classTypes]);
  
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
  
  // Load class types
  const loadClassTypes = useCallback(async () => {
    // If we already have cached class types, use them
    if (cachedData.classTypes) {
      setClassTypes(cachedData.classTypes.data);
      
      // Set default class type (通常授業) if available
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
      
      // Set default class type (通常授業) if available
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
      const response = await fetchCompatibleSubjects(teacherId, studentId);
      
      // Using only common subjects (commonSubjects)
      const commonSubjects = response.data?.commonSubjects || [];
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
      setError('Error loading available subjects');
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
      const response = await fetchAvailableTimeSlots(teacherId, studentId);
      
      // Transform data from API response to AvailableTimeSlot structure
      const timeSlots: AvailableTimeSlot[] = [];
      
      // Convert student preferences to available slots
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
      
      // Add available slots from API response
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
  
  // Function for creating regular class session
  const createClassSession = useCallback(async (notes?: string): Promise<boolean> => {
    if (!teacherId || !studentId || !selectedSubject || !selectedDay || 
        !selectedStartTime || !selectedEndTime || !selectedBooth || !selectedClassType) {
      setError('すべての必須フィールドを入力してください');
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
        boothId: selectedBooth,
        studentIds: [studentId],
        classTypeId: selectedClassType,
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
    selectedClassType, selectedStartDate, selectedEndDate
  ]);
  
  // Handler for changing the selected day
  const handleDayChange = useCallback((day: string) => {
    setSelectedDay(day);
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedBooth('');
  }, []);
  
  // Start time change handler
  const handleStartTimeChange = useCallback((time: string) => {
    setSelectedStartTime(time);
    setSelectedBooth('');
  }, []);
  
  // Duration change handler
  const handleDurationChange = useCallback((duration: string) => {
    setSelectedDuration(duration);
    if (selectedStartTime) {
      updateEndTime(selectedStartTime, duration);
    }
    setSelectedBooth('');
  }, [selectedStartTime, updateEndTime]);
  
  // Set default start date
  useEffect(() => {
    if (!selectedStartDate) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setSelectedStartDate(formattedDate);
    }
  }, [selectedStartDate]);
  
  // Effect for loading data when opening modal window
  useEffect(() => {
    loadClassTypes();
    
    if (teacherId && studentId) {
      loadCompatibleSubjects();
      loadAvailableTimeSlots();
    }
  }, [teacherId, studentId, loadCompatibleSubjects, loadAvailableTimeSlots, loadClassTypes]);
  
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
    classTypes,
    
    // Selected values
    selectedSubject,
    selectedDay,
    selectedStartTime,
    selectedEndTime,
    selectedDuration,
    selectedBooth,
    selectedClassType,
    selectedStartDate,
    selectedEndDate,
    
    // Setters for selected values
    setSelectedSubject,
    setSelectedDay: handleDayChange,
    setSelectedStartTime: handleStartTimeChange,
    setSelectedDuration: handleDurationChange,
    setSelectedBooth,
    setSelectedClassType,
    setSelectedStartDate,
    setSelectedEndDate,
    
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
    handleTimeStep,
    createClassSession,
    getMinMaxDates
  };
}