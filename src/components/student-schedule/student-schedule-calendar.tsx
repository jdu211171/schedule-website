"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as React from "react";
interface Props {
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  currentDate: Date;
}
export const StudentScheduleCalendar: React.FC<Props> = ({
  currentDate,
  setCurrentDate,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
      setIsVisible(false);
    }
  };

  const formattedDate = `${currentDate.getDate()} ${currentDate.toLocaleString(
    "en-US",
    {
      month: "short",
    }
  )}, ${currentDate.getFullYear()}`;

  return (
    <Popover open={isVisible} onOpenChange={setIsVisible}>
      <PopoverTrigger asChild>
        <Button variant="outline" onClick={() => setIsVisible(!isVisible)}>
          {formattedDate} ▾
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={handleDateSelect}
          className="rounded-md border shadow"
        />
      </PopoverContent>
    </Popover>
  );
};
