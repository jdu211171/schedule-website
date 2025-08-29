// src/app/api/teachers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  teacherCreateSchema,
  teacherFilterSchema,
} from "@/schemas/teacher.schema";
import { Teacher, DayOfWeek } from "@prisma/client";

type TeacherWithIncludes = Teacher & {
  contactPhones?: {
    id: string;
    phoneType: string;
    phoneNumber: string;
    notes: string | null;
    order: number;
  }[];
  user: {
    username: string | null;
    email: string | null;
    passwordHash?: string | null;
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
      startTime: Date | null;
      endTime: Date | null;
      fullDay: boolean | null;
      type: string;
      status: string;
      date: Date | null;
      reason: string | null;
      notes: string | null;
    }[];
  };
};

type FormattedTeacher = {
  teacherId: string;
  userId: string;
  name: string;
  kanaName: string | null;
  email: string | null;
  lineId: string | null;
  lineUserId: string | null;
  lineNotificationsEnabled: boolean | null;
  notes: string | null;
  status: string;
  birthDate: Date | null;
  phoneNumber: string | null;
  phoneNotes: string | null;
  username: string | null;
  password: string | null;
  contactPhones?: {
    id: string;
    phoneType: string;
    phoneNumber: string;
    notes: string | null;
    order: number;
  }[];
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
            startTime: avail.startTime
              ? `${String(avail.startTime.getUTCHours()).padStart(
                  2,
                  "0"
                )}:${String(avail.startTime.getUTCMinutes()).padStart(2, "0")}`
              : "",
            endTime: avail.endTime
              ? `${String(avail.endTime.getUTCHours()).padStart(
                  2,
                  "0"
                )}:${String(avail.endTime.getUTCMinutes()).padStart(2, "0")}`
              : "",
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
    lineUserId: teacher.lineUserId,
    lineNotificationsEnabled: teacher.lineNotificationsEnabled,
    notes: teacher.notes,
    status: teacher.status,
    birthDate: teacher.birthDate,
    phoneNumber: teacher.phoneNumber,
    phoneNotes: teacher.phoneNotes,
    username: teacher.user.username,
    password: teacher.user.passwordHash || null,
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
    contactPhones: teacher.contactPhones?.sort((a, b) => a.order - b.order) || [],
  };
};

