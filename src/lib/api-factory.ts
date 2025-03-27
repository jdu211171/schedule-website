import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse, checkEntityExists, checkRelatedRecords } from './api-utils';

type ModelWithCRUD = {
    findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
};

type ModelWithFindUnique = ModelWithCRUD & {
    findUnique: (args: { where: Record<string, string> }) => Promise<unknown>;
};

export function createCrudHandlers<T extends z.ZodObject<z.ZodRawShape>>(
    modelName: keyof typeof prisma,
    idField: string,
    createSchema: T,
    updateSchema: z.ZodObject<z.ZodRawShape> = createSchema.partial(),
    relatedModels: Array<{ model: keyof typeof prisma; field: string }> = []
) {
    const model = prisma[modelName] as unknown as ModelWithCRUD;

    async function getAll() {
        try {
            const items = await model.findMany({orderBy: {name: 'asc'}});
            return createSuccessResponse(items);
        } catch (error) {
            return createErrorResponse(error);
        }
    }

    async function create(request: Request) {
        try {
            const body = await request.json();
            const validatedData = createSchema.parse(body);
            const existingItem = await checkEntityExists(model as ModelWithFindUnique, idField, validatedData[idField]);

            if (existingItem) {
                return NextResponse.json(
                    { error: `${String(modelName)} with this ID already exists` },
                    { status: 409 }
                );
            }

            const newItem = await model.create({ data: validatedData });
            return createSuccessResponse(newItem, 201);
        } catch (error) {
            return createErrorResponse(error);
        }
    }

    async function getOne(request: Request, context: { params: Promise<{ id: string }> }) {
        try {
            const { id } = await context.params;
            const item = await checkEntityExists(model as ModelWithFindUnique, idField, id);

            if (!item) {
                return NextResponse.json(
                    { error: `${String(modelName)} not found` },
                    { status: 404 }
                );
            }

            return createSuccessResponse(item);
        } catch (error) {
            return createErrorResponse(error);
        }
    }

    async function update(request: Request, context: { params: Promise<{ id: string }> }) {
        try {
            const { id } = await context.params;
            const body = await request.json();
            const validatedData = updateSchema.parse(body);
            const existingItem = await checkEntityExists(model as ModelWithFindUnique, idField, id);

            if (!existingItem) {
                return NextResponse.json(
                    { error: `${String(modelName)} not found` },
                    { status: 404 }
                );
            }

            const updatedItem = await model.update({
                where: { [idField]: id },
                data: validatedData
            });
            return createSuccessResponse(updatedItem);
        } catch (error) {
            return createErrorResponse(error);
        }
    }

    async function remove(request: Request, context: { params: Promise<{ id: string }> }) {
        try {
            const { id } = await context.params;
            const existingItem = await checkEntityExists(model as ModelWithFindUnique, idField, id);

            if (!existingItem) {
                return NextResponse.json(
                    { error: `${String(modelName)} not found` },
                    { status: 404 }
                );
            }

            const relatedRecordsDetails: Record<string, number> = {};
            let hasRelatedRecords = false;

            for (const related of relatedModels) {
                const relatedModel = prisma[related.model] as unknown as {
                    count: (args: { where: Record<string, string> }) => Promise<number>;
                };
                const count = await checkRelatedRecords(relatedModel, related.field, id);
                if (count > 0) {
                    hasRelatedRecords = true;
                    relatedRecordsDetails[related.model.toString()] = count;
                }
            }

            if (hasRelatedRecords) {
                return NextResponse.json(
                    {
                        error: `Cannot delete ${String(modelName)} with associated records`,
                        details: relatedRecordsDetails
                    },
                    { status: 409 }
                );
            }

            await model.delete({ where: { [idField]: id } });
            return createSuccessResponse({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }

    return {getAll, create, getOne, update, remove};
}