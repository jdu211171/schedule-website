// file: 'actions-utils.ts'
import { NextResponse } from 'next/server';
import { ZodError, ZodIssue } from 'zod';

export type ApiError = {
    message: string;
    details?: ZodIssue[];
    status: number;
};

export function createErrorResponse(error: unknown): NextResponse {
    let apiError: ApiError;

    if (error instanceof ZodError) {
        apiError = {
            message: 'Validation error',
            details: error.errors,
            status: 400
        };
    } else if (error instanceof Error) {
        apiError = {
            message: error.message || 'An unexpected error occurred',
            status: 500
        };
    } else {
        apiError = {
            message: 'An unexpected error occurred',
            status: 500
        };
    }

    console.error(`API Error (${apiError.status}):`, apiError.message, apiError.details || '');
    return NextResponse.json(
        { error: apiError.message, details: apiError.details },
        { status: apiError.status }
    );
}

export function createSuccessResponse<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

type ModelWithFindUnique = {
    findUnique: (args: { where: Record<string, string> }) => Promise<unknown>;
};

export async function checkEntityExists<T>(
    model: ModelWithFindUnique,
    idField: string,
    id: string
): Promise<T | null> {
    // Use computed property name syntax to dynamically set the field name
    const whereClause = { [idField]: id };
    const entity = await model.findUnique({ where: whereClause });
    return entity as T | null;
}

type ModelWithCount = {
    count: (args: { where: Record<string, string> }) => Promise<number>;
};

export async function checkRelatedRecords(
    model: ModelWithCount,
    field: string,
    value: string
): Promise<number> {
    // Similarly, use computed property name for the where clause
    const whereClause = { [field]: value };
    return await model.count({ where: whereClause });
}