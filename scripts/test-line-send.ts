import { sendLinePush, formatClassNotification } from '../src/lib/line';
import { format } from 'date-fns';

async function testLineSend() {
  try {
    // Test LINE IDs from the database
    const testLineId = 'yamada_taro_line'; // This is a test LINE ID from the seed data
    
    // Format a test notification
    const message = formatClassNotification(
      '24h',
      '数学',
      '14:00',
      '2025-06-25'
    );

    console.log('Attempting to send LINE message...');
    console.log('To:', testLineId);
    console.log('Message:', message);

    try {
      await sendLinePush(testLineId, message);
      console.log('Message sent successfully!');
    } catch (error: any) {
      console.error('Failed to send message:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error(error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testLineSend();