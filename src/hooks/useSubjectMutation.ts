import { fetcher } from "@/lib/fetcher";
import {
  CreateSubjectInput,
  UpdateSubjectInput,
  SubjectWithRelations,
} from "@/schemas/subject.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CreateSubjectResponse = {
  message: string;
  data: SubjectWithRelations;
};

type UpdateSubjectResponse = {
  message: string;
  data: SubjectWithRelations;
};

type DeleteSubjectResponse = {
  message: string;
};

type SubjectsQueryData = {
  data: SubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type SubjectMutationContext = {
  previousSubjects?: Record<string, SubjectsQueryData>;
  previousSubject?: SubjectWithRelations;
  deletedSubject?: SubjectWithRelations;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedSubjectId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  CreateSubjectResponse,
    Error,
    CreateSubjectInput & { subjectTypeNames: Record<string, string> }, // Add subjectTypeNames here
    SubjectMutationContext >
      ({
        mutationFn: (data) => {
          // Extract subjectTypeNames from the input and exclude it from API call
          const { subjectTypeNames, ...apiData } = data;
          return fetcher("/api/subjects", {
            method: "POST",
            body: JSON.stringify(apiData),
          });
        },
        onMutate: async (newSubject) => {
          await queryClient.cancelQueries({ queryKey: ["subjects"] });

          // Get subjectTypeNames from the input (passed from the form component)
          const subjectTypeNames = newSubject.subjectTypeNames || {};

          // If subjectTypeNames weren't provided, try to get them from the cache
          if (Object.keys(subjectTypeNames).length === 0) {
            // Try to get subject type data from the cache
            const subjectTypesData = queryClient.getQueryData(["subjectType"]);
            if (subjectTypesData?.data) {
              subjectTypesData.data.forEach((type: any) => {
                if (type.subjectTypeId && type.name) {
                  subjectTypeNames[type.subjectTypeId] = type.name;
                }
              });
            }
          }

          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });
          const previousSubjects: Record<string, SubjectsQueryData> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousSubjects[JSON.stringify(queryKey)] = data;
            }
          });

          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<SubjectsQueryData>(queryKey);
            if (currentData) {
              const optimisticSubject: SubjectWithRelations & {
                _optimistic?: boolean;
              } = {
                subjectId: tempId,
                name: newSubject.name,
                notes: newSubject.notes === null ? undefined : newSubject.notes,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true,
                subjectToSubjectTypes: newSubject.subjectTypeIds.map((id) => ({
                  subjectId: tempId,
                  subjectTypeId: id,
                  subjectType: {
                    name: subjectTypeNames[id] || `科目種別 ${id.slice(-4)}`,
                  },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })),
                classSessions: [],
                regularClassTemplates: [],
                teacherSubjects: [],
                StudentPreferenceSubject: [],
              };

              queryClient.setQueryData<SubjectsQueryData>(queryKey, {
                ...currentData,
                data: [optimisticSubject, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousSubjects, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousSubjects) {
            Object.entries(context.previousSubjects).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Clean up the ID mapping if we created one
          if (context?.tempId) {
            tempToServerIdMap.delete(context.tempId);
          }

          toast.error("科目の追加に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          tempToServerIdMap.set(context.tempId, response.data.subjectId);

          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<SubjectsQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<SubjectsQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((subject) => {
                  const optimisticSubject = subject as SubjectWithRelations & {
                    _optimistic?: boolean;
                  };
                  if (
                    optimisticSubject.subjectId === context.tempId &&
                    optimisticSubject._optimistic
                  ) {
                    const serverSubject = response.data;
                    return {
                      ...optimisticSubject,
                      ...serverSubject,
                      notes:
                        serverSubject.notes === null
                          ? undefined
                          : serverSubject.notes,
                      subjectId: serverSubject.subjectId,
                      _optimistic: false,
                    };
                  }
                  return subject;
                }),
              });
            }
          });

          toast.success("科目を追加しました", {
            description: response.message,
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["subjects"],
            refetchType: "none",
          });
        },
      });
}

