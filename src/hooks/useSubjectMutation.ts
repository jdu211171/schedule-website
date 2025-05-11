import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import {
  CreateSubjectInput,
  UpdateSubjectInput,
  SubjectWithRelations,
} from "@/schemas/subject.schema";

// Define types previously imported from "@/types/subject"

export const tempToServerIdMap = new Map<string, string>();

export interface CreateSubjectResponse {
  message: string;
  data: SubjectWithRelations;
}

export interface UpdateSubjectResponse {
  message: string;
  data: SubjectWithRelations;
}

export interface DeleteSubjectResponse {
  message: string;
  subjectId?: string; // Optional: if the backend returns the ID of the deleted item
}

export interface SubjectsQueryData {
  data: SubjectWithRelations[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface SubjectMutationContext {
  previousSubjects?: Record<string, SubjectsQueryData | undefined>;
  optimisticUpdateId?: string; // Used for create operations
  // For update/delete, the actual subjectId can be used if needed in context
}

// Define types for subject type cache data (seems to be correctly defined already)
interface SubjectTypeCacheItem {
  subjectTypeId: string;
  name: string;
  // Add other fields if they exist in your cached subjectType object
}

interface SubjectTypesQueryCacheData {
  data?: SubjectTypeCacheItem[];
  // Add other potential pagination/metadata fields if they exist
}

export function getResolvedSubjectId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

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
    CreateSubjectInput & { subjectTypeNames: Record<string, string> },
    SubjectMutationContext >
      ({
        mutationFn: (data) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { subjectTypeNames: _subjectTypeNames, ...apiData } = data;
          return fetcher("/api/subjects", {
            method: "POST",
            body: JSON.stringify(apiData),
          });
        },
        onMutate: async (newSubject) => {
          await queryClient.cancelQueries({ queryKey: ["subjects"] });

          const subjectTypeNames = newSubject.subjectTypeNames || {};

          if (
            Object.keys(subjectTypeNames).length === 0 &&
            newSubject.subjectTypeIds.length > 0
          ) {
            const subjectTypesData =
              queryClient.getQueryData<SubjectTypesQueryCacheData>([
                "subjectType",
              ]);
            if (subjectTypesData?.data) {
              subjectTypesData.data.forEach((type: SubjectTypeCacheItem) => {
                if (
                  newSubject.subjectTypeIds.includes(type.subjectTypeId) &&
                  type.name
                ) {
                  subjectTypeNames[type.subjectTypeId] = type.name;
                }
              });
            }
          }

          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });
          const previousSubjects: Record<
            string,
            SubjectsQueryData | undefined
          > = {};
          queries.forEach(([queryKey, data]) => {
            previousSubjects[JSON.stringify(queryKey)] = data;
          });

          const tempId = `temp-${Date.now()}`;

          queries.forEach(([queryKey]) => {
            queryClient.setQueryData<SubjectsQueryData>(queryKey, (oldData) => {
              if (!oldData) return undefined; // Or return oldData if it can be undefined initially

              const optimisticSubjectData = {
                name: newSubject.name,
                notes: newSubject.notes || null, // Ensure notes matches schema (e.g. string | null)
                subjectId: tempId,
                createdAt: new Date(),
                updatedAt: new Date(),
                subjectToSubjectTypes: newSubject.subjectTypeIds.map((id) => ({
                  subjectId: tempId,
                  subjectTypeId: id,
                  subjectType: { name: subjectTypeNames[id] || "Loading..." },
                  _optimistic: true, // Custom flag
                })),
                classSessions: [],
                regularClassTemplates: [],
                teacherSubjects: [],
                StudentPreferenceSubject: [],
                _optimistic: true, // Custom flag
              };

              // Cast to SubjectWithRelations, acknowledging _optimistic is an extra prop handled elsewhere
              const optimisticSubject =
                optimisticSubjectData as unknown as SubjectWithRelations;

              return {
                ...oldData,
                data: [optimisticSubject, ...oldData.data],
                pagination: {
                  ...oldData.pagination,
                  total: oldData.pagination.total + 1,
                },
              };
            });
          });
          return { previousSubjects, optimisticUpdateId: tempId };
        },
        onError: (error, _variables, context) => {
          toast.error(`科目作成エラー: ${error.message}`);
          if (context?.previousSubjects) {
            Object.entries(context.previousSubjects).forEach(([key, value]) => {
              queryClient.setQueryData(JSON.parse(key), value);
            });
          }
        },
        onSuccess: (response, _variables, context) => {
          toast.success(response.message);
          const serverId = response.data.subjectId;
          const tempId = context?.optimisticUpdateId;

          if (tempId && serverId) {
            tempToServerIdMap.set(tempId, serverId);

            const queries = queryClient.getQueriesData<SubjectsQueryData>({
              queryKey: ["subjects"],
            });
            queries.forEach(([queryKey]) => {
              queryClient.setQueryData<SubjectsQueryData>(
                queryKey,
                (oldData) => {
                  if (!oldData) return undefined;
                  return {
                    ...oldData,
                    data: oldData.data.map((subject) =>
                      subject.subjectId === tempId ? response.data : subject
                    ),
                  };
                }
              );
            });
          }
          // Removed query invalidation here to prevent unnecessary refetching
        },
        onSettled: (_data, _error, _variables, context) => {
          const tempId = context?.optimisticUpdateId;
          if (tempId) {
            // Optional: Clean up tempToServerIdMap if the tempId is confirmed or no longer needed for resolution
            // tempToServerIdMap.delete(tempId); // Consider if getResolvedSubjectId is used long after
          }
          // Ensure data consistency without triggering a refetch
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
    UpdateSubjectInput & { subjectTypeNames: Record<string, string> },
    SubjectMutationContext
  >({
    mutationFn: async (data) => {
      // Extract and exclude subjectTypeNames from API data
      const { subjectTypeNames: _subjectTypeNames, ...apiData } = data;

      // Resolve the ID before sending to the server - crucial step
      const resolvedId = getResolvedSubjectId(apiData.subjectId);

      // Create a new object with the resolved ID
      const requestData = {
        ...apiData,
        subjectId: resolvedId,
      };

      // Log for debugging
      console.log(
        "Sending update request with ID:",
        resolvedId,
        "Original ID:",
        apiData.subjectId
      );

      // Send the update request
      return await fetcher(`/api/subjects`, {
        method: "PUT",
        body: JSON.stringify(requestData),
      });
    },
    onMutate: async (updatedSubjectData) => {
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ["subjects"] });

      // Resolve the ID before performing optimistic updates
      const resolvedId = getResolvedSubjectId(updatedSubjectData.subjectId);
      console.log(
        "Optimistic update with resolved ID:",
        resolvedId,
        "Original ID:",
        updatedSubjectData.subjectId
      );

      // Get subject type names from cache if not provided
      const subjectTypeNames = updatedSubjectData.subjectTypeNames || {};
      if (
        Object.keys(subjectTypeNames).length === 0 &&
        updatedSubjectData.subjectTypeIds &&
        updatedSubjectData.subjectTypeIds.length > 0
      ) {
        const subjectTypesData =
          queryClient.getQueryData<SubjectTypesQueryCacheData>(["subjectType"]);
        if (subjectTypesData?.data) {
          subjectTypesData.data.forEach((type) => {
            if (
              updatedSubjectData.subjectTypeIds!.includes(type.subjectTypeId) &&
              type.name
            ) {
              subjectTypeNames[type.subjectTypeId] = type.name;
            }
          });
        }
      }

      // Store previous state for potential rollback
      const previousSubjects: Record<string, SubjectsQueryData | undefined> =
        {};
      const queries = queryClient.getQueriesData<SubjectsQueryData>({
        queryKey: ["subjects"],
      });

      queries.forEach(([queryKey, data]) => {
        previousSubjects[JSON.stringify(queryKey)] = data;
      });

      // Perform optimistic updates on all matching queries
      queries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<SubjectsQueryData>(queryKey, (oldData) => {
            if (!oldData) return undefined;

            return {
              ...oldData,
              data: oldData.data.map((subject) => {
                // Check both original and resolved IDs
                if (
                  subject.subjectId === updatedSubjectData.subjectId ||
                  subject.subjectId === resolvedId
                ) {
                  // Handle notes correctly
                  const correctedNotes =
                    updatedSubjectData.notes === null
                      ? undefined
                      : updatedSubjectData.notes;

                  // Create new subject types relations if provided
                  let newSubjectToSubjectTypes:
                    | SubjectWithRelations["subjectToSubjectTypes"]
                    | undefined = undefined;
                  if (updatedSubjectData.subjectTypeIds) {
                    newSubjectToSubjectTypes =
                      updatedSubjectData.subjectTypeIds.map((id) => ({
                        subjectId: resolvedId,
                        subjectTypeId: id,
                        subjectType: {
                          name: subjectTypeNames[id] || "Loading...",
                          subjectTypeId: id,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      }));
                  }

                  // Create the optimistic subject update
                  return {
                    ...subject,
                    ...updatedSubjectData,
                    subjectId: resolvedId,
                    notes: correctedNotes,
                    updatedAt: new Date(),
                    ...(newSubjectToSubjectTypes && {
                      subjectToSubjectTypes: newSubjectToSubjectTypes,
                    }),
                    _optimistic: true,
                  } as unknown as SubjectWithRelations;
                }
                return subject;
              }),
            };
          });
        }
      });

