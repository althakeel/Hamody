import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from '@/lib/firebase-admin';

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

export async function sendAppPushBatch(tokens, message) {
  const list = [...new Set((tokens || []).map((token) => String(token || '').trim()).filter(Boolean))];
  if (!list.length) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  getAuth();
  const messaging = getMessaging();
  const data = {
    title: message.title,
    body: message.body,
    imageUrl: message.imageUrl || '',
    buttonText: message.buttonText || '',
    path: message.path || '/',
  };
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  for (let index = 0; index < list.length; index += 500) {
    const chunk = list.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: message.title,
        body: message.body,
        ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
      },
      data,
      android: {
        priority: 'high',
        notification: {
          ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: { aps: { mutableContent: true, sound: 'default' } },
        ...(message.imageUrl ? { fcmOptions: { imageUrl: message.imageUrl } } : {}),
      },
    });
    successCount += response.successCount || 0;
    failureCount += response.failureCount || 0;
    response.responses.forEach((item, itemIndex) => {
      if (item.success) return;
      if (INVALID_TOKEN_CODES.has(item.error?.code)) invalidTokens.push(chunk[itemIndex]);
    });
  }

  return { successCount, failureCount, invalidTokens };
}
