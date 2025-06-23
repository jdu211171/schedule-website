import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  verifySignature, 
  sendLineReply, 
  LineWebhookBody 
} from '@/lib/line';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature');

    // Verify webhook signature
    if (!signature || !verifySignature(body, signature)) {
      console.error('Invalid LINE webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const data: LineWebhookBody = JSON.parse(body);

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

      // Check if it's a linking code
      const linkingCode = text.trim().toUpperCase();

      // Try to find a student with this linking code
      const student = await prisma.student.findFirst({
        where: { linkingCode }
      });

      if (student) {
        // Check if this LINE ID is already linked to another account
        const existingStudent = await prisma.student.findFirst({
          where: { 
            lineId,
            NOT: { studentId: student.studentId }
          }
        });

        if (existingStudent) {
          await sendLineReply(
            replyToken,
            'このLINEアカウントは既に別のアカウントにリンクされています。'
          );
          continue;
        }

        // Link the LINE account
        await prisma.student.update({
          where: { studentId: student.studentId },
          data: { 
            lineId,
            linkingCode: null // Clear the linking code after use
          }
        });

        await sendLineReply(
          replyToken,
          `✅ LINEアカウントが正常にリンクされました！\n生徒名: ${student.name}\n\n授業の通知をこちらのLINEアカウントにお送りします。`
        );
        continue;
      }

      // Try to find a teacher with this linking code
      const teacher = await prisma.teacher.findFirst({
        where: { linkingCode }
      });

      if (teacher) {
        // Check if this LINE ID is already linked to another account
        const existingTeacher = await prisma.teacher.findFirst({
          where: { 
            lineId,
            NOT: { teacherId: teacher.teacherId }
          }
        });

        if (existingTeacher) {
          await sendLineReply(
            replyToken,
            'このLINEアカウントは既に別のアカウントにリンクされています。'
          );
          continue;
        }

        // Link the LINE account
        await prisma.teacher.update({
          where: { teacherId: teacher.teacherId },
          data: { 
            lineId,
            linkingCode: null // Clear the linking code after use
          }
        });

        await sendLineReply(
          replyToken,
          `✅ LINEアカウントが正常にリンクされました！\n講師名: ${teacher.name}\n\n授業の通知をこちらのLINEアカウントにお送りします。`
        );
        continue;
      }

      // Invalid linking code
      await sendLineReply(
        replyToken,
        '❌ 無効なリンクコードです。\n\n正しいリンクコードを入力するか、システム管理者にお問い合わせください。'
      );
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing LINE webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}