// GET - List teachers with pagination and filters
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    // Parse query parameters
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate and parse filter parameters
    const result = teacherFilterSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json(
        { error: "フィルターパラメータが無効です" }, // "Invalid filter parameters"
        { status: 400 }
      );
    }

    const { page, limit, name, status, birthDateFrom, birthDateTo } = result.data;

    // Build filter conditions
    const where: Record<string, unknown> = {};

    if (name) {
      // Search teacher by own name/kana
      where.OR = [
        { name: { contains: name, mode: "insensitive" } },
        { kanaName: { contains: name, mode: "insensitive" } },
      ];
    }

    // No student-linked search here; teacher name search remains consistent with students table

    if (status) {
      where.status = status;
    }

    // Add birthDate filter
    if (birthDateFrom || birthDateTo) {
      const dateFilter: any = {};
      if (birthDateFrom) {
        dateFilter.gte = new Date(birthDateFrom);
      }
      if (birthDateTo) {
        dateFilter.lte = new Date(birthDateTo);
      }
      where.birthDate = dateFilter;
    }

    // Filter teachers by branch for non-admin users
    if (session.user?.role !== "ADMIN") {
      where.user = {
        branches: {
          some: {
            branchId,
          },
        },
      };
    } else if (branchId) {
      // If admin has selected a specific branch, filter by that branch
      where.user = {
        branches: {
          some: {
            branchId,
          },
        },
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch total count
    const total = await prisma.teacher.count({ where });

    // Fetch teachers with branch associations
    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        contactPhones: {
          select: {
            id: true,
            phoneType: true,
            phoneNumber: true,
            notes: true,
            order: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
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
                startTime: true,
                endTime: true,
                fullDay: true,
                type: true,
                status: true,
                date: true,
                reason: true,
                notes: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    });

    // Format teachers using the helper function
    const formattedTeachers = teachers.map(formatTeacher);

    return NextResponse.json({
      data: formattedTeachers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// POST - Create a new teacher
export const POST = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    try {
      const body = await request.json();

      // Validate request body
      const result = teacherCreateSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "入力データが無効です" }, // "Invalid input data"
          { status: 400 }
        );
      }

      const {
        username,
        password,
        email,
        branchIds = [],
        subjectPreferences = [],
        regularAvailability = [],
        exceptionalAvailability = [],
        contactPhones = [],
        ...teacherData
      } = result.data;

      // Check if username already exists
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email: email || undefined }] },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            error:
              email && existingUser.email === email
                ? "メールアドレスは既に使用されています" // "Email already in use"
                : "ユーザー名は既に使用されています", // "Username already taken"
          },
          { status: 409 }
        );
      }

      // For non-admin users, we'll ensure the teacher is associated with the selected branch
      const finalBranchIds = [...branchIds];
      if (!finalBranchIds.includes(branchId)) {
        finalBranchIds.push(branchId);
      }

      // Admins can assign teachers to any branch, but staff must include their selected branch
      if (session.user?.role !== "ADMIN") {
        // Staff can only assign teachers to branches they have access to
        const userBranches =
          session.user?.branches?.map((b) => b.branchId) || [];

        // Verify staff has access to all requested branches
        const unauthorizedBranches = finalBranchIds.filter(
          (id) => !userBranches.includes(id)
        );

        if (unauthorizedBranches.length > 0) {
          return NextResponse.json(
            {
              error:
                "You don't have access to assign teachers to some of these branches",
            },
            { status: 403 }
          );
        }
      }

      // Verify that all branchIds exist
      if (finalBranchIds.length > 0) {
        const branchCount = await prisma.branch.count({
          where: { branchId: { in: finalBranchIds } },
        });

        if (branchCount !== finalBranchIds.length) {
          return NextResponse.json(
            { error: "一部の校舎IDが存在しません" }, // "Some branch IDs do not exist"
            { status: 400 }
          );
        }
      }

      // Validate subject preferences if provided
      if (subjectPreferences.length > 0) {
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

      // For teachers, use the password directly (no hashing)
      const passwordHash = password;

      // Clean up optional fields - convert empty strings to null
      const cleanedTeacherData = {
        ...teacherData,
        lineUserId: teacherData.lineUserId || null,
        kanaName: teacherData.kanaName || null,
        notes: teacherData.notes || null,
        phoneNumber: teacherData.phoneNumber || null,
        phoneNotes: teacherData.phoneNotes || null,
      };

      // Create user, teacher and all related data in a transaction
      const newTeacher = await prisma.$transaction(async (tx) => {
        // Create user first
        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            email: email || null,
            role: "TEACHER",
          },
        });

        // Create teacher record
        const teacher = await tx.teacher.create({
          data: {
            ...cleanedTeacherData,
            email: email || null,
            userId: user.id,
          },
        });

        // Create contact phones if provided
        if (contactPhones.length > 0) {
          await tx.teacherContactPhone.createMany({
            data: contactPhones.map((phone, index) => ({
              teacherId: teacher.teacherId,
              phoneType: phone.phoneType,
              phoneNumber: phone.phoneNumber,
              notes: phone.notes || null,
              order: phone.order ?? index,
            })),
          });
        }

        // Create branch associations
        if (finalBranchIds.length > 0) {
          await tx.userBranch.createMany({
            data: finalBranchIds.map((branchId) => ({
              userId: user.id,
              branchId,
            })),
          });
        }

        // Create user subject preferences if provided
        if (subjectPreferences.length > 0) {
          const userSubjectPreferencesData = subjectPreferences.flatMap(
            (pref) =>
              pref.subjectTypeIds.map((subjectTypeId) => ({
                userId: user.id,
                subjectId: pref.subjectId,
                subjectTypeId,
              }))
          );

          await tx.userSubjectPreference.createMany({
            data: userSubjectPreferencesData,
          });
        }

        // Create regular availability records if provided
        if (regularAvailability !== undefined && regularAvailability.length > 0) {
          const availabilityRecords = [];

          for (const dayAvailability of regularAvailability) {
            const { dayOfWeek, timeSlots, fullDay } = dayAvailability;

            if (fullDay) {
              // Create a full-day availability record
              availabilityRecords.push({
                userId: user.id,
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
                  userId: user.id,
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

        // Create exceptional availability records if provided
        if (exceptionalAvailability.length > 0) {
          const exceptionalRecords = [];

          for (const exceptionalItem of exceptionalAvailability) {
            const { date, fullDay, startTime, endTime, reason, notes } = exceptionalItem;

            if (fullDay) {
              // Create a full-day exceptional availability record
              exceptionalRecords.push({
                userId: user.id,
                dayOfWeek: null,
                type: "EXCEPTION" as const,
                status: "APPROVED" as const,
                fullDay: true,
                startTime: null,
                endTime: null,
                date: date,
                reason: reason || null,
                notes: notes || null,
              });
            } else if (startTime && endTime) {
              // Create time-specific exceptional availability record
              const [startHours, startMinutes] = startTime.split(":").map(Number);
              const [endHours, endMinutes] = endTime.split(":").map(Number);

              exceptionalRecords.push({
                userId: user.id,
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
                date: date,
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

        // Return teacher with all associations
        return tx.teacher.findUnique({
          where: { teacherId: teacher.teacherId },
          include: {
            contactPhones: {
              select: {
                id: true,
                phoneType: true,
                phoneNumber: true,
                notes: true,
                order: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
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
                    startTime: true,
                    endTime: true,
                    fullDay: true,
                    type: true,
                    status: true,
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

      if (!newTeacher) {
        throw new Error("Failed to create teacher");
      }

      // Use the formatTeacher helper function
      const formattedTeacher = formatTeacher(newTeacher);

      return NextResponse.json(
        {
          data: [formattedTeacher],
          pagination: {
            total: 1,
            page: 1,
            limit: 1,
            pages: 1,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating teacher:", error);
      return NextResponse.json(
        { error: "講師の作成に失敗しました" }, // "Failed to create teacher"
        { status: 500 }
      );
    }
  }
);
