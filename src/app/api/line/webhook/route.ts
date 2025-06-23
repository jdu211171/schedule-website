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

    console.log('LINE webhook received:', {
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

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      console.error('Invalid LINE webhook signature');
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

    console.log(`Processing ${data.events.length} LINE webhook events`);

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
          try {
            await sendLineReply(
              replyToken,
              'このLINEアカウントは既に別のアカウントにリンクされています。'
            );
          } catch (replyError) {
            console.error('Error sending reply:', replyError);
          }
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

        try {
          await sendLineReply(
            replyToken,
            `✅ LINEアカウントが正常にリンクされました！\n生徒名: ${student.name}\n\n授業の通知をこちらのLINEアカウントにお送りします。`
          );
        } catch (replyError) {
          console.error('Error sending success reply for student:', replyError);
        }
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
          try {
            await sendLineReply(
              replyToken,
              'このLINEアカウントは既に別のアカウントにリンクされています。'
            );
          } catch (replyError) {
            console.error('Error sending reply:', replyError);
          }
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

        try {
          await sendLineReply(
            replyToken,
            `✅ LINEアカウントが正常にリンクされました！\n講師名: ${teacher.name}\n\n授業の通知をこちらのLINEアカウントにお送りします。`
          );
        } catch (replyError) {
          console.error('Error sending success reply for teacher:', replyError);
        }
        continue;
      }

      // Invalid linking code
      try {
        await sendLineReply(
          replyToken,
          '❌ 無効なリンクコードです。\n\n正しいリンクコードを入力するか、システム管理者にお問い合わせください。'
        );
      } catch (replyError) {
        console.error('Error sending invalid code reply:', replyError);
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