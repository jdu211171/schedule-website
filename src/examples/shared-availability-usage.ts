// Example: How to integrate shared availability into class session creation

import { findSharedAvailability } from "@/lib/shared-availability";
import { prisma } from "@/lib/prisma";

// Enhanced class session creation with shared availability check
export async function createClassSessionWithSharedAvailability(
  teacherId: string,
  studentId: string,
  date: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  endTime: string, // HH:MM
  // ... other parameters
) {
  // Get teacher and student user IDs
  const teacher = await prisma.teacher.findUnique({
    where: { teacherId },
    select: { userId: true, name: true }
  });

  const student = await prisma.student.findUnique({
    where: { studentId },
    select: { userId: true, name: true }
  });

  if (!teacher || !student) {
    throw new Error("Teacher or student not found");
  }

  // Find shared availability for the date
  const dateObj = new Date(date + "T00:00:00.000Z");
  const sharedAvailability = await findSharedAvailability(
    teacher.userId,
    student.userId,
    dateObj
  );

  if (!sharedAvailability.available) {
    return {
      success: false,
      error: "No shared availability found",
      message: sharedAvailability.message,
      suggestedAction: "Try a different date or check individual availability"
    };
  }

  // Check if requested time falls within shared availability
  const requestedStartMinutes = timeToMinutes(startTime);
  const requestedEndMinutes = timeToMinutes(endTime);

  const isTimeWithinSharedSlots = sharedAvailability.sharedSlots.some(slot => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return requestedStartMinutes >= slotStart && requestedEndMinutes <= slotEnd;
  });

  if (!isTimeWithinSharedSlots) {
    return {
      success: false,
      error: "Requested time is not within shared availability",
      sharedSlots: sharedAvailability.sharedSlots,
      message: `The requested time ${startTime}-${endTime} is not available for both users. Please choose from the available shared time slots.`,
      strategy: sharedAvailability.strategy
    };
  }

  // Proceed with class session creation
  // ... existing class session creation logic

  return {
    success: true,
    message: "Class session created successfully",
    sharedAvailabilityUsed: sharedAvailability.strategy
  };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Usage example in API route:
/*
const result = await createClassSessionWithSharedAvailability(
  "teacher123",
  "student456",
  "2025-06-20",
  "10:00",
  "11:00"
);

if (!result.success) {
  return NextResponse.json({
    error: result.error,
    message: result.message,
    sharedSlots: result.sharedSlots, // Available time slots user can choose from
    strategy: result.strategy
  }, { status: 400 });
}
*/
