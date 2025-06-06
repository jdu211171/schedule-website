// src/app/api/teachers/[teacherId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teacherUpdateSchema } from "@/schemas/teacher.schema";
import { Teacher, DayOfWeek } from "@prisma/client";

// Define a type for the teacher with includes
type TeacherWithIncludes = Teacher & {
  user: {
    username: string | null;
    email: string | null;
    passwordHash: string | null;
    branches?: {
      branch: {
        branchId: string;
        name: string;
      };
    }[];
    subjectPreferences?: {
      subjectId: string;
      subjectTypeId: string;
      subject: {
        subjectId: string;
        name: string;
      };
      subjectType: {
        subjectTypeId: string;
        name: string;
      };
    }[];
    availability?: {
      id: string;
      dayOfWeek: string | null;
      type: string;
      status: string;
      fullDay: boolean | null;
      startTime: Date | null;
      endTime: Date | null;
      date: Date | null;
      reason: string | null;
      notes: string | null;
    }[];
  };
};

// Define the return type for the formatted teacher
type FormattedTeacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
  notes: string | null;
  status: string;
  username: string | null;
  password: string | null;
  branches: {
    branchId: string;
    name: string;
  }[];
  subjectPreferences: {
    subjectId: string;
    subjectTypeIds: string[];
  }[];
  regularAvailability: {
    dayOfWeek: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
  }[];
  exceptionalAvailability: {
    date: string;
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
    }[];
    fullDay: boolean;
    reason?: string | null;
    notes?: string | null;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to format teacher response with proper typing
