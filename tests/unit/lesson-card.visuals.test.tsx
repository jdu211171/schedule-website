/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { LessonCard } from "@/components/admin-schedule/DayCalendar/lesson-card";

const timeSlots = [
  { index: 0, start: "09:00", end: "09:30", display: "", shortDisplay: "" },
  { index: 1, start: "09:30", end: "10:00", display: "", shortDisplay: "" },
];

describe("LessonCard visuals depend on overlap flags, not isCancelled", () => {
  const baseLesson: any = {
    classId: "X1",
    boothId: "B1",
    startTime: "09:00",
    endTime: "09:30",
    date: "2025-01-01",
    isCancelled: false,
    teacherId: "T1",
    studentId: "S1",
  };
  const booths = [{ boothId: "B1", name: "Booth 1" }];

  it("does not set conflict when only isCancelled=true and no overlaps", () => {
    const { container } = render(
      <LessonCard
        lesson={{ ...baseLesson, isCancelled: true }}
        booths={booths as any}
        onClick={() => {}}
        timeSlotHeight={40}
        timeSlots={timeSlots}
        laneIndex={0}
        laneHeight={40}
        rowTopOffset={0}
        hasBoothOverlap={false}
        hasTeacherOverlap={false}
        hasStudentOverlap={false}
        cellWidth={40}
      />
    );
    const card = container.querySelector("[data-conflict]");
    expect(card).toBeTruthy();
    expect(card!.getAttribute("data-conflict")).toBe("false");
  });

  it("sets conflict when overlap flags are true (isCancelled=false)", () => {
    const { container } = render(
      <LessonCard
        lesson={{ ...baseLesson, isCancelled: false }}
        booths={booths as any}
        onClick={() => {}}
        timeSlotHeight={40}
        timeSlots={timeSlots}
        laneIndex={0}
        laneHeight={40}
        rowTopOffset={0}
        hasBoothOverlap={true}
        hasTeacherOverlap={false}
        hasStudentOverlap={false}
        cellWidth={40}
      />
    );
    const card = container.querySelector("[data-conflict]");
    expect(card).toBeTruthy();
    expect(card!.getAttribute("data-conflict")).toBe("true");
  });
});
