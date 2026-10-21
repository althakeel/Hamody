function headerValue(request, name) {
  return String(request?.headers?.get?.(name) || '').trim().toLowerCase();
}

export function readAppClientSource(request) {
  const client = headerValue(request, 'x-store1920-client') || headerValue(request, 'x-client');
  const platformHeader = headerValue(request, 'x-store1920-platform') || headerValue(request, 'x-platform');
  const userAgent = headerValue(request, 'user-agent');
  const saysApp = client === 'app' || client === 'mobile' || client === 'flutter';
  let platform = '';
  if (platformHeader === 'android' || platformHeader === 'ios') platform = platformHeader;
  else if (saysApp && userAgent.includes('android')) platform = 'android';
  else if (saysApp && /iphone|ipad|ios/.test(userAgent)) platform = 'ios';

  if (saysApp || platformHeader === 'android' || platformHeader === 'ios') {
    return {
      clientChannel: 'app',
      clientPlatform: platform || 'unknown',
    };
  }

  return {
    clientChannel: 'website',
    clientPlatform: 'web',
  };
}