const formatTeacher = (teacher: TeacherWithIncludes): FormattedTeacher => {
  // Group subject preferences by subjectId
  const subjectPreferencesMap = new Map<string, string[]>();

  teacher.user.subjectPreferences?.forEach((pref) => {
    if (!subjectPreferencesMap.has(pref.subjectId)) {
      subjectPreferencesMap.set(pref.subjectId, []);
    }
    subjectPreferencesMap.get(pref.subjectId)!.push(pref.subjectTypeId);
  });

  const subjectPreferences = Array.from(subjectPreferencesMap.entries()).map(
    ([subjectId, subjectTypeIds]) => ({
      subjectId,
      subjectTypeIds,
    })
  );

  // Process regular availability data
  const availabilityMap = new Map<
    string,
    NonNullable<typeof teacher.user.availability>
  >();

  teacher.user.availability?.forEach((avail) => {
    if (
      avail.type === "REGULAR" &&
      avail.status === "APPROVED" &&
      avail.dayOfWeek
    ) {
      if (!availabilityMap.has(avail.dayOfWeek)) {
        availabilityMap.set(avail.dayOfWeek, []);
      }
      availabilityMap.get(avail.dayOfWeek)!.push(avail);
    }
  });

  const regularAvailability = Array.from(availabilityMap.entries()).map(
    ([dayOfWeek, availabilities]) => {
      // Check if any availability for this day is full day
      const hasFullDay =
        availabilities?.some((avail) => avail.fullDay) || false;

      if (hasFullDay) {
        return {
          dayOfWeek,
          timeSlots: [],
          fullDay: true,
        };
      }

      // Process time slots
      const timeSlots =
        availabilities
          ?.filter(
            (avail) => !avail.fullDay && avail.startTime && avail.endTime
          )
          .map((avail) => ({
            id: avail.id,
            startTime: `${String(avail.startTime!.getUTCHours()).padStart(
              2,
              "0"
            )}:${String(avail.startTime!.getUTCMinutes()).padStart(2, "0")}`,
            endTime: `${String(avail.endTime!.getUTCHours()).padStart(
              2,
              "0"
            )}:${String(avail.endTime!.getUTCMinutes()).padStart(2, "0")}`,
          })) || [];

      return {
        dayOfWeek,
        timeSlots,
        fullDay: false,
      };
    }
  );

  // Process exceptional availability data - filter out past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  const exceptionalAvailability: FormattedTeacher['exceptionalAvailability'] = [];

  teacher.user.availability?.forEach((avail) => {
    if (
      avail.type === "EXCEPTION" &&
      avail.status === "APPROVED" &&
      avail.date
    ) {
      // Skip past dates
      const availDate = new Date(avail.date);
      availDate.setHours(0, 0, 0, 0);
      if (availDate < today) {
        return; // Skip this entry
      }

      const dateStr = avail.date.toISOString().split('T')[0];

      // Check if we already have an entry for this date
      let dateEntry = exceptionalAvailability.find(ea => ea.date === dateStr);

      if (!dateEntry) {
        dateEntry = {
          date: dateStr,
          timeSlots: [],
          fullDay: false,
          reason: avail.reason,
          notes: avail.notes
        };
        exceptionalAvailability.push(dateEntry);
      }

      if (avail.fullDay) {
        dateEntry.fullDay = true;
        dateEntry.timeSlots = [];
      } else if (avail.startTime && avail.endTime && !dateEntry.fullDay) {
        dateEntry.timeSlots.push({
          id: avail.id,
          startTime: `${String(avail.startTime.getUTCHours()).padStart(2, "0")}:${String(avail.startTime.getUTCMinutes()).padStart(2, "0")}`,
          endTime: `${String(avail.endTime.getUTCHours()).padStart(2, "0")}:${String(avail.endTime.getUTCMinutes()).padStart(2, "0")}`
        });
      }
    }
  });

  return {
    teacherId: teacher.teacherId,
    userId: teacher.userId,
    name: teacher.name,
    kanaName: teacher.kanaName,
    email: teacher.email,
    lineId: teacher.lineId,
    notes: teacher.notes,
    status: teacher.status,
    username: teacher.user.username,
    password: teacher.user.passwordHash,
    branches:
      teacher.user.branches?.map((ub) => ({
        branchId: ub.branch.branchId,
        name: ub.branch.name,
      })) || [],
    subjectPreferences,
    regularAvailability,
    exceptionalAvailability,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
};

// GET a specific teacher
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    const teacherId = request.url.split("/").pop();

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { teacherId },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            passwordHash: true,
            branches: {
              include: {
                branch: {
                  select: {
                    branchId: true,
                    name: true,
                  },
                },
              },
            },
            subjectPreferences: {
              select: {
                subjectId: true,
                subjectTypeId: true,
                subject: {
                  select: {
                    subjectId: true,
                    name: true,
                  },
                },
                subjectType: {
                  select: {
                    subjectTypeId: true,
                    name: true,
                  },
                },
              },
            },
            availability: {
              select: {
                id: true,
                dayOfWeek: true,
                type: true,
                status: true,
                fullDay: true,
                startTime: true,
                endTime: true,
                date: true,
                reason: true,
                notes: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Format response using the helper function
    const formattedTeacher = formatTeacher(teacher);

    return NextResponse.json({
      data: [formattedTeacher],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  }
);

// PATCH - Update a teacher
export const PATCH = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    try {
      const teacherId = request.url.split("/").pop();
      if (!teacherId) {
        return NextResponse.json(
          { error: "Teacher ID is required" },
          { status: 400 }
        );
      }

      const body = await request.json();

      // Validate request body
      const result = teacherUpdateSchema.safeParse({ ...body, teacherId });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      // Check if teacher exists
      const existingTeacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: { user: true },
      });

      if (!existingTeacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }

      const {
        username,
        password,
        email,
        branchIds,
        subjectPreferences,
        regularAvailability = [],
        exceptionalAvailability = [],
        ...teacherData
      } = result.data;

      // Check username uniqueness if being updated
      if (username && username !== existingTeacher.user.username) {
        const userExists = await prisma.user.findFirst({
          where: { username, id: { not: existingTeacher.userId } },
        });

        if (userExists) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
      }

      // Check email uniqueness if being updated
      if (email && email !== existingTeacher.user.email) {
        const emailExists = await prisma.user.findFirst({
          where: { email, id: { not: existingTeacher.userId } },
        });

        if (emailExists) {
          return NextResponse.json(
            { error: "Email already in use" },
            { status: 409 }
          );
        }
      }

      // Verify that all branchIds exist if provided
      if (branchIds && branchIds.length > 0) {
        const branchCount = await prisma.branch.count({
          where: { branchId: { in: branchIds } },
        });

        if (branchCount !== branchIds.length) {
          return NextResponse.json(
            { error: "一部の校舎IDが存在しません" }, // "Some branch IDs do not exist"
            { status: 400 }
          );
        }
      }

      // Validate subject preferences if provided
      if (subjectPreferences && subjectPreferences.length > 0) {
        // Check if all subjects exist
        const subjectIds = subjectPreferences.map((pref) => pref.subjectId);
        const subjectCount = await prisma.subject.count({
          where: { subjectId: { in: subjectIds } },
        });

        if (subjectCount !== subjectIds.length) {
          return NextResponse.json(
            { error: "一部の科目IDが存在しません" },
            { status: 400 }
          );
        }

        // Check if all subject types exist
        const subjectTypeIds = subjectPreferences.flatMap(
          (pref) => pref.subjectTypeIds
        );
        const uniqueSubjectTypeIds = [...new Set(subjectTypeIds)];
        const subjectTypeCount = await prisma.subjectType.count({
          where: { subjectTypeId: { in: uniqueSubjectTypeIds } },
        });

        if (subjectTypeCount !== uniqueSubjectTypeIds.length) {
          return NextResponse.json(
            { error: "一部の科目タイプIDが存在しません" },
            { status: 400 }
          );
        }
      }

      // Update user, teacher and branch associations in a transaction
      const updatedTeacher = await prisma.$transaction(async (tx) => {
        // Update user first if needed
        if (username || password || email) {
          await tx.user.update({
            where: { id: existingTeacher.userId },
            data: {
              username,
              passwordHash: password || undefined,
              email,
            },
          });
        }

        // Update teacher record - include email field in teacher data if provided
        await tx.teacher.update({
          where: { teacherId },
          data: {
            ...teacherData,
            ...(email && { email }), // Only add email field if it's provided
          },
        });

        // Update branch associations if provided
        if (branchIds !== undefined) {
          // Delete existing branch associations
          await tx.userBranch.deleteMany({
            where: { userId: existingTeacher.userId },
          });

          // Create new branch associations
          if (branchIds.length > 0) {
            await tx.userBranch.createMany({
              data: branchIds.map((branchId) => ({
                userId: existingTeacher.userId,
                branchId,
              })),
            });
          }
        }

        // Update user subject preferences if provided
        if (subjectPreferences !== undefined) {
          // Delete existing subject preferences
          await tx.userSubjectPreference.deleteMany({
            where: { userId: existingTeacher.userId },
          });

          // Create new subject preferences
          if (subjectPreferences.length > 0) {
            const userSubjectPreferencesData = subjectPreferences.flatMap(
              (pref) =>
                pref.subjectTypeIds.map((subjectTypeId) => ({
                  userId: existingTeacher.userId,
                  subjectId: pref.subjectId,
                  subjectTypeId,
                }))
            );

            await tx.userSubjectPreference.createMany({
              data: userSubjectPreferencesData,
            });
          }
        }

        // Update regular availability if provided
        if (regularAvailability.length > 0) {
          // Delete existing regular availability records for this user
          await tx.userAvailability.deleteMany({
            where: {
              userId: existingTeacher.userId,
              type: "REGULAR",
            },
          });

          const availabilityRecords = [];

          for (const dayAvailability of regularAvailability) {
            const { dayOfWeek, timeSlots, fullDay } = dayAvailability;

            if (fullDay) {
              // Create a full-day availability record
              availabilityRecords.push({
                userId: existingTeacher.userId,
                dayOfWeek: dayOfWeek as DayOfWeek,
                type: "REGULAR" as const,
                status: "APPROVED" as const,
                fullDay: true,
                startTime: null,
                endTime: null,
                date: null,
                reason: null,
                notes: null,
              });
            } else if (timeSlots && timeSlots.length > 0) {
              // Create availability records for each time slot
              for (const slot of timeSlots) {
                // Create time from string using epoch date for consistency
                const [startHours, startMinutes] = slot.startTime
                  .split(":")
                  .map(Number);
                const [endHours, endMinutes] = slot.endTime
                  .split(":")
                  .map(Number);

                availabilityRecords.push({
                  userId: existingTeacher.userId,
                  dayOfWeek: dayOfWeek as DayOfWeek,
                  type: "REGULAR" as const,
                  status: "APPROVED" as const,
                  fullDay: false,
                  startTime: new Date(
                    Date.UTC(2000, 0, 1, startHours, startMinutes, 0, 0)
                  ),
                  endTime: new Date(
                    Date.UTC(2000, 0, 1, endHours, endMinutes, 0, 0)
                  ),
                  date: null,
                  reason: null,
                  notes: null,
                });
              }
            }
          }

          if (availabilityRecords.length > 0) {
            await tx.userAvailability.createMany({
              data: availabilityRecords,
            });
          }
        }

        // Update exceptional availability if provided or if empty array (to clear all)
        if (exceptionalAvailability !== undefined) {
          // Always delete existing exceptional availability records when exceptionalAvailability is provided
          await tx.userAvailability.deleteMany({
            where: {
              userId: existingTeacher.userId,
              type: "EXCEPTION",
            },
          });

          // Only create new records if there are any
          if (exceptionalAvailability.length > 0) {
            const exceptionalRecords = [];

            for (const exceptionalItem of exceptionalAvailability) {
              const { date, fullDay, startTime, endTime, reason, notes } = exceptionalItem;

              // Create UTC date from the date input
              const createUTCDate = (dateInput: Date): Date => {
                const year = dateInput.getFullYear();
                const month = dateInput.getMonth();
                const day = dateInput.getDate();
                return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
              };

              const dateUTC = createUTCDate(date);

              if (fullDay) {
                // Create a full-day exceptional availability record
                exceptionalRecords.push({
                  userId: existingTeacher.userId,
                  dayOfWeek: null,
                  type: "EXCEPTION" as const,
                  status: "APPROVED" as const,
                  fullDay: true,
                  startTime: null,
                  endTime: null,
                  date: dateUTC,
                  reason: reason || null,
                  notes: notes || null,
                });
              } else if (startTime && endTime) {
                // Create time-specific exceptional availability record
                const [startHours, startMinutes] = startTime.split(":").map(Number);
                const [endHours, endMinutes] = endTime.split(":").map(Number);

                exceptionalRecords.push({
                  userId: existingTeacher.userId,
                  dayOfWeek: null,
                  type: "EXCEPTION" as const,
                  status: "APPROVED" as const,
                  fullDay: false,
                  startTime: new Date(
                    Date.UTC(2000, 0, 1, startHours, startMinutes, 0, 0)
                  ),
                  endTime: new Date(
                    Date.UTC(2000, 0, 1, endHours, endMinutes, 0, 0)
                  ),
                  date: dateUTC,
                  reason: reason || null,
                  notes: notes || null,
                });
              }
            }

            if (exceptionalRecords.length > 0) {
              await tx.userAvailability.createMany({
                data: exceptionalRecords,
              });
            }
          }
        }

        // Return updated teacher with user and branch associations
        return tx.teacher.findUnique({
          where: { teacherId },
          include: {
            user: {
              select: {
                username: true,
                email: true,
                passwordHash: true,
                branches: {
                  include: {
                    branch: {
                      select: {
                        branchId: true,
                        name: true,
                      },
                    },
                  },
                },
                subjectPreferences: {
                  select: {
                    subjectId: true,
                    subjectTypeId: true,
                    subject: {
                      select: {
                        subjectId: true,
                        name: true,
                      },
                    },
                    subjectType: {
                      select: {
                        subjectTypeId: true,
                        name: true,
                      },
                    },
                  },
                },
                availability: {
                  select: {
                    id: true,
                    dayOfWeek: true,
                    type: true,
                    status: true,
                    fullDay: true,
                    startTime: true,
                    endTime: true,
                    date: true,
                    reason: true,
                    notes: true,
                  },
                },
              },
            },
          },
        });
      });

      if (!updatedTeacher) {
        throw new Error("Failed to update teacher");
      }

      // Format response using the helper function
      const formattedTeacher = formatTeacher(updatedTeacher);

      return NextResponse.json({
        data: [formattedTeacher],
        pagination: {
          total: 1,
          page: 1,
          limit: 1,
          pages: 1,
        },
      });
    } catch (error) {
      console.error("Error updating teacher:", error);
      return NextResponse.json(
        { error: "Failed to update teacher" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete a teacher
export const DELETE = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest) => {
    const teacherId = request.url.split("/").pop();

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    try {
      // Check if teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
        include: { user: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: "Teacher not found" },
          { status: 404 }
        );
      }

      // Delete teacher, user and branch associations in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete user availability first
        await tx.userAvailability.deleteMany({
          where: { userId: teacher.userId },
        });

        // Delete subject preferences
        await tx.userSubjectPreference.deleteMany({
          where: { userId: teacher.userId },
        });

        // Delete branch associations
        await tx.userBranch.deleteMany({
          where: { userId: teacher.userId },
        });

        // Delete teacher
        await tx.teacher.delete({ where: { teacherId } });

        // Delete associated user
        await tx.user.delete({ where: { id: teacher.userId } });
      });

      return NextResponse.json(
        {
          data: [],
          pagination: {
            total: 0,
            page: 0,
            limit: 0,
            pages: 0,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting teacher:", error);
      return NextResponse.json(
        { error: "Failed to delete teacher" },
        { status: 500 }
      );
    }
  }
);
