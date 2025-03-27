// src/lib/api-client.ts
/**
 * Client-side API utilities for making requests to our backend
 */

type FetchOptions = RequestInit & {
    params?: Record<string, string | number | boolean | undefined>;
};

/**
 * Formats a URL with query parameters
 */
function formatUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
    if (!params) return url;

    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            queryParams.append(key, String(value));
        }
    });

    const queryString = queryParams.toString();
    return queryString ? `${url}?${queryString}` : url;
}

/**
 * Enhanced fetch function with error handling
 */
async function fetchAPI<T = unknown>(url: string, options?: FetchOptions): Promise<T> {
    const {params, ...fetchOptions} = options || {};
    const formattedUrl = formatUrl(url, params);

    try {
        const response = await fetch(formattedUrl, {
            ...fetchOptions,
            headers: {
                'Content-Type': 'application/json',
                ...fetchOptions?.headers,
            },
        });

        // Parse response body
        const data = await response.json();

        if (!response.ok) {
            // Handle API error response
            const error = new Error(data.error || 'An error occurred');
            (error as Error & { status?: number; data?: unknown }).status = response.status;
            (error as Error & { status?: number; data?: unknown }).data = data;
            throw error;
        }

        return data as T;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * API client with methods for standard CRUD operations
 */
export function createApiClient<T = unknown, CreateInput = Record<string, unknown>, UpdateInput = Record<string, unknown>>(basePath: string) {
    return {
        /**
         * Get all items
         */
        getAll: async (params?: Record<string, string | number | boolean | undefined>): Promise<T[]> => {
            return fetchAPI<T[]>(basePath, {params});
        },

        /**
         * Get a single item by ID
         */
        getById: async (id: string): Promise<T> => {
            return fetchAPI<T>(`${basePath}/${id}`);
        },

        /**
         * Create a new item
         */
        create: async (data: CreateInput): Promise<T> => {
            return fetchAPI<T>(basePath, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        /**
         * Update an existing item
         */
        update: async (id: string, data: UpdateInput): Promise<T> => {
            return fetchAPI<T>(`${basePath}/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
        },

        /**
         * Delete an item
         */
        delete: async (id: string): Promise<{ success: boolean }> => {
            return fetchAPI<{ success: boolean }>(`${basePath}/${id}`, {
                method: 'DELETE',
            });
        },

        /**
         * Custom API request
         */
        custom: async <R = unknown>(
            path: string,
            method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
            data?: Record<string, unknown>,
            params?: Record<string, string | number | boolean | undefined>
        ): Promise<R> => {
            return fetchAPI<R>(`${basePath}/${path}`, {
                method,
                body: data ? JSON.stringify(data) : undefined,
                params,
            });
        },
    };
}

// Create API clients for each entity
export const api = {
    grades: createApiClient('/api/grades'),
    studentTypes: createApiClient('/api/student-types'),
    subjectTypes: createApiClient('/api/subject-types'),
    classTypes: createApiClient('/api/class-types'),
    timeSlots: createApiClient('/api/time-slots'),
    evaluations: createApiClient('/api/evaluations'),
    booths: createApiClient('/api/booths'),
    subjects: createApiClient('/api/subjects'),
    students: createApiClient('/api/students'),
    courses: createApiClient('/api/courses'),
    teachers: createApiClient('/api/teachers'),
};