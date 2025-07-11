import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { testChannelCredentials } from '@/lib/line-multi-channel';
import { z } from 'zod';

const testCredentialsSchema = z.object({
  channelAccessToken: z.string().min(1),
  channelSecret: z.string().min(1),
});

// POST /api/admin/line-channels/test - Test LINE channel credentials
export const POST = withRole(['ADMIN'], async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = testCredentialsSchema.parse(body);

    // Test credentials
    const testResult = await testChannelCredentials({
      channelAccessToken: validatedData.channelAccessToken,
      channelSecret: validatedData.channelSecret,
    });

    if (!testResult.success) {
      return NextResponse.json(
        { 
          success: false,
          message: testResult.error || 'Invalid credentials',
          details: testResult
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials are valid',
      details: {
        botInfo: testResult.botInfo
      }
    });
  } catch (error) {
    console.error('Error testing LINE credentials:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to test credentials',
        details: error
      },
      { status: 500 }
    );
  }
});