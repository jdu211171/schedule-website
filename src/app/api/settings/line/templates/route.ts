import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getDefaultTemplates } from "@/lib/line/message-templates";

const templateSchema = z.object({
  id: z.string().optional(), // Allow optional id for frontend tracking
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  templateType: z.enum(["before_class"]),
  timingType: z.literal("days"), // Only allow days-based timing
  timingValue: z.number().min(0).max(999), // Allow 0 for same-day notifications
  timingHour: z.number().min(0).max(23), // Required hour for notification time
  content: z.string().min(1),
  variables: z.array(z.string()),
  classListItemTemplate: z.string().optional(), // Template for each class item
  classListSummaryTemplate: z.string().optional(), // Template for summary line
  isActive: z.boolean(),
});

// GET /api/settings/line/templates
export const GET = withRole(["ADMIN"], async (req: NextRequest) => {
  try {
    const branchId = req.headers.get("X-Selected-Branch");
    
    // Get the SINGLE active template for the branch
    const template = await prisma.lineMessageTemplate.findFirst({
      where: {
        branchId: branchId || null,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // If no template exists, return a single default template
    if (!template) {
      const defaultTemplates = getDefaultTemplates();
      // Return only the first default template to enforce single template
      const singleDefault = defaultTemplates[0] || {
        id: 'default-1',
        name: '授業通知',
        description: '授業の通知を送信します',
        templateType: 'before_class' as const,
        timingType: 'days' as const,
        timingValue: 1,
        timingHour: 9,
        content: `明日の授業予定

{{dailyClassList}}

よろしくお願いいたします。`,
        variables: ['dailyClassList'],
        classListItemTemplate: null,
        classListSummaryTemplate: null,
        isActive: true,
      };
      
      return NextResponse.json({
        data: [{
          ...singleDefault,
          branchId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });
    }

    return NextResponse.json({ data: [template] });
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
    
    // SINGLE NOTIFICATION ENFORCEMENT: Only allow one active template
    if (templates.length > 1) {
      return NextResponse.json(
        { error: "Only one notification template is allowed per branch" },
        { status: 400 }
      );
    }
    
    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete ALL existing templates for this branch (enforcing single template)
      await tx.lineMessageTemplate.deleteMany({
        where: {
          branchId: branchId || null
        }
      });
      
      // Create the single template
      if (templates.length === 1) {
        const template = templates[0];
        const { id, ...templateData } = template;
        
        const createdTemplate = await tx.lineMessageTemplate.create({
          data: {
            ...templateData,
            branchId: branchId || null,
            variables: template.variables || [],
            classListItemTemplate: template.classListItemTemplate || null,
            classListSummaryTemplate: template.classListSummaryTemplate || null,
            // Ensure it's always active since it's the only one
            isActive: true
          }
        });
        
        return { newTemplates: [createdTemplate], createdCount: 1 };
      }
      
      return { newTemplates: [], createdCount: 0 };
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