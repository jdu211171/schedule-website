import { createStudentWithPreference } from "@/actions/student/create";
import { deleteStudent } from "@/actions/student/delete";
import { updateStudentWithPreference } from "@/actions/student/update";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { studentCreateSchema, studentUpdateSchema } from "@/schemas/student.schema";
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

// Define the combined input type for create
const createStudentWithPreferenceSchema = z.object({
    student: studentCreateSchema,
    preferences: studentPreferencesSchema.optional()
});

type CreateStudentWithPreferenceInput = z.infer<typeof createStudentWithPreferenceSchema>;

// Define the combined input type for update
const updateStudentWithPreferenceSchema = z.object({
    student: studentUpdateSchema,
    preferences: studentPreferencesSchema.optional()
});

type UpdateStudentWithPreferenceInput = z.infer<typeof updateStudentWithPreferenceSchema>;

export function useStudentCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStudentWithPreferenceInput) => createStudentWithPreference(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}

export function useStudentUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateStudentWithPreferenceInput) => updateStudentWithPreference(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}

export function useStudentDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteStudent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}