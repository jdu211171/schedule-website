// src/app/api/admin/masterdata/class-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classTypeFilterSchema } from "@/schemas/class-type.schema";
import { Prisma, ClassType } from "@prisma/client";

type ClassTypeWithRelations = ClassType & {
  parent?: ClassType | null;
  children?: ClassType[];
};

type FormattedClassType = {
  classTypeId: string;
  name: string;
  notes: string | null;
  parentId: string | null;
  order: number | null;
  color: string | null;
  visibleInFilters: boolean;
  parent?: FormattedClassType | null;
  children?: FormattedClassType[];
  createdAt: Date;
  updatedAt: Date;
};

const formatClassType = (classType: ClassTypeWithRelations): FormattedClassType => ({
  classTypeId: classType.classTypeId,
  name: classType.name,
  notes: classType.notes,
  parentId: classType.parentId,
  order: classType.order,
  color: (classType as any).color ?? null,
  visibleInFilters: Boolean((classType as any).visibleInFilters ?? true),
  parent: classType.parent ? formatClassType(classType.parent) : undefined,
  children: classType.children?.map(formatClassType),
  createdAt: classType.createdAt,
  updatedAt: classType.updatedAt,
});

// Admin-only endpoint to list ALL class types (ignores visibleInFilters)
export const GET = withRole(["ADMIN"], async (request: NextRequest) => {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const parsed = classTypeFilterSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "フィルターパラメータが無効です" }, { status: 400 });
  }

  const { page, limit, name, parentId, includeChildren, includeParent, sortBy, sortOrder } = parsed.data;

  const where: any = {};
  if (name) where.name = { contains: name, mode: "insensitive" };
  if (parentId !== undefined) where.parentId = parentId;

  const include: any = {};
  if (includeParent) include.parent = true;
  if (includeChildren) include.children = { orderBy: { name: "asc" } };

  const orderBy: Prisma.ClassTypeOrderByWithRelationInput[] = [];
  if (sortBy === "order") {
    orderBy.push({ order: { sort: sortOrder, nulls: "last" } });
    orderBy.push({ name: "asc" });
  } else {
    orderBy.push({ [sortBy]: sortOrder } as any);
  }

  const skip = (page - 1) * limit;
  const total = await prisma.classType.count({ where });
  const classTypes = await prisma.classType.findMany({ where, include, skip, take: limit, orderBy });
  const formatted = classTypes.map(formatClassType);

  return NextResponse.json({
    data: formatted,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

