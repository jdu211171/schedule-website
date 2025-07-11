import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import {
  verifySignature,
  sendLineReply,
  LineWebhookBody,
  LineChannelCredentials
} from '@/lib/line-multi-channel';

export async function POST(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const { channelId } = params;
    const body = await req.text();
    const signature = req.headers.get('x-line-signature');

    console.log('LINE webhook received for channel:', channelId, {
      hasBody: !!body,
      bodyLength: body?.length,
      hasSignature: !!signature,
      signatureLength: signature?.length
    });

    // Check if signature is present
    if (!signature) {
      console.error('Missing x-line-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Get channel credentials
    const channel = await prisma.lineChannel.findUnique({
      where: { channelId }
    });

    if (!channel || !channel.isActive) {
      console.error('Channel not found or inactive:', channelId);
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const credentials: LineChannelCredentials = {
      channelAccessToken: decrypt(channel.channelAccessToken),
      channelSecret: decrypt(channel.channelSecret)
    };

    // Verify webhook signature
    if (!verifySignature(body, signature, credentials.channelSecret)) {
      console.error('Invalid LINE webhook signature for channel:', channelId);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle empty body (verification request)
    if (!body || body.trim() === '') {
      console.log('LINE webhook verification request received (empty body)');
      return NextResponse.json({}, { status: 200 });
    }

    // Parse the JSON body
    let data: LineWebhookBody;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      console.error('Error parsing LINE webhook body:', parseError);
      // For verification, LINE might send non-JSON data, so return 200 OK
      console.log('Returning 200 for non-JSON body (possible verification)');
      return NextResponse.json({}, { status: 200 });
    }

    // Handle verification or test requests with no events
    if (!data.events || data.events.length === 0) {
      console.log('LINE webhook received with no events (verification or test)');
      return NextResponse.json({}, { status: 200 });
    }

    // Get branches associated with this channel
    const channelBranches = await prisma.branchLineChannel.findMany({
      where: { channelId },
      select: { branchId: true }
    });
    const branchIds = channelBranches.map(cb => cb.branchId);

    console.log(`Processing ${data.events.length} LINE webhook events for channel ${channelId}`);

    // Process each event
    for (const event of data.events) {
      // Only process text messages
      if (event.type !== 'message' || event.message?.type !== 'text') {
        continue;
      }

      const text = event.message.text;
      const lineId = event.source.userId;
      const replyToken = event.replyToken;

      if (!text || !lineId || !replyToken) {
        continue;
      }

      // Check if message starts with "> " or "/cmd "
      const trimmedText = text.trim();
      if (!trimmedText.startsWith('> ') && !trimmedText.startsWith('/cmd ')) {
        // Ignore regular chat messages - no error response
        console.log(`Ignoring regular chat message: ${trimmedText.substring(0, 50)}...`);
        continue;
      }

      // Remove the prefix and get the actual identifier
      const identifier = trimmedText.startsWith('> ')
        ? trimmedText.substring(2).trim()
        : trimmedText.substring(5).trim(); // Remove "/cmd "

      // First try to find a user with this username
      let user = await prisma.user.findFirst({
        where: { 
          username: identifier,
          // If channel is associated with specific branches, limit to users in those branches
          ...(branchIds.length > 0 ? {
            branches: {
              some: {
                branchId: { in: branchIds }
              }
            }
          } : {})
        },
        include: {
          student: true,
          teacher: true,
          branches: true
        }
      });

      // If not found by username, try to find by LINE User ID
      if (!user) {
        const student = await prisma.student.findFirst({
          where: { 
            lineUserId: identifier,
            user: branchIds.length > 0 ? {
              branches: {
                some: {
                  branchId: { in: branchIds }
                }
              }
            } : undefined
          },
          include: {
            user: {
              include: {
                student: true,
                teacher: true,
                branches: true
              }
            }
          }
        });

        if (student) {
          user = student.user;
        } else {
          const teacher = await prisma.teacher.findFirst({
            where: { 
              lineUserId: identifier,
              user: branchIds.length > 0 ? {
                branches: {
                  some: {
                    branchId: { in: branchIds }
                  }
                }
              } : undefined
            },
            include: {
              user: {
                include: {
                  student: true,
                  teacher: true,
                  branches: true
                }
              }
            }
          });

          if (teacher) {
            user = teacher.user;
          }
        }
      }

      if (user) {
        // Check if user has a student or teacher profile
        if (user.student) {
          // Check if this LINE ID is already linked to another student account
          const existingStudent = await prisma.student.findFirst({
            where: {
              lineId,
              NOT: { studentId: user.student.studentId }
            }
          });

          if (existingStudent) {
            try {
              await sendLineReply(
                replyToken,
                'このLINEアカウントは既に別のアカウントにリンクされています。',
                credentials
              );
            } catch (replyError) {
              console.error('Error sending reply:', replyError);
            }
            continue;
          }

          // Link the LINE account to student
          await prisma.student.update({
            where: { studentId: user.student.studentId },
            data: {
              lineId,
              linkingCode: null // Clear any existing linking code
            }
          });

          // Get branch names for the message
          const userBranches = await prisma.userBranch.findMany({
            where: { userId: user.id },
            include: { branch: true }
          });
          const branchNames = userBranches.map(ub => ub.branch.name).join(', ');

          try {
            await sendLineReply(
              replyToken,
              `✅ LINEアカウントが正常にリンクされました！\n生徒名: ${user.student.name}\nユーザー名: ${user.username}\n所属: ${branchNames || 'なし'}\n\n授業の通知をこちらのLINEアカウントにお送りします。`,
              credentials
            );
          } catch (replyError) {
            console.error('Error sending success reply for student:', replyError);
          }
          continue;
        } else if (user.teacher) {
          // Check if this LINE ID is already linked to another teacher account
          const existingTeacher = await prisma.teacher.findFirst({
            where: {
              lineId,
              NOT: { teacherId: user.teacher.teacherId }
            }
          });

          if (existingTeacher) {
            try {
              await sendLineReply(
                replyToken,
                'このLINEアカウントは既に別のアカウントにリンクされています。',
                credentials
              );
            } catch (replyError) {
              console.error('Error sending reply:', replyError);
            }
            continue;
          }

          // Link the LINE account to teacher
          await prisma.teacher.update({
            where: { teacherId: user.teacher.teacherId },
            data: {
              lineId,
              linkingCode: null // Clear any existing linking code
            }
          });

          // Get branch names for the message
          const userBranches = await prisma.userBranch.findMany({
            where: { userId: user.id },
            include: { branch: true }
          });
          const branchNames = userBranches.map(ub => ub.branch.name).join(', ');

          try {
            await sendLineReply(
              replyToken,
              `✅ LINEアカウントが正常にリンクされました！\n講師名: ${user.teacher.name}\nユーザー名: ${user.username}\n所属: ${branchNames || 'なし'}\n\n授業の通知をこちらのLINEアカウントにお送りします。`,
              credentials
            );
          } catch (replyError) {
            console.error('Error sending success reply for teacher:', replyError);
          }
          continue;
        }
      }

      // Invalid username/LINE User ID or user has no student/teacher profile
      try {
        await sendLineReply(
          replyToken,
          '❌ 無効なユーザー名またはLINEユーザーIDです。\n\n正しいユーザー名またはLINEユーザーIDを入力するか、システム管理者にお問い合わせください。\n\n💡 ヒント: コマンドは "> " または "/cmd " で始めてください。',
          credentials
        );
      } catch (replyError) {
        console.error('Error sending invalid username reply:', replyError);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error processing LINE webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}