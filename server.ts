import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase client in Node for Firestore persistence
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Default initial payment method
const DEFAULT_BANK_METHOD = {
  id: 'bank_default',
  title: 'Bank Details',
  type: 'bank',
  bankName: 'Paga',
  accountNumber: '0469216912',
  accountOwnerName: 'Uthman',
  enabled: true,
  order: 1,
  updatedAt: new Date().toISOString(),
};

// Owner password - strictly stored on backend, never exposed in frontend JS/HTML
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '123123123123';

// Active owner tokens with expiration (4 hours)
interface OwnerSession {
  token: string;
  createdAt: number;
  expiresAt: number;
}
const activeOwnerSessions = new Map<string, OwnerSession>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeOwnerSessions.entries()) {
    if (session.expiresAt < now) {
      activeOwnerSessions.delete(token);
    }
  }
}

// Authentication middleware for owner operations
function requireOwnerAuth(req: Request, res: Response, next: NextFunction): void {
  cleanExpiredSessions();
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(403).json({ success: false, error: 'Unauthorized. Owner authorization token required.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const session = activeOwnerSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    res.status(403).json({ success: false, error: 'Session expired or invalid. Please authenticate again.' });
    return;
  }

  next();
}

// Ensure default payment method exists in Firestore database
async function ensureDefaultPaymentMethods() {
  try {
    const colRef = collection(db, 'payment_methods');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log('Seeding initial payment method into Firestore database...');
      await setDoc(doc(db, 'payment_methods', DEFAULT_BANK_METHOD.id), DEFAULT_BANK_METHOD);
      console.log('Initial payment method seeded successfully.');
    }
  } catch (err) {
    console.error('Error ensuring default payment methods in Firestore:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Ensure default data in Firestore
  await ensureDefaultPaymentMethods();

  // 1. Owner Login / Password verification API
  app.post('/api/owner/verify-password', (req: Request, res: Response) => {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Password is required' });
      return;
    }

    if (password.trim() === OWNER_PASSWORD) {
      cleanExpiredSessions();
      const token = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      activeOwnerSessions.set(token, {
        token,
        createdAt: now,
        expiresAt: now + 4 * 60 * 60 * 1000, // 4 hours
      });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect owner password. Access denied.' });
    }
  });

  // 2. Public / Owner Payment Methods Fetch API
  app.get('/api/payment-methods', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      let isOwner = false;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const session = activeOwnerSessions.get(token);
        if (session && session.expiresAt > Date.now()) {
          isOwner = true;
        }
      }

      const colRef = collection(db, 'payment_methods');
      const snap = await getDocs(colRef);
      const list: any[] = [];

      snap.forEach((d) => {
        const data = d.data();
        if (isOwner || data.enabled !== false) {
          list.push({ ...data, id: d.id });
        }
      });

      // If empty, return default method
      if (list.length === 0) {
        list.push(DEFAULT_BANK_METHOD);
      }

      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      res.json({ success: true, paymentMethods: list });
    } catch (err: any) {
      console.error('Error fetching payment methods from Firestore:', err);
      res.json({ success: true, paymentMethods: [DEFAULT_BANK_METHOD] });
    }
  });

  // 3. Owner Add / Update Payment Method
  app.post('/api/owner/payment-methods', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const method = req.body;
      if (!method || !method.id || !method.title) {
        res.status(400).json({ success: false, error: 'Payment method id and title are required.' });
        return;
      }

      const payload = {
        ...method,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'payment_methods', method.id), payload);
      res.json({ success: true, data: payload });
    } catch (err: any) {
      console.error('Error saving payment method to Firestore:', err);
      res.status(500).json({ success: false, error: 'Failed to save payment method to database.' });
    }
  });

  // 4. Owner Delete Payment Method
  app.delete('/api/owner/payment-methods/:id', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ success: false, error: 'Payment method ID required.' });
        return;
      }

      await deleteDoc(doc(db, 'payment_methods', id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting payment method from Firestore:', err);
      res.status(500).json({ success: false, error: 'Failed to delete payment method from database.' });
    }
  });

  // ==========================================
  // TEMPORARY INVITATION LINK SYSTEM (SECURE BACKEND)
  // ==========================================

  // In-memory cache for fast lookup and offline fallback
  const inMemoryInvitations = new Map<string, any>();

  function parseDurationToMs(durationStr: string): number {
    if (!durationStr || typeof durationStr !== 'string') return 24 * 60 * 60 * 1000;
    const s = durationStr.toLowerCase().trim();

    // Minutes
    const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
    if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60 * 1000);

    // Hours
    const hrMatch = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)$/);
    if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60 * 60 * 1000);

    // Days
    const dayMatch = s.match(/^(\d+(?:\.\d+)?)\s*(d|day|days)$/);
    if (dayMatch) return Math.round(parseFloat(dayMatch[1]) * 24 * 60 * 60 * 1000);

    // Weeks
    const wkMatch = s.match(/^(\d+(?:\.\d+)?)\s*(w|wk|wks|week|weeks)$/);
    if (wkMatch) return Math.round(parseFloat(wkMatch[1]) * 7 * 24 * 60 * 60 * 1000);

    // Months (30 days)
    const moMatch = s.match(/^(\d+(?:\.\d+)?)\s*(mo|month|months)$/);
    if (moMatch) return Math.round(parseFloat(moMatch[1]) * 30 * 24 * 60 * 60 * 1000);

    // Seconds
    const secMatch = s.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)$/);
    if (secMatch) return Math.round(parseFloat(secMatch[1]) * 1000);

    // Raw number fallback (interpret as hours)
    const numOnly = parseFloat(s);
    if (!isNaN(numOnly) && numOnly > 0) {
      return Math.round(numOnly * 60 * 60 * 1000);
    }

    return 24 * 60 * 60 * 1000;
  }

  function generateSecureInviteToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(16);
    let token = '';
    for (let i = 0; i < 16; i++) {
      token += chars[bytes[i] % chars.length];
    }
    return token;
  }

  // 1. Owner: Generate new temporary invitation link
  app.post('/api/owner/invitations', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const { duration } = req.body || {};
      const durationStr = typeof duration === 'string' && duration.trim() ? duration.trim() : '24 hours';
      const durationMs = parseDurationToMs(durationStr);
      const now = Date.now();
      const expiresAt = now + durationMs;
      const token = generateSecureInviteToken();

      const invitation = {
        token,
        durationStr,
        durationMs,
        createdAt: new Date(now).toISOString(),
        createdTimestamp: now,
        expiresAt,
        expiresAtIso: new Date(expiresAt).toISOString(),
        status: 'active',
        usedCount: 0,
        associatedUserEmail: null,
        lastAccessedAt: null,
      };

      inMemoryInvitations.set(token, invitation);

      try {
        await setDoc(doc(db, 'invitations', token), invitation);
      } catch (dbErr) {
        console.warn('Firestore setDoc warning for invitation:', dbErr);
      }

      res.json({ success: true, invitation });
    } catch (err: any) {
      console.error('Error generating invitation:', err);
      res.status(500).json({ success: false, error: 'Failed to generate invitation.' });
    }
  });

  // 2. Owner: Get all invitations
  app.get('/api/owner/invitations', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const list: any[] = [];
      const now = Date.now();

      try {
        const snap = await getDocs(collection(db, 'invitations'));
        snap.forEach((d) => {
          const data = d.data();
          // Check expiration in real time
          if (data.status === 'active' && data.expiresAt && data.expiresAt <= now) {
            data.status = 'expired';
            // update in background
            updateDoc(doc(db, 'invitations', d.id), { status: 'expired' }).catch(() => {});
          }
          list.push(data);
          inMemoryInvitations.set(data.token, data);
        });
      } catch (dbErr) {
        console.warn('Error reading invitations from Firestore, using in-memory fallback:', dbErr);
        for (const inv of inMemoryInvitations.values()) {
          if (inv.status === 'active' && inv.expiresAt && inv.expiresAt <= now) {
            inv.status = 'expired';
          }
          list.push(inv);
        }
      }

      list.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
      res.json({ success: true, invitations: list });
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch invitations.' });
    }
  });

  // 3. Owner: Revoke an invitation
  app.post('/api/owner/invitations/:token/revoke', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token) {
        res.status(400).json({ success: false, error: 'Token is required' });
        return;
      }

      if (inMemoryInvitations.has(token)) {
        const inv = inMemoryInvitations.get(token);
        inv.status = 'revoked';
        inMemoryInvitations.set(token, inv);
      }

      try {
        await updateDoc(doc(db, 'invitations', token), { status: 'revoked' });
      } catch (e) {
        console.warn('Firestore revoke warning:', e);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error revoking invitation:', err);
      res.status(500).json({ success: false, error: 'Failed to revoke invitation.' });
    }
  });

  // 4. Owner: Delete an invitation record
  app.delete('/api/owner/invitations/:token', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token) {
        res.status(400).json({ success: false, error: 'Token is required' });
        return;
      }

      inMemoryInvitations.delete(token);

      try {
        await deleteDoc(doc(db, 'invitations', token));
      } catch (e) {
        console.warn('Firestore delete invitation warning:', e);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting invitation:', err);
      res.status(500).json({ success: false, error: 'Failed to delete invitation.' });
    }
  });

  // 5. Public: Validate invitation token
  app.get('/api/invite/validate/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      if (!token) {
        res.status(400).json({ valid: false, error: 'Token is required' });
        return;
      }

      let invitation = inMemoryInvitations.get(token);

      if (!invitation) {
        try {
          const snap = await getDoc(doc(db, 'invitations', token));
          if (snap.exists()) {
            invitation = snap.data();
            inMemoryInvitations.set(token, invitation);
          }
        } catch (dbErr) {
          console.warn('Firestore getDoc error for invite token:', dbErr);
        }
      }

      if (!invitation) {
        res.status(404).json({ valid: false, status: 'not_found', error: 'Invitation link not found.' });
        return;
      }

      if (invitation.status === 'revoked') {
        res.json({ valid: false, status: 'revoked', error: 'This invitation has been revoked.' });
        return;
      }

      const now = Date.now();
      if (invitation.expiresAt && invitation.expiresAt <= now) {
        invitation.status = 'expired';
        inMemoryInvitations.set(token, invitation);
        try {
          await updateDoc(doc(db, 'invitations', token), { status: 'expired' });
        } catch {}
        res.json({ valid: false, status: 'expired', error: 'This invitation link has expired.', expiresAt: invitation.expiresAt });
        return;
      }

      // Valid and active!
      invitation.usedCount = (invitation.usedCount || 0) + 1;
      invitation.lastAccessedAt = new Date().toISOString();
      inMemoryInvitations.set(token, invitation);

      try {
        await updateDoc(doc(db, 'invitations', token), {
          usedCount: invitation.usedCount,
          lastAccessedAt: invitation.lastAccessedAt,
        });
      } catch {}

      res.json({
        valid: true,
        status: 'active',
        expiresAt: invitation.expiresAt,
        durationStr: invitation.durationStr,
      });
    } catch (err: any) {
      console.error('Error validating invitation:', err);
      res.status(500).json({ valid: false, error: 'Server error validating invitation.' });
    }
  });

  // 6. Public: Associate registered or logged-in user with invitation
  app.post('/api/invite/associate', async (req: Request, res: Response) => {
    try {
      const { token, email } = req.body || {};
      if (!token || !email) {
        res.status(400).json({ success: false });
        return;
      }

      if (inMemoryInvitations.has(token)) {
        const inv = inMemoryInvitations.get(token);
        inv.associatedUserEmail = email;
        inMemoryInvitations.set(token, inv);
      }

      try {
        await updateDoc(doc(db, 'invitations', token), {
          associatedUserEmail: email,
        });
      } catch {}

      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false });
    }
  });

  // 5. Mount Vite in development or serve static in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on 0.0.0.0:${PORT} (Production: ${isProd})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
