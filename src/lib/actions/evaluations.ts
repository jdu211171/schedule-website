'use server';

import { evaluationCreateSchema, evaluationUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'teachers' as keyof typeof prisma, field: 'evaluation_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'evaluations',
    'evaluation_id',
    evaluationCreateSchema,
    evaluationUpdateSchema,
    relatedModels
);

export async function getEvaluations() {
    return getAll();
}

export async function createEvaluation(data: { name: string; notes?: string | null | undefined; score?: number | null | undefined; }) {
    return create(data);
}

export async function getEvaluationById(id: string) {
    return getById(id);
}

export async function updateEvaluation(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteEvaluation(id: string) {
    return remove(id);
}
