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
  position: "left" | "right";
}

export const StudentScheduleArrows: React.FC<Props> = ({
  setCurrentDate,
  viewType,
  position,
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

  if (position === "left") {
    return (
      <ChevronLeft
        className="dark:hover:bg-gray-700 hover:bg-gray-200 rounded-md p-[3px] cursor-pointer duration-100"
        size={25}
        onClick={() => changeDate("back")}
      />
    );
  }

  return (
    <ChevronRight
      className="dark:hover:bg-gray-700 hover:bg-gray-200 rounded-md p-[3px] cursor-pointer duration-100"
      size={25}
      onClick={() => changeDate("forward")}
    />
  );
};
