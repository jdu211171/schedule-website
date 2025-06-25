import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getDefaultTemplates } from "@/lib/line/message-templates";

const templateSchema = z.object({
  id: z.string().optional(), // Allow optional id for frontend tracking
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  templateType: z.enum(["before_class", "after_class", "custom"]),
  timingType: z.enum(["minutes", "hours", "days"]),
  timingValue: z.number().min(1).max(999),
  content: z.string().min(1),
  variables: z.array(z.string()),
  isActive: z.boolean(),
});

// GET /api/settings/line/templates
export const GET = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const branchId = req.headers.get("X-Selected-Branch");
    
    // Get templates for the branch or global templates
    const templates = await prisma.lineMessageTemplate.findMany({
      where: {
        OR: [
          { branchId: null }, // Global templates
          ...(branchId ? [{ branchId }] : []) // Branch-specific templates
        ]
      },
      orderBy: [
        { templateType: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // If no templates exist, return default templates
    if (templates.length === 0) {
      const defaultTemplates = getDefaultTemplates();
      return NextResponse.json({
        data: defaultTemplates.map((template) => ({
          ...template,
          branchId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      });
    }

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error fetching LINE templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch LINE templates" },
      { status: 500 }
    );
  }
});

// POST /api/settings/line/templates
export const POST = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const templates = z.array(templateSchema).parse(body.templates);
    const branchId = req.headers.get("X-Selected-Branch");
    
    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing templates for this branch
      await tx.lineMessageTemplate.deleteMany({
        where: {
          branchId: branchId || null
        }
      });
      
      // Create new templates (remove id field if it exists)
      const createdTemplates = await tx.lineMessageTemplate.createMany({
        data: templates.map(template => {
          const { id, ...templateData } = template as any;
          return {
            ...templateData,
            branchId: branchId || null,
            variables: template.variables || []
          };
        })
      });
      
      // Fetch and return the created templates
      const newTemplates = await tx.lineMessageTemplate.findMany({
        where: {
          branchId: branchId || null
        },
        orderBy: [
          { templateType: 'asc' },
          { createdAt: 'asc' }
        ]
      });
      
      return { newTemplates, createdCount: createdTemplates.count };
    });
    
    return NextResponse.json({ 
      data: result.newTemplates,
      created: result.createdCount 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid template data", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating LINE templates:", error);
    return NextResponse.json(
      { 
        error: "Failed to create LINE templates",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});