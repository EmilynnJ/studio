import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize the Firebase Admin app once per server process.
function getAdminApp(): App | null {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    return null;
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(key);
  } catch {
    try {
      serviceAccount = JSON.parse(Buffer.from(key, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }

  try {
    return initializeApp({ credential: cert(serviceAccount as never) });
  } catch {
    return null;
  }
}

// Guard for admin-only API routes. Returns a NextResponse to send when the
// caller is not an authenticated admin, or null when the request may proceed.
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const app = getAdminApp();
  if (!app) {
    return NextResponse.json(
      { error: 'Admin authentication is not configured' },
      { status: 503 }
    );
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    const tokenRole = typeof decoded.role === 'string' ? decoded.role : '';
    if (tokenRole.toLowerCase() === 'admin') {
      return null;
    }

    const snapshot = await getFirestore(app).collection('users').doc(decoded.uid).get();
    const storedRole = snapshot.exists ? String((snapshot.data() as { role?: unknown })?.role ?? '') : '';
    if (storedRole.toLowerCase() === 'admin') {
      return null;
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