export function useSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  UpdateSubjectResponse,
    Error,
    UpdateSubjectInput & { subjectTypeNames: Record<string, string> }, // Add subjectTypeNames here
    SubjectMutationContext >
      ({
        mutationFn: (data) => {
          // Extract subjectTypeNames from the input and exclude it from API call
          const { subjectTypeNames, ...apiData } = data;
          return fetcher(`/api/subjects`, {
            method: "PUT",
            body: JSON.stringify(apiData),
          });
        },
        onMutate: async (updatedSubjectData) => {
          await queryClient.cancelQueries({ queryKey: ["subjects"] });

          // Get subjectTypeNames from the input (passed from the form component)
          const subjectTypeNames = updatedSubjectData.subjectTypeNames || {};

          // If subjectTypeNames weren't provided and we need them, get from cache
          if (
            Object.keys(subjectTypeNames).length === 0 &&
            updatedSubjectData.subjectTypeIds
          ) {
            // Try to get subject type data from the cache
            const subjectTypesData = queryClient.getQueryData(["subjectType"]);
            if (subjectTypesData?.data) {
              subjectTypesData.data.forEach((type: any) => {
                if (type.subjectTypeId && type.name) {
                  subjectTypeNames[type.subjectTypeId] = type.name;
                }
              });
            }
          }

          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });
          const previousSubjects: Record<string, SubjectsQueryData> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousSubjects[JSON.stringify(queryKey)] = data;
            }
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<SubjectsQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<SubjectsQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((subject) => {
                  if (subject.subjectId === updatedSubjectData.subjectId) {
                    const updatedOptimisticSubject: SubjectWithRelations & {
                      _optimistic?: boolean;
                    } = {
                      ...subject,
                      ...(updatedSubjectData.name && {
                        name: updatedSubjectData.name,
                      }),
                      notes:
                        updatedSubjectData.notes !== undefined
                          ? updatedSubjectData.notes === null
                            ? undefined
                            : updatedSubjectData.notes
                          : subject.notes,
                      subjectToSubjectTypes: updatedSubjectData.subjectTypeIds
                        ? updatedSubjectData.subjectTypeIds.map((typeId) => ({
                            subjectId: subject.subjectId,
                            subjectTypeId: typeId,
                            subjectType: {
                              name:
                                subjectTypeNames[typeId] ||
                                `科目種別 ${typeId.slice(-4)}`,
                            },
                            createdAt: new Date(),
                            updatedAt: new Date(),
                          }))
                        : subject.subjectToSubjectTypes,
                      updatedAt: new Date(),
                      _optimistic: true,
                    };
                    return updatedOptimisticSubject;
                  }
                  return subject;
                }),
              });
            }
          });
          return { previousSubjects, tempId: updatedSubjectData.subjectId };
        },
        onError: (error, _, context) => {
          if (context?.previousSubjects) {
            Object.entries(context.previousSubjects).forEach(
              ([queryKeyStr, data]) => {
                queryClient.setQueryData(JSON.parse(queryKeyStr), data);
              }
            );
          }
          toast.error("科目の更新に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (response, variables, context) => {
          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<SubjectsQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<SubjectsQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((subject) => {
                  const optimisticSubject = subject as SubjectWithRelations & {
                    _optimistic?: boolean;
                  };
                  if (
                    optimisticSubject.subjectId === context?.tempId ||
                    optimisticSubject.subjectId === response.data.subjectId
                  ) {
                    const serverSubject = response.data;
                    return {
                      ...optimisticSubject,
                      ...serverSubject,
                      notes:
                        serverSubject.notes === null
                          ? undefined
                          : serverSubject.notes,
                      subjectId: serverSubject.subjectId,
                      _optimistic: false,
                    };
                  }
                  return subject;
                }),
              });
            }
          });

          toast.success("科目を更新しました", {
            description: response.message,
          });
        },
        onSettled: (data, error, variables) => {
          queryClient.invalidateQueries({ queryKey: ["subjects"] });
          if (variables?.subjectId) {
            queryClient.invalidateQueries({
              queryKey: ["subject", variables.subjectId],
            });
          }
        },
      });
}

export function useSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<
  DeleteSubjectResponse,
    Error,
    string,
    SubjectMutationContext >
      ({
        mutationFn: (subjectId) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedSubjectId(subjectId);

          return fetcher(`/api/subjects?subjectId=${resolvedId}`, {
            method: "DELETE",
          });
        },
        onMutate: async (subjectId) => {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries({ queryKey: ["subjects"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedSubjectId(subjectId);

          await queryClient.cancelQueries({
            queryKey: ["subject", resolvedId],
          });

          // Snapshot all subject queries
          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });
          const previousSubjects: Record<string, SubjectsQueryData> = {};

          // Save all subject queries for potential rollback
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousSubjects[JSON.stringify(queryKey)] = data;
            }
          });

          // Save the subject being deleted
          let deletedSubject: SubjectWithRelations | undefined;
          for (const [, data] of queries) {
            if (data) {
              const found = data.data.find(
                (subject) => subject.subjectId === subjectId
              );
              if (found) {
                deletedSubject = found;
                break;
              }
            }
          }

          // Optimistically update all subject queries
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<SubjectsQueryData>(queryKey);

            if (currentData) {
              queryClient.setQueryData<SubjectsQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.filter(
                  (subject) => subject.subjectId !== subjectId
                ),
                pagination: {
                  ...currentData.pagination,
                  total: Math.max(0, currentData.pagination.total - 1),
                },
              });
            }
          });

          // Remove the individual subject query
          queryClient.removeQueries({ queryKey: ["subject", resolvedId] });

          // If it was a temporary ID, clean up the mapping
          if (subjectId.startsWith("temp-")) {
            tempToServerIdMap.delete(subjectId);
          }

          // Return the snapshots for rollback
          return { previousSubjects, deletedSubject };
        },
        onError: (error, subjectId, context) => {
          // Rollback subject list queries
          if (context?.previousSubjects) {
            Object.entries(context.previousSubjects).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Restore mapping if it was removed
          if (subjectId.startsWith("temp-") && context?.deletedSubject) {
            tempToServerIdMap.set(subjectId, context.deletedSubject.subjectId);
          }

          // Resolve ID for restoring the single subject query
          const resolvedId = getResolvedSubjectId(subjectId);

          // Restore individual subject query if it existed
          if (context?.deletedSubject) {
            queryClient.setQueryData(
              ["subject", resolvedId],
              context.deletedSubject
            );
          }

          toast.error("科目の削除に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (data, subjectId) => {
          // If it was a temporary ID, clean up the mapping on success
          if (subjectId.startsWith("temp-")) {
            tempToServerIdMap.delete(subjectId);
          }

          toast.success("科目を削除しました", {
            description: data.message,
          });
        },
        onSettled: (_, __, subjectId) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedSubjectId(subjectId);

          // Invalidate queries in the background to ensure eventual consistency
          queryClient.invalidateQueries({
            queryKey: ["subjects"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["subject", resolvedId],
            refetchType: "none",
          });
        },
      });
}
