function text(name) {
  return String(process.env[name] || '').trim();
}

export function getGoogleAuthPublicConfig() {
  const firebase = {
    apiKey: text('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: text('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: text('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: text('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: text('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: text('NEXT_PUBLIC_FIREBASE_APP_ID'),
  };
  const googleWebClientId = text('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  const configured = Boolean(firebase.apiKey && firebase.projectId && googleWebClientId);
  return { configured, firebase, googleWebClientId };
}
