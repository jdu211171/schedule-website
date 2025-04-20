import { createStudentWithPreference } from "@/actions/student/create";
import { deleteStudent } from "@/actions/student/delete";
import { updateStudentWithPreference } from "@/actions/student/update";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { studentCreateSchema, studentUpdateSchema } from "@/schemas/student.schema";
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

// Define the combined input schema for create
const createStudentWithPreferenceSchema = z.object({
    student: studentCreateSchema,
    preferences: studentPreferencesSchema.optional()
});

type CreateStudentWithPreferenceInput = z.infer<typeof createStudentWithPreferenceSchema>;

// Define the combined input schema for update
const updateStudentWithPreferenceSchema = z.object({
    student: studentUpdateSchema,
    preferences: studentPreferencesSchema.optional()
});

type UpdateStudentWithPreferenceInput = z.infer<typeof updateStudentWithPreferenceSchema>;

export function useStudentCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStudentWithPreferenceInput) => {
            // Validate data against the schema at runtime
            createStudentWithPreferenceSchema.parse(data);
            return createStudentWithPreference(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
        }
    });
}

export function useStudentUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: UpdateStudentWithPreferenceInput) => {
            // Validate data against the schema at runtime
            updateStudentWithPreferenceSchema.parse(data);
            return updateStudentWithPreference(data);
        },
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