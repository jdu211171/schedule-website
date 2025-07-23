import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification/notification-service';
import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { replaceTemplateVariables, DEFAULT_CLASS_LIST_ITEM_TEMPLATE, DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE } from '@/lib/line/message-templates';
import { withRole } from '@/lib/auth';

const TIMEZONE = 'Asia/Tokyo';

async function processNotifications(skipTimeCheck: boolean = false) {
  const now = new Date();
  const nowJST = toZonedTime(now, TIMEZONE);

  // Enhanced logging for debugging
  console.log('=== NOTIFICATION PROCESSING STARTED ===');
  console.log('Current time (JST):', format(nowJST, 'yyyy-MM-dd HH:mm:ss'));
  console.log('Skip time check:', skipTimeCheck);
  console.log('Current hour:', nowJST.getHours());

  // Get all active LINE message templates (currently global-only)
  console.log('\n--- Fetching Active Templates ---');
  const activeTemplates = await prisma.lineMessageTemplate.findMany({
    where: {
      templateType: 'before_class',
      isActive: true,
      // Templates are currently global-only as per recent changes
      branchId: null
    },
    select: {
      id: true,
      name: true,
      timingType: true,
      timingValue: true,
      timingHour: true,
      branchId: true,
      content: true,
      classListItemTemplate: true,
      classListSummaryTemplate: true,
      branch: {
        select: {
          name: true
        }
      }
    }
  });

  console.log(`Found ${activeTemplates.length} active templates`);
  activeTemplates.forEach(template => {
    console.log(`- Template: ${template.name} (ID: ${template.id})`);
    console.log(`  Timing: ${template.timingValue} days before at ${template.timingHour}:00`);
    console.log(`  Branch: ${template.branchId || 'Global'}`);
  });

  let totalNotificationsSent = 0;
  const errors: string[] = [];

  // Process each template
  for (const template of activeTemplates) {
    try {
      // Calculate target date for notifications first
      const targetDate = format(addDays(nowJST, template.timingValue), 'yyyy-MM-dd');
      
      // Check if notifications for this target date have already been queued today
      // This prevents duplicate queueing regardless of current time
      const todayStart = new Date(nowJST);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(nowJST);
      todayEnd.setHours(23, 59, 59, 999);

      // CATCH-UP LOGIC:
      // If the scheduled time has already passed today, but we haven't queued yet,
      // we should still queue the notification.
      const shouldSend = nowJST.getHours() >= template.timingHour;

      if (!skipTimeCheck && !shouldSend) {
        console.log(`⏰ Waiting for scheduled hour: ${template.timingHour}:00. Current hour: ${nowJST.getHours()}`);
        continue; // Skip if it's not time yet
      }

      // Check if notifications for this target date have already been queued or sent today
      // This prevents duplicate queueing if the cron runs multiple times.
      const alreadyProcessed = await prisma.notification.findFirst({
        where: {
          targetDate: new Date(targetDate + 'T00:00:00.000Z'),
          notificationType: {
            contains: template.timingValue === 0 ? 'SAMEDAY' :
                      template.timingValue === 1 ? '24H' :
                      `${template.timingValue}D`
          },
          // Check if created today OR already sent
          OR: [
            {
              createdAt: {
                gte: todayStart,
                lte: todayEnd
              }
            },
            { status: 'SENT' }
          ]
        }
      });

      if (!skipTimeCheck && alreadyProcessed) {
        console.log(`✅ Already processed today for ${template.name} (target: ${targetDate})`);
        continue;
      }

      console.log(`\n🔄 Processing template: ${template.name}`);
      console.log(`  Days before: ${template.timingValue}`);
      console.log(`  Target date for classes: ${targetDate}`);
      console.log(`  Template ID: ${template.id}`);

      // Efficiently find recipients who have classes on the target date
      // This avoids fetching all sessions and then filtering in memory
      const targetDateFilter = new Date(targetDate + 'T00:00:00.000Z');

      // Query teachers who have classes on the target date
      const teachersWithClasses = await prisma.teacher.findMany({
        where: {
          lineNotificationsEnabled: true,
          lineId: { not: null },
          classSessions: {
            some: {
              date: targetDateFilter
            }
          }
        },
        select: {
          teacherId: true,
          name: true,
          lineId: true,
          classSessions: {
            where: { date: targetDateFilter },
            orderBy: { startTime: 'asc' },
            include: {
              student: {
                select: {
                  studentId: true,
                  name: true
                }
              },
              studentClassEnrollments: {
                include: {
                  student: {
                    select: {
                      studentId: true,
                      name: true
                    }
                  }
                }
              },
              subject: {
                select: {
                  name: true
                }
              },
              booth: {
                select: {
                  name: true
                }
              },
              branch: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Query students who have direct classes (one-on-one) on the target date
      const studentsWithDirectClasses = await prisma.student.findMany({
        where: {
          lineNotificationsEnabled: true,
          lineId: { not: null },
          classSessions: {
            some: {
              date: targetDateFilter
            }
          }
        },
        select: {
          studentId: true,
          name: true,
          lineId: true,
          classSessions: {
            where: { date: targetDateFilter },
            orderBy: { startTime: 'asc' },
            include: {
              teacher: {
                select: {
                  teacherId: true,
                  name: true
                }
              },
              subject: {
                select: {
                  name: true
                }
              },
              booth: {
                select: {
                  name: true
                }
              },
              branch: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Query students who have enrolled classes (group sessions) on the target date
      const studentsWithEnrolledClasses = await prisma.student.findMany({
        where: {
          lineNotificationsEnabled: true,
          lineId: { not: null },
          studentClassEnrollments: {
            some: {
              classSession: {
                date: targetDateFilter
              }
            }
          }
        },
        select: {
          studentId: true,
          name: true,
          lineId: true,
          studentClassEnrollments: {
            where: {
              classSession: {
                date: targetDateFilter
              }
            },
            include: {
              classSession: {
                include: {
                  teacher: {
                    select: {
                      teacherId: true,
                      name: true
                    }
                  },
                  student: {
                    select: {
                      studentId: true,
                      name: true
                    }
                  },
                  subject: {
                    select: {
                      name: true
                    }
                  },
                  booth: {
                    select: {
                      name: true
                    }
                  },
                  branch: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Build recipient sessions map from the efficient queries
      const recipientSessions = new Map<string, {
        recipientType: 'TEACHER' | 'STUDENT';
        recipientId: string;
        lineId: string;
        name: string;
        sessions: any[];
      }>();

      // Add teachers and their sessions
      for (const teacher of teachersWithClasses) {
        if (teacher.lineId) {
          recipientSessions.set(`teacher-${teacher.teacherId}`, {
            recipientType: 'TEACHER',
            recipientId: teacher.teacherId,
            lineId: teacher.lineId,
            name: teacher.name,
            sessions: teacher.classSessions
          });
        }
      }

      // Add students with direct classes
      for (const student of studentsWithDirectClasses) {
        if (student.lineId) {
          const key = `student-${student.studentId}`;
          if (!recipientSessions.has(key)) {
            recipientSessions.set(key, {
              recipientType: 'STUDENT',
              recipientId: student.studentId,
              lineId: student.lineId,
              name: student.name,
              sessions: []
            });
          }
          recipientSessions.get(key)!.sessions.push(...student.classSessions);
        }
      }

      // Add students with enrolled classes
      for (const student of studentsWithEnrolledClasses) {
        if (student.lineId) {
          const key = `student-${student.studentId}`;
          if (!recipientSessions.has(key)) {
            recipientSessions.set(key, {
              recipientType: 'STUDENT',
              recipientId: student.studentId,
              lineId: student.lineId,
              name: student.name,
              sessions: []
            });
          }
          // Add enrolled class sessions
          for (const enrollment of student.studentClassEnrollments) {
            recipientSessions.get(key)!.sessions.push(enrollment.classSession);
          }
        }
      }

      // Calculate total sessions for logging
      const totalSessions = recipientSessions.size > 0 
        ? Array.from(recipientSessions.values()).reduce((sum, recipient) => sum + recipient.sessions.length, 0)
        : 0;

      console.log(`\n📅 Found ${totalSessions} sessions for date ${targetDate} across ${recipientSessions.size} recipients`);
      if (recipientSessions.size === 0) {
        console.log('  ⚠️ No recipients with sessions found - skipping this template');
        continue;
      }

      // Log sessions by branch for debugging
      const branchCounts: Record<string, number> = {};
      for (const recipient of recipientSessions.values()) {
        for (const session of recipient.sessions) {
          const branchName = session.branch?.name || 'Unknown';
          branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
        }
      }
      console.log('  Sessions by branch:');
      Object.entries(branchCounts).forEach(([branch, count]) => {
        console.log(`    - ${branch}: ${count} sessions`);
      });

      console.log(`\n👥 Grouped sessions for ${recipientSessions.size} unique recipients`);
      
      // Log recipient details for debugging
      let recipientsWithLineId = 0;
      let recipientsWithoutLineId = 0;
      
      for (const [key, recipient] of recipientSessions) {
        if (recipient.lineId) {
          recipientsWithLineId++;
        } else {
          recipientsWithoutLineId++;
        }
        console.log(`  - ${key}: ${recipient.name}`);
        console.log(`    Classes: ${recipient.sessions.length}, LINE ID: ${recipient.lineId ? '✓' : '✗'}`);
      }
      
      console.log(`\n📊 Recipient Summary:`);
      console.log(`  With LINE ID: ${recipientsWithLineId}`);
      console.log(`  Without LINE ID: ${recipientsWithoutLineId}`);

      // Send one notification per recipient with all their classes
      for (const [, recipient] of recipientSessions) {
        try {
          // Build the daily class list using templates
          const itemTemplate = template.classListItemTemplate || DEFAULT_CLASS_LIST_ITEM_TEMPLATE;
          const summaryTemplate = template.classListSummaryTemplate || DEFAULT_CLASS_LIST_SUMMARY_TEMPLATE;
          
          let dailyClassList = '';
          recipient.sessions.forEach((session, index) => {
            const startTime = format(new Date(session.startTime), 'HH:mm');
            const endTime = format(new Date(session.endTime), 'HH:mm');
            
            // Calculate duration in minutes
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            const duration = `${durationMinutes}分`;

            // Gather student information
            const studentNames: string[] = [];
            
            // Add direct student (1-on-1 sessions)
            if (session.student) {
              studentNames.push(session.student.name);
            }
            
            // Add enrolled students (group sessions)
            if (session.studentClassEnrollments) {
              session.studentClassEnrollments.forEach((enrollment: any) => {
                studentNames.push(enrollment.student.name);
              });
            }
            
            // Determine class type
            const studentCount = studentNames.length;
            const classType = studentCount <= 1 ? '1対1' : 'グループ';
            
            // Replace variables in the item template
            const classItemVariables: Record<string, string> = {
              classNumber: String(index + 1),
              subjectName: session.subject?.name || '授業',
              startTime,
              endTime,
              teacherName: session.teacher?.name || '未定',
              boothName: session.booth?.name || '未定',
              duration,
              studentName: studentNames[0] || '未定',
              studentNames: studentNames.join('、') || '未定',
              studentCount: String(studentCount),
              classType
            };
            
            const formattedItem = replaceTemplateVariables(itemTemplate, classItemVariables);
            dailyClassList += formattedItem;
            
            if (index < recipient.sessions.length - 1) {
              dailyClassList += '\n\n';
            }
          });

          // Add summary using the summary template
          if (summaryTemplate && recipient.sessions.length > 0) {
            // Calculate summary variables first
            const firstSession = recipient.sessions[0];
            const lastSession = recipient.sessions[recipient.sessions.length - 1];
            const firstClassTime = firstSession ? format(new Date(firstSession.startTime), 'HH:mm') : '';
            const lastClassTime = lastSession ? format(new Date(lastSession.endTime), 'HH:mm') : '';
            
            const summaryVariables: Record<string, string> = {
              classCount: String(recipient.sessions.length),
              firstClassTime,
              lastClassTime
            };
            
            dailyClassList += '\n\n' + replaceTemplateVariables(summaryTemplate, summaryVariables);
          }

          // Calculate additional variables
          const firstSession = recipient.sessions[0];
          const lastSession = recipient.sessions[recipient.sessions.length - 1];
          const firstClassTime = firstSession ? format(new Date(firstSession.startTime), 'HH:mm') : '';
          const lastClassTime = lastSession ? format(new Date(lastSession.endTime), 'HH:mm') : '';

          // Calculate total duration in hours
          let totalMinutes = 0;
          recipient.sessions.forEach(session => {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
          });
          const totalHours = totalMinutes / 60;
          const totalDuration = totalHours % 1 === 0 ? `${totalHours}時間` : `${totalHours.toFixed(1)}時間`;

          // Extract unique teacher names
          const teacherNames = [...new Set(recipient.sessions
            .map(s => s.teacher?.name)
            .filter(Boolean)
          )].join('、');

          // Extract unique subject names
          const subjectNames = [...new Set(recipient.sessions
            .map(s => s.subject?.name)
            .filter(Boolean)
          )].join('、');

          // Prepare variables for template replacement
          const templateVariables: Record<string, string> = {
            dailyClassList,
            recipientName: recipient.name,
            recipientType: recipient.recipientType === 'TEACHER' ? '講師' : '生徒',
            classDate: format(new Date(targetDate), 'yyyy年M月d日'),
            currentDate: format(nowJST, 'yyyy年M月d日'),
            classCount: String(recipient.sessions.length),
            firstClassTime,
            lastClassTime,
            totalDuration,
            teacherNames: teacherNames || '未定',
            subjectNames: subjectNames || '未定',
            branchName: template.branch?.name || ''
          };

          // Replace variables in template content
          const message = replaceTemplateVariables(template.content, templateVariables);

          // Check for duplicate notification before sending LINE message
          const notificationType = template.timingValue === 0 ? 'DAILY_SUMMARY_SAMEDAY' :
                                 template.timingValue === 1 ? 'DAILY_SUMMARY_24H' :
                                 `DAILY_SUMMARY_${template.timingValue}D`;
          
          // Calculate when this notification should be sent
          // For "X days before at Y hour" template:
          // - Target date: classes happening in X days from now
          // - Scheduled send time: today at Y hour (since we're X days before target)
          // BUT: If skipTimeCheck is true (manual trigger), send immediately
          const scheduledSendTime = new Date(nowJST);
          
          if (skipTimeCheck) {
            // Manual trigger: Send immediately
            // Keep current time (don't change hours)
          } else {
            // Cron trigger: Send at scheduled hour
            scheduledSendTime.setHours(template.timingHour ?? 9, 0, 0, 0);
          }
          
          console.log(`\n📨 Creating notification for ${recipient.name}`);
          console.log(`  Type: ${recipient.recipientType}`);
          console.log(`  Notification type: ${notificationType}`);
          console.log(`  Target date: ${targetDate}`);
          console.log(`  Scheduled send time: ${format(scheduledSendTime, 'yyyy-MM-dd HH:mm:ss')}${skipTimeCheck ? ' (IMMEDIATE)' : ''}`);
          console.log(`  LINE ID: ${recipient.lineId}`);
          console.log(`  Classes: ${recipient.sessions.length}`);
          
          const notification = await createNotification({
            recipientType: recipient.recipientType,
            recipientId: recipient.recipientId,
            notificationType,
            message,
            relatedClassId: recipient.sessions.length > 0 ? recipient.sessions.map(s => s.classId).join(',') : undefined, // Store all class IDs
            branchId: template.branchId || undefined,
            sentVia: 'LINE',
            scheduledAt: scheduledSendTime, // When the notification should be sent
            targetDate: new Date(targetDate + 'T00:00:00.000Z'), // The date of the classes being notified about
          });

          if (notification) {
            // Notification successfully queued for worker processing
            console.log(`  ✅ QUEUED: Notification ${notification.notificationId} queued for ${recipient.name}`);
            console.log(`    Will be sent at: ${format(scheduledSendTime, 'yyyy-MM-dd HH:mm:ss')}`);
            totalNotificationsSent++; // Count queued notifications
          } else {
            console.log(`  🔄 DUPLICATE: Already queued for ${recipient.name} on ${targetDate}`);
          }
        } catch (error) {
          const errorMsg = `Error for ${recipient.name}: ${error}`;
          console.error(`  ❌ ERROR: ${errorMsg}`);
          if (error instanceof Error && 'response' in error) {
            const lineError = error as Error & { response?: { data?: unknown } };
            console.error('  LINE API Response:', lineError.response?.data);
          }
          errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Error processing template ${template.name}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log('\n=== NOTIFICATION PROCESSING COMPLETED ===');
  console.log(`Total notifications queued: ${totalNotificationsSent}`);
  console.log(`Templates processed: ${activeTemplates.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log('ℹ️ Notifications will be sent by the worker when scheduled time arrives');
  
  return {
    notificationsQueued: totalNotificationsSent,
    templatesProcessed: activeTemplates.length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: format(nowJST, 'yyyy-MM-dd HH:mm:ss zzz')
  };
}

export async function GET(req: NextRequest) {
  try {
    // Log cron execution
    console.log('📬 Notification SEND cron triggered at:', new Date().toISOString());
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    // Verify the request is from Vercel Cron (temporarily relaxed for debugging)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if no CRON_SECRET is set (for debugging) or if auth matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Send cron authentication failed. Expected:', cronSecret ? 'Bearer [HIDDEN]' : 'No secret set');
      console.error('❌ Received:', authHeader || 'No auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Send cron authentication passed');

    const result = await processNotifications(false);
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in notification service:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint for testing - restricted to ADMIN users
export const POST = withRole(
  ['ADMIN'],
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const skipTimeCheck = body.skipTimeCheck ?? true; // Default to skipping time check for manual triggers

      console.log('Manual notification trigger requested by admin with skipTimeCheck:', skipTimeCheck);

      const result = await processNotifications(skipTimeCheck);
      
      return NextResponse.json({
        success: true,
        manual: true,
        ...result
      });
    } catch (error) {
      console.error('Error in manual notification trigger:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error },
        { status: 500 }
      );
    }
  }
);