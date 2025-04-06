import CalendarSchedule from "@/components/client/calendar/calendar-schedule";

export default function TeacherSchedulePage() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">今週のスケジュール</h2>
      <CalendarSchedule />
    </div>
  );
}
