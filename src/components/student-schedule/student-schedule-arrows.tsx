import {
  addDays,
  addMonths,
  addWeeks,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
interface Props {
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  viewType: "DAY" | "WEEK" | "MONTH";
}
export const StudentScheduleArrows: React.FC<Props> = ({
  setCurrentDate,
  viewType,
}) => {
  const changeDate = (direction: "forward" | "back") => {
    setCurrentDate((prev) => {
      switch (viewType) {
        case "DAY":
          return direction === "forward" ? addDays(prev, 1) : subDays(prev, 1);
        case "WEEK":
          return direction === "forward"
            ? addWeeks(prev, 1)
            : subWeeks(prev, 1);
        case "MONTH":
          return direction === "forward"
            ? addMonths(prev, 1)
            : subMonths(prev, 1);
        default:
          return prev;
      }
    });
  };
  return (
    <div className="flex items-center justify-center gap-[2px]">
      <ChevronLeft
        className="dark:hover:bg-[#1C1C1C] hover:bg-gray-100 rounded-full p-[3px] cursor-pointer duration-100"
        size={25}
        onClick={() => changeDate("back")}
      />
      <ChevronRight
        className="dark:hover:bg-[#1C1C1C] hover:bg-gray-100 rounded-full p-[3px] cursor-pointer duration-100"
        size={25}
        onClick={() => changeDate("forward")}
      />
    </div>
  );
};
