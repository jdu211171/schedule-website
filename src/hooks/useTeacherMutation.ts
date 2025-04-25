import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTeacherWithShift } from "@/actions/teacher/create";
import { updateTeacherWithShift } from "@/actions/teacher/update";
import { deleteTeacher } from "@/actions/teacher/delete";
import { z } from "zod";
import {
  teacherCreateSchema,
  teacherUpdateSchema,
} from "@/schemas/teacher.schema";
import { teacherShiftPreferencesSchema } from "@/schemas/teacher-preferences.schema";

// Define the combined input schema for create
const createTeacherWithShiftSchema = z.object({
  teacher: teacherCreateSchema,
  preferences: teacherShiftPreferencesSchema.optional(),
});

type CreateTeacherWithShiftInput = z.infer<typeof createTeacherWithShiftSchema>;

// Define the combined input schema for update
const updateTeacherWithShiftSchema = z.object({
  teacher: teacherUpdateSchema,
  preferences: teacherShiftPreferencesSchema.optional(),
});

type UpdateTeacherWithShiftInput = z.infer<typeof updateTeacherWithShiftSchema>;

export function useTeacherCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeacherWithShiftInput) => {
      // Validate data against the schema at runtime
      createTeacherWithShiftSchema.parse(data);
      return createTeacherWithShift(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}

export function useTeacherUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTeacherWithShiftInput) => {
      // Validate data against the schema at runtime
      updateTeacherWithShiftSchema.parse(data);
      return updateTeacherWithShift(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}

export function useTeacherDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}
