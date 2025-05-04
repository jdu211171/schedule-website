import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateUserStudentSchema,
  StudentQuerySchema,
  UpdateStudentWithPreferencesSchema,
} from "@/schemas/student.schema";
import bcrypt from "bcryptjs";
import { DayOfWeek } from "@prisma/client";
import { ZodError } from "zod";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const paramsObj: Record<string, unknown> = {};

    // Handle potential array parameters
    for (const key of [
      "gradeId",
      "studentTypeId",
      "examSchoolType",
      "preferredSubjectId",
    ]) {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        paramsObj[key] = values.length === 1 ? values[0] : values;
      }
    }

    // Add all other parameters
    for (const [key, value] of searchParams.entries()) {
      if (
        ![
          "gradeId",
          "studentTypeId",
          "examSchoolType",
          "preferredSubjectId",
        ].includes(key)
      ) {
        paramsObj[key] = value;
      }
    }

    const query = StudentQuerySchema.parse(paramsObj);
    const {
      page,
      limit,
      name,
      gradeName,
      gradeId,
      studentTypeId,
      schoolName,
      schoolType,
      examSchoolType,
      preferredSubjectId,
      sort,
      order,
    } = query;

    const filters: Record<string, unknown> = {};

    if (name) {
      filters.name = { contains: name, mode: "insensitive" };
    }

    if (schoolName) {
      filters.schoolName = { contains: schoolName, mode: "insensitive" };
    }

    if (schoolType) {
      filters.schoolType = schoolType;
    }

    // Handle examSchoolType filtering
    if (examSchoolType) {
      if (Array.isArray(examSchoolType)) {
        filters.examSchoolType = { in: examSchoolType };
      } else {
        filters.examSchoolType = examSchoolType;
      }
    }

    // Handle gradeName filtering (existing logic)
    if (gradeName) {
      filters.grade = {
        name: { contains: gradeName, mode: "insensitive" },
      };
    }

    // Handle gradeId filtering
    if (gradeId) {
      if (Array.isArray(gradeId)) {
        filters.gradeId = { in: gradeId };
      } else {
        filters.gradeId = gradeId;
      }
    }

    // Handle studentTypeId filtering
    if (studentTypeId) {
      if (Array.isArray(studentTypeId)) {
        filters.grade = {
          ...(typeof filters.grade === "object" && filters.grade !== null
            ? filters.grade
            : {}),
          studentTypeId: { in: studentTypeId },
        };
      } else {
        filters.grade = {
          ...(typeof filters.grade === "object" && filters.grade !== null
            ? filters.grade
            : {}),
          studentTypeId: studentTypeId,
        };
      }
    }

    // Handle preferred subject filtering
    if (preferredSubjectId) {
      // Add filter for students with specified preferred subject(s)
      if (Array.isArray(preferredSubjectId)) {
        // For multiple subjects, find students who prefer ANY of the specified subjects
        filters.StudentPreference = {
          some: {
            subjects: {
              some: {
                subjectId: {
                  in: preferredSubjectId,
                },
              },
            },
          },
        };
      } else {
        // For a single subject
        filters.StudentPreference = {
          some: {
            subjects: {
              some: {
                subjectId: preferredSubjectId,
              },
            },
          },
        };
      }
    }

    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> = {};
    orderBy[sort] = order;

    const total = await prisma.student.count({
      where: filters,
    });

    const students = await prisma.student.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
      include: {
        grade: true,
        StudentPreference: {
          include: {
            classType: true,
            subjects: {
              include: {
                subject: true,
              },
            },
            teachers: {
              include: {
                teacher: true,
              },
            },
            timeSlots: true,
          },
        },
      },
    });

    return Response.json({
      data: students,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate the combined user/student data
    const validatedData = CreateUserStudentSchema.parse(body);

    const { username, password, preferences, ...studentData } = validatedData;

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return Response.json(
        {
          error: "Username already taken",
          message: "Please choose a different username",
        },
        { status: 400 }
      );
    }

    // Check if grade exists if provided
    if (studentData.gradeId) {
      const gradeExists = await prisma.grade.findUnique({
        where: { gradeId: studentData.gradeId },
      });

      if (!gradeExists) {
        return Response.json({ error: "Grade not found" }, { status: 404 });
      }
    }

    // Verify subjects and teachers exist before starting transaction
    if (preferences?.subjects?.length) {
      const subjectIds = preferences.subjects;
      const existingSubjects = await prisma.subject.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { subjectId: true },
      });

      if (existingSubjects.length !== subjectIds.length) {
        const existingIds = existingSubjects.map((s) => s.subjectId);
        const invalidIds = subjectIds.filter((id) => !existingIds.includes(id));
        return Response.json(
          {
            error: "Invalid subject IDs",
            message: `The following subject IDs do not exist: ${invalidIds.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    if (preferences?.teachers?.length) {
      const teacherIds = preferences.teachers;
      const existingTeachers = await prisma.teacher.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true },
      });

      if (existingTeachers.length !== teacherIds.length) {
        const existingIds = existingTeachers.map((t) => t.teacherId);
        const invalidIds = teacherIds.filter((id) => !existingIds.includes(id));
        return Response.json(
          {
            error: "Invalid teacher IDs",
            message: `The following teacher IDs do not exist: ${invalidIds.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // Verify classType if provided
    if (preferences?.classTypeId) {
      const classTypeExists = await prisma.classType.findUnique({
        where: { classTypeId: preferences.classTypeId },
      });

      if (!classTypeExists) {
        return Response.json(
          {
            error: "Invalid class type ID",
            message: `The class type ID ${preferences.classTypeId} does not exist`,
          },
          { status: 400 }
        );
      }
    }

    // Start a transaction to create everything
    const result = await prisma.$transaction(async (tx) => {
      // 1. Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // 2. Create the user account
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          name: studentData.name,
          role: "STUDENT",
        },
      });

      // 3. Create the student record
      // Fix: Ensure examSchoolType is only set if it matches the enum (PUBLIC, PRIVATE)
      const validSchoolTypes = ["PUBLIC", "PRIVATE"];
      const validExamSchoolCategoryTypes = [
        "ELEMENTARY",
        "MIDDLE",
        "HIGH",
        "UNIVERSITY",
        "OTHER",
      ];
      const fixedStudentData = {
        ...studentData,
        // Only set examSchoolType if valid
        examSchoolType: validSchoolTypes.includes(studentData.examSchoolType!)
          ? studentData.examSchoolType
          : undefined,
        // Only set examSchoolCategoryType if valid
        examSchoolCategoryType: validExamSchoolCategoryTypes.includes(
          studentData.examSchoolCategoryType!
        )
          ? studentData.examSchoolCategoryType
          : undefined,
      };

      const student = await tx.student.create({
        data: {
          ...fixedStudentData,
          userId: user.id,
        },
      });

      // 4. If preferences are provided, create them
      if (preferences) {
        const {
          subjects = [],
          teachers = [],
          timeSlots = [],
          classTypeId,
          notes,
        } = preferences;

        // Create the student preference
        const preference = await tx.studentPreference.create({
          data: {
            studentId: student.studentId,
            classTypeId,
            notes,
          },
        });

        // Create subject preferences
        if (subjects.length > 0) {
          await Promise.all(
            subjects.map((subjectId: string) =>
              tx.studentPreferenceSubject.create({
                data: {
                  studentPreferenceId: preference.preferenceId,
                  subjectId,
                },
              })
            )
          );
        }

        // Create teacher preferences
        if (teachers.length > 0) {
          await Promise.all(
            teachers.map((teacherId: string) =>
              tx.studentPreferenceTeacher.create({
                data: {
                  studentPreferenceId: preference.preferenceId,
                  teacherId,
                },
              })
            )
          );
        }

        // Create time slot preferences
        if (timeSlots.length > 0) {
          await Promise.all(
            timeSlots.map(
              (slot: {
                dayOfWeek: string;
                startTime: string;
                endTime: string;
              }) =>
                tx.studentPreferenceTimeSlot.create({
                  data: {
                    preferenceId: preference.preferenceId,
                    dayOfWeek: slot.dayOfWeek as DayOfWeek,
                    startTime: new Date(`1970-01-01T${slot.startTime}`),
                    endTime: new Date(`1970-01-01T${slot.endTime}`),
                  },
                })
            )
          );
        }
      }

      // Return the created student with all related data
      return tx.student.findUnique({
        where: { studentId: student.studentId },
        include: {
          grade: true,
          StudentPreference: {
            include: {
              classType: true,
              subjects: {
                include: {
                  subject: true,
                },
              },
              teachers: {
                include: {
                  teacher: true,
                },
              },
              timeSlots: true,
            },
          },
        },
      });
    });

    return Response.json(
      {
        message: "User and student created successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user and student:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "Failed to create user and student",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validatedData = UpdateStudentWithPreferencesSchema.parse(body);
    const { studentId, password, preferences, ...studentData } = validatedData;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { studentId },
      include: {
        StudentPreference: {
          include: {
            subjects: true,
            teachers: true,
            timeSlots: true,
          },
        },
      },
    });

    if (!existingStudent) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // If gradeId is provided, check if it exists
    if (studentData.gradeId) {
      const gradeExists = await prisma.grade.findUnique({
        where: { gradeId: studentData.gradeId },
      });

      if (!gradeExists) {
        return Response.json({ error: "Grade not found" }, { status: 404 });
      }
    }

    // Verify subjects, teachers, and classType if provided
    if (preferences?.subjects?.length) {
      const subjectIds = preferences.subjects;
      const existingSubjects = await prisma.subject.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { subjectId: true },
      });

      if (existingSubjects.length !== subjectIds.length) {
        const existingIds = existingSubjects.map((s) => s.subjectId);
        const invalidIds = subjectIds.filter((id) => !existingIds.includes(id));
        return Response.json(
          {
            error: "Invalid subject IDs",
            message: `The following subject IDs do not exist: ${invalidIds.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    if (preferences?.teachers?.length) {
      const teacherIds = preferences.teachers;
      const existingTeachers = await prisma.teacher.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true },
      });

      if (existingTeachers.length !== teacherIds.length) {
        const existingIds = existingTeachers.map((t) => t.teacherId);
        const invalidIds = teacherIds.filter((id) => !existingIds.includes(id));
        return Response.json(
          {
            error: "Invalid teacher IDs",
            message: `The following teacher IDs do not exist: ${invalidIds.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    if (preferences?.classTypeId) {
      const classTypeExists = await prisma.classType.findUnique({
        where: { classTypeId: preferences.classTypeId },
      });

      if (!classTypeExists) {
        return Response.json(
          {
            error: "Invalid class type ID",
            message: `The class type ID ${preferences.classTypeId} does not exist`,
          },
          { status: 400 }
        );
      }
    }

    // Start transaction to update everything
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update student basic info
      const updateData = Object.fromEntries(
        Object.entries(studentData).filter(([, value]) => value !== undefined)
      );

      // Update without storing the result since we don't use it
      await tx.student.update({
        where: { studentId },
        data: updateData,
      });

      // 2. Update password if provided
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await tx.user.update({
          where: { id: existingStudent.userId },
          data: { passwordHash },
        });
      }

      // 2. Update preferences if provided
      if (preferences) {
        // Get or create the preference record
        let preferenceRecord = existingStudent.StudentPreference[0];

        if (!preferenceRecord) {
          // Create new preference if it doesn't exist
          const newPreference = await tx.studentPreference.create({
            data: {
              studentId,
              classTypeId: preferences.classTypeId,
              notes: preferences.notes,
            },
          });

          // Initialize with empty relationship arrays
          preferenceRecord = {
            ...newPreference,
            subjects: [],
            teachers: [],
            timeSlots: [],
          };
        } else {
          // Update existing preference
          await tx.studentPreference.update({
            where: { preferenceId: preferenceRecord.preferenceId },
            data: {
              classTypeId: preferences.classTypeId,
              notes: preferences.notes,
            },
          });
        }

        // 3. Update subjects if provided
        if (preferences.subjects !== undefined) {
          // Delete all existing subject preferences
          if (preferenceRecord.subjects.length > 0) {
            await tx.studentPreferenceSubject.deleteMany({
              where: { studentPreferenceId: preferenceRecord.preferenceId },
            });
          }

          // Create new subject preferences
          if (preferences.subjects.length > 0) {
            await Promise.all(
              preferences.subjects.map((subjectId) =>
                tx.studentPreferenceSubject.create({
                  data: {
                    studentPreferenceId: preferenceRecord.preferenceId,
                    subjectId,
                  },
                })
              )
            );
          }
        }

        // 4. Update teachers if provided
        if (preferences.teachers !== undefined) {
          // Delete all existing teacher preferences
          if (preferenceRecord.teachers.length > 0) {
            await tx.studentPreferenceTeacher.deleteMany({
              where: { studentPreferenceId: preferenceRecord.preferenceId },
            });
          }

          // Create new teacher preferences
          if (preferences.teachers.length > 0) {
            await Promise.all(
              preferences.teachers.map((teacherId) =>
                tx.studentPreferenceTeacher.create({
                  data: {
                    studentPreferenceId: preferenceRecord.preferenceId,
                    teacherId,
                  },
                })
              )
            );
          }
        }

        // 5. Update time slots if provided
        if (preferences.timeSlots !== undefined) {
          // Delete all existing time slots
          if (preferenceRecord.timeSlots.length > 0) {
            await tx.studentPreferenceTimeSlot.deleteMany({
              where: { preferenceId: preferenceRecord.preferenceId },
            });
          }

          // Create new time slots
          if (preferences.timeSlots.length > 0) {
            await Promise.all(
              preferences.timeSlots.map((slot) =>
                tx.studentPreferenceTimeSlot.create({
                  data: {
                    preferenceId: preferenceRecord.preferenceId,
                    dayOfWeek: slot.dayOfWeek as DayOfWeek,
                    startTime: new Date(`1970-01-01T${slot.startTime}`),
                    endTime: new Date(`1970-01-01T${slot.endTime}`),
                  },
                })
              )
            );
          }
        }
      }

      // Return the updated student with all related data
      return tx.student.findUnique({
        where: { studentId },
        include: {
          grade: true,
          StudentPreference: {
            include: {
              classType: true,
              subjects: {
                include: {
                  subject: true,
                },
              },
              teachers: {
                include: {
                  teacher: true,
                },
              },
              timeSlots: true,
            },
          },
        },
      });
    });

    return Response.json({
      message: "Student updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid request data", issues: error.issues },
        { status: 400 }
      );
    }
    return Response.json(
      {
        error: "Failed to update student",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return Response.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { studentId },
      include: {
        StudentPreference: true,
        studentClassEnrollments: true,
        templateStudentAssignments: true,
        ClassSession: true,
      },
    });

    if (!existingStudent) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Begin transaction to delete student and all related data
    await prisma.$transaction(async (tx) => {
      // 1. Delete related data first
      if (
        existingStudent.StudentPreference &&
        existingStudent.StudentPreference.length > 0
      ) {
        for (const pref of existingStudent.StudentPreference) {
          // Delete any preference subjects
          await tx.studentPreferenceSubject.deleteMany({
            where: { studentPreferenceId: pref.preferenceId },
          });

          // Delete any preference teachers
          await tx.studentPreferenceTeacher.deleteMany({
            where: { studentPreferenceId: pref.preferenceId },
          });

          // Delete any preference time slots
          await tx.studentPreferenceTimeSlot.deleteMany({
            where: { preferenceId: pref.preferenceId },
          });
        }

        // Delete the preferences themselves
        await tx.studentPreference.deleteMany({
          where: { studentId },
        });
      }

      // Delete enrollments
      await tx.studentClassEnrollment.deleteMany({
        where: { studentId },
      });

      // Delete template assignments
      await tx.templateStudentAssignment.deleteMany({
        where: { studentId },
      });

      // Delete class sessions
      await tx.classSession.deleteMany({
        where: { studentId },
      });

      // 2. Delete the student
      await tx.student.delete({
        where: { studentId },
      });

      // 3. Finally delete the user
      await tx.user.delete({
        where: { id: existingStudent.userId },
      });
    });

    return Response.json({
      message: "Student and associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return Response.json(
      {
        error: "Failed to delete student",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
