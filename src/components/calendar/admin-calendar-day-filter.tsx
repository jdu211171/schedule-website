'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { ja } from 'date-fns/locale';
import { format } from 'date-fns';

// Тип для комнаты
type Room = {
  id: string;
  name: string;
};

type CalendarFiltersProps = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  rooms: Room[];
  selectedRooms: string[];
  onRoomsChange: (rooms: string[]) => void;
  onClose: () => void;
  onApplyFilters: () => void;
};

export default function CalendarFilters({
  selectedDate,
  onDateChange,
  rooms,
  selectedRooms,
  onRoomsChange,
  onClose,
  onApplyFilters
}: CalendarFiltersProps) {
  // Локальное состояние для поиска
  const [searchTerm, setSearchTerm] = useState('');
  // Состояние для отображения календаря
  const [showCalendar, setShowCalendar] = useState(false);

  // Фильтрация комнат по поисковому запросу
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    room.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчик изменения выбора комнаты
  const toggleRoomSelection = (roomId: string) => {
    if (selectedRooms.includes(roomId)) {
      onRoomsChange(selectedRooms.filter(id => id !== roomId));
    } else {
      onRoomsChange([...selectedRooms, roomId]);
    }
  };

  // Форматирование даты для отображения
  const formatDate = (date: Date) => {
    return format(date, 'yyyy/MM/dd');
  };

  // Обработчик изменения даты
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setShowCalendar(false);
    }
  };

  return (
    <div className="absolute top-16 right-0 z-50">
      <Card className="p-4 w-80 flex flex-col space-y-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">フィルター</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">日付</h4>
          <Button 
            variant="outline" 
            className="w-full justify-between text-left font-normal"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            {formatDate(selectedDate)}
          </Button>
          
          {showCalendar && (
            <div className="mt-2 border rounded-md bg-background">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && handleDateChange(date)}
                locale={ja}
                weekStartsOn={0}
                showOutsideDays={true}
                disabled={(date) => {
                  // Пример: отключаем даты более 365 дней в прошлом или будущем
                  const now = new Date();
                  const tooEarly = new Date(now);
                  tooEarly.setDate(now.getDate() - 365);
                  const tooLate = new Date(now);
                  tooLate.setDate(now.getDate() + 365);
                  return date < tooEarly || date > tooLate;
                }}
              />
            </div>
          )}
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">教室</h4>
          <div className="grid grid-cols-3 gap-2">
            {filteredRooms.map((room) => (
              <Button
                key={room.id}
                variant={selectedRooms.includes(room.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleRoomSelection(room.id)}
                className="text-xs h-8"
              >
                {room.name || room.id}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">検索</h4>
          <Input
            type="text" 
            placeholder="検索..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Button onClick={onApplyFilters} className="w-full">フィルターを適用する</Button>
      </Card>
    </div>
  );
}