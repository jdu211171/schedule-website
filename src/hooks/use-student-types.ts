// src/hooks/use-student-types.ts
import { useCallback, useState } from "react";
import { toast } from "sonner";

type StudentType = {
  studentTypeId: string;
  name: string;
  maxYears: number | null;
  description: string | null;
  studentCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

type StudentTypeResponse = {
  data: StudentType[];
  pagination: Pagination;
  message?: string;
};

type StudentTypeFilter = {
  page?: number;
  limit?: number;
  name?: string;
};

type CreateStudentTypeData = {
  name: string;
  maxYears?: number;
  description?: string;
};

type UpdateStudentTypeData = {
  name?: string;
  maxYears?: number | null;
  description?: string | null;
};

export const useStudentTypes = () => {
  const [loading, setLoading] = useState(false);
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });

  // Fetch student types with optional filtering
  const fetchStudentTypes = useCallback(
    async (filter: StudentTypeFilter = {}) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filter.page) queryParams.append("page", filter.page.toString());
        if (filter.limit) queryParams.append("limit", filter.limit.toString());
        if (filter.name) queryParams.append("name", filter.name);

        const response = await fetch(
          `/api/student-types?${queryParams.toString()}`
        );
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "生徒タイプの取得に失敗しました");
        }

        const data: StudentTypeResponse = await response.json();
        setStudentTypes(data.data);
        setPagination(data.pagination);
        return data;
      } catch (error) {
        console.error("Error fetching student types:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "生徒タイプの取得に失敗しました"
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get a single student type by ID
  const getStudentType = useCallback(async (studentTypeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/student-types/${studentTypeId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生徒タイプの取得に失敗しました");
      }

      const data: StudentTypeResponse = await response.json();
      return data.data[0] || null;
    } catch (error) {
      console.error("Error fetching student type:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "生徒タイプの取得に失敗しました"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new student type
  const createStudentType = useCallback(async (data: CreateStudentTypeData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/student-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生徒タイプの作成に失敗しました");
      }

      const result: StudentTypeResponse = await response.json();
      toast.success(result.message || "生徒タイプを作成しました");
      return result.data[0] || null;
    } catch (error) {
      console.error("Error creating student type:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "生徒タイプの作成に失敗しました"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing student type
  const updateStudentType = useCallback(
    async (studentTypeId: string, data: UpdateStudentTypeData) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/student-types/${studentTypeId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "生徒タイプの更新に失敗しました");
        }

        const result: StudentTypeResponse = await response.json();
        toast.success(result.message || "生徒タイプを更新しました");
        return result.data[0] || null;
      } catch (error) {
        console.error("Error updating student type:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "生徒タイプの更新に失敗しました"
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete a student type
  const deleteStudentType = useCallback(async (studentTypeId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/student-types/${studentTypeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生徒タイプの削除に失敗しました");
      }

      const result: StudentTypeResponse = await response.json();
      toast.success(result.message || "生徒タイプを削除しました");
      return true;
    } catch (error) {
      console.error("Error deleting student type:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "生徒タイプの削除に失敗しました"
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    studentTypes,
    pagination,
    fetchStudentTypes,
    getStudentType,
    createStudentType,
    updateStudentType,
    deleteStudentType,
  };
};