      // Return context for potential rollback
      return { previousSubjects };
    },
    onError: (error, variables, context) => {
      console.error(
        "Subject update error:",
        error,
        "For subject ID:",
        variables.subjectId
      );
      toast.error(`科目更新エラー: ${error.message}`);

      // Restore previous state on error
      if (context?.previousSubjects) {
        Object.entries(context.previousSubjects).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value);
        });
      }
    },
    onSuccess: (response, variables) => {
      toast.success(response.message);

      // Get the resolved ID
      const resolvedId = getResolvedSubjectId(variables.subjectId);

      // Update all subject queries with the server response data (without _optimistic flag)
      const queries = queryClient.getQueriesData<SubjectsQueryData>({
        queryKey: ["subjects"],
      });
      queries.forEach(([queryKey]) => {
        queryClient.setQueryData<SubjectsQueryData>(queryKey, (oldData) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            data: oldData.data.map((subject) =>
              subject.subjectId === resolvedId ? response.data : subject
            ),
          };
        });
      });
    },
    onSettled: (_data, _error, variables) => {
      // Resolve the ID for proper invalidation
      const resolvedId = getResolvedSubjectId(variables.subjectId);
      console.log("Subject update settled for resolved ID:", resolvedId);

      // Invalidate queries without refetching
      queryClient.invalidateQueries({
        queryKey: ["subjects"],
        refetchType: "none",
      });

      // Also invalidate the individual subject query if it exists
      queryClient.invalidateQueries({
        queryKey: ["subject", resolvedId],
        refetchType: "none",
      });
}

export function useSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<
  DeleteSubjectResponse,
    Error,
    string, // Change from object to string parameter
    SubjectMutationContext >
      ({
        mutationFn: (subjectId) => {
          // Resolve the ID before sending to the server (like in the grade module)
          const resolvedId = getResolvedSubjectId(subjectId);

          return fetcher(`/api/subjects?subjectId=${resolvedId}`, {
            method: "DELETE",
          });
        },
        onMutate: async (subjectIdToDelete) => {
          await queryClient.cancelQueries({ queryKey: ["subjects"] });

          const previousSubjects: Record<
            string,
            SubjectsQueryData | undefined
          > = {};
          const queries = queryClient.getQueriesData<SubjectsQueryData>({
            queryKey: ["subjects"],
          });

          queries.forEach(([queryKey, data]) => {
            previousSubjects[JSON.stringify(queryKey)] = data;
            if (data) {
              // Check if data exists before trying to update
              queryClient.setQueryData<SubjectsQueryData>(
                queryKey,
                (oldData) => {
                  if (!oldData) return undefined;
                  return {
                    ...oldData,
                    data: oldData.data.filter(
                      (subject) => subject.subjectId !== subjectIdToDelete
                    ),
                    pagination: {
                      ...oldData.pagination,
                      total: oldData.pagination.total - 1,
                    },
                  };
                }
              );
            }
          });
          return { previousSubjects }; // Return the context
        },
        onError: (error, _variables, context) => {
          toast.error(`科目削除エラー: ${error.message}`);
          if (context?.previousSubjects) {
            Object.entries(context.previousSubjects).forEach(([key, value]) => {
              queryClient.setQueryData(JSON.parse(key), value);
            });
          }
        },
        onSuccess: (response) => {
          toast.success(response.message);
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["subjects"],
            refetchType: "none",
          });
        },
      });
}
