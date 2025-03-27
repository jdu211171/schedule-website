import { auth } from '@/auth';
        import { z } from 'zod';
        import prisma from '@/lib/prisma';
        import { checkEntityExists, checkRelatedRecords } from '@/lib/api-utils';

        type ModelWithCRUD = {
            findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
            create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
            update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
            delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
            findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
            count: (args: { where: Record<string, unknown> }) => Promise<number>;
        };

        export function createCrudActions<T extends z.ZodObject<z.ZodRawShape>>(
            modelName: keyof typeof prisma,
            idField: string,
            createSchema: T,
            updateSchema: z.ZodObject<z.ZodRawShape> = createSchema.partial(),
            relatedModels: Array<{ model: keyof typeof prisma; field: string }> = [],
            orderBy?: Record<string, 'asc' | 'desc'>
        ) {
            const model = prisma[modelName] as unknown as ModelWithCRUD;

            async function getAll() {
                const session = await auth();
                if (!session) throw new Error('Unauthorized');
                try {
                    return await model.findMany({
                        orderBy: orderBy || { [idField]: 'asc' },
                    });
                } catch (error) {
                    console.error(`Error fetching ${String(modelName)}:`, error);
                    throw new Error(`Failed to fetch ${String(modelName)}`);
                }
            }

            async function create(data: z.infer<T>) {
                const session = await auth();
                if (!session) throw new Error('Unauthorized');
                try {
                    const validatedData = createSchema.parse(data);
                    const existingItem = await checkEntityExists(model, idField, validatedData[idField]);
                    if (existingItem) throw new Error(`${String(modelName)} with this ID already exists`);
                    return await model.create({ data: validatedData });
                } catch (error) {
                    console.error(`Error creating ${String(modelName)}:`, error);
                    if (error instanceof z.ZodError) throw new Error(`Validation error: ${error.message}`);
                    throw error;
                }
            }

            async function getById(id: string) {
                const session = await auth();
                if (!session) throw new Error('Unauthorized');
                try {
                    const item = await checkEntityExists(model, idField, id);
                    if (!item) throw new Error(`${String(modelName)} not found`);
                    return item;
                } catch (error) {
                    console.error(`Error fetching ${String(modelName)} by ID:`, error);
                    throw error;
                }
            }

            async function update(id: string, data: z.infer<typeof updateSchema>) {
                const session = await auth();
                if (!session) throw new Error('Unauthorized');
                try {
                    const validatedData = updateSchema.parse(data);
                    const existingItem = await checkEntityExists(model, idField, id);
                    if (!existingItem) throw new Error(`${String(modelName)} not found`);
                    return await model.update({
                        where: { [idField]: id },
                        data: validatedData,
                    });
                } catch (error) {
                    console.error(`Error updating ${String(modelName)}:`, error);
                    if (error instanceof z.ZodError) throw new Error(`Validation error: ${error.message}`);
                    throw error;
                }
            }

            async function remove(id: string) {
                const session = await auth();
                if (!session) throw new Error('Unauthorized');
                try {
                    const existingItem = await checkEntityExists(model, idField, id);
                    if (!existingItem) throw new Error(`${String(modelName)} not found`);
                    for (const related of relatedModels) {
                        const relatedModel = prisma[related.model] as unknown as ModelWithCRUD;
                        const count = await checkRelatedRecords(relatedModel, related.field, id);
                        if (count > 0) throw new Error(`Cannot delete ${String(modelName)} with associated ${String(related.model)}`);
                    }
                    await model.delete({ where: { [idField]: id } });
                    return { success: true };
                } catch (error) {
                    console.error(`Error deleting ${String(modelName)}:`, error);
                    throw error;
                }
            }

            return { getAll, create, getById, update, remove };
        }