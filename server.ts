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
  runTransaction,
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

// Detect chat app / social preview bots (WhatsApp, Zoom, Telegram, Twitter, Discord, Slack, etc.)
// These crawlers fetch links automatically to generate rich link preview snippets.
// We must not consume the one-time token for an unfurl bot.
function isLinkPreviewBot(userAgent: string = ''): boolean {
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('facebookexternalhit') ||
    ua.includes('whatsapp') ||
    ua.includes('telegrambot') ||
    ua.includes('twitterbot') ||
    ua.includes('slackbot') ||
    ua.includes('linkedinbot') ||
    ua.includes('embedly') ||
    ua.includes('quora link preview') ||
    ua.includes('discordbot') ||
    ua.includes('google-structured-data-testing-tool') ||
    (ua.includes('zoom') && ua.includes('bot'))
  );
}

// Invalidate request: terminates with HTTP 404 without showing any message, body, or website
function sendReal404(res: Response) {
  res.status(404).set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  }).end();
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

  // Middleware guard: ensures that if any incoming request carries an invitation token
  // that is marked as 'used' in Firebase, the application triggers a hard 404 response immediately.
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    // If request contains query token or invite param
    const queryToken = ((req.query.token as string) || (req.query.invite as string))?.trim();
    if (queryToken && !req.originalUrl.startsWith('/api')) {
      try {
        const inviteSnap = await getDoc(doc(db, 'invitations', queryToken));
        if (
          !inviteSnap.exists() ||
          inviteSnap.data()?.used ||
          inviteSnap.data()?.status === 'used' ||
          inviteSnap.data()?.status === 'revoked'
        ) {
          // Hard 404 response: halt request immediately
          return sendReal404(res);
        }
      } catch {
        return sendReal404(res);
      }
    }
    next();
  });

  // Ensure default data in Firestore
  await ensureDefaultPaymentMethods();

  // 1. Owner Login / Password verification API
  app.post('/api/owner/verify-password', (req: Request, res: Response) => {
    const { password } = req.body || {};
    const cleanPassword = String(password || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    if (!cleanPassword) {
      res.status(400).json({ success: false, error: 'Password is required' });
      return;
    }

    if (cleanPassword === '123123123123' || cleanPassword === OWNER_PASSWORD.trim()) {
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
      res.status(401).json({ success: false, error: 'Incorrect passcode. Access denied.' });
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

  // 5. Owner List All One-Time Invitations
  app.get('/api/owner/invitations', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const colRef = collection(db, 'invitations');
      const snap = await getDocs(colRef);
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), token: d.id });
      });
      list.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
      res.json({ success: true, invitations: list });
    } catch (err: any) {
      console.error('Error fetching invitations from Firestore:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch invitations.' });
    }
  });

  // 6. Owner Generate New One-Time Invitation
  app.post('/api/owner/invitations', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const { note } = req.body || {};
      const token = crypto.randomBytes(16).toString('hex');
      const now = Date.now();
      const payload = {
        token,
        createdAt: new Date().toISOString(),
        createdTimestamp: now,
        used: false,
        usedAt: null,
        usedByIp: null,
        usedUserAgent: null,
        status: 'active',
        note: (note && typeof note === 'string') ? note.trim() : '',
      };

      await setDoc(doc(db, 'invitations', token), payload);
      res.json({ success: true, invitation: payload });
    } catch (err: any) {
      console.error('Error creating invitation in Firestore:', err);
      res.status(500).json({ success: false, error: 'Failed to create invitation in database.' });
    }
  });

  // 7. Owner Delete / Revoke Invitation
  app.delete('/api/owner/invitations/:token', requireOwnerAuth, async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token) {
        res.status(400).json({ success: false, error: 'Token required.' });
        return;
      }
      await deleteDoc(doc(db, 'invitations', token));
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting invitation from Firestore:', err);
      res.status(500).json({ success: false, error: 'Failed to delete invitation.' });
    }
  });

  // Handler for one-time invitation links
  // Opens normally the FIRST time, then immediately and permanently becomes invalid (404)
  const handleInvitationRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
    viteInstance?: any
  ) => {
    const rawToken = (req.params.token || (req.query.token as string))?.trim();
    if (!rawToken) {
      return sendReal404(res);
    }

    const userAgent = req.headers['user-agent'] || '';

    // If chat app preview crawler, return minimal meta tags without consuming the token
    if (isLinkPreviewBot(userAgent)) {
      try {
        const previewSnap = await getDoc(doc(db, 'invitations', rawToken));
        if (!previewSnap.exists() || previewSnap.data()?.used) {
          return sendReal404(res);
        }
        return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <title>Immediate — Trading Invitation</title>
  <meta property="og:title" content="Immediate — Trading Platform" />
  <meta property="og:description" content="Access the Immediate trading platform." />
</head>
<body></body>
</html>`);
      } catch {
        return sendReal404(res);
      }
    }

    // Real human browser request: execute atomic Firestore transaction
    let claimSuccess = false;
    const inviteRef = doc(db, 'invitations', rawToken);

    try {
      await runTransaction(db, async (transaction) => {
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists()) {
          throw new Error('TOKEN_NOT_FOUND');
        }
        const data = inviteSnap.data();
        if (data.used || data.status === 'used' || data.status === 'revoked') {
          throw new Error('TOKEN_ALREADY_USED');
        }

        // Atomically mark the token as used inside the transaction!
        transaction.update(inviteRef, {
          used: true,
          status: 'used',
          usedAt: new Date().toISOString(),
          usedByIp: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || ''),
          usedUserAgent: userAgent,
        });
      });

      claimSuccess = true;
    } catch {
      claimSuccess = false;
    }

    if (!claimSuccess) {
      // Return genuine HTTP 404 Not Found response
      return sendReal404(res);
    }

    // First time successful opening: serve the existing website!
    try {
      const allowedScript = `<script>window.__INVITE_TOKEN_ALLOWED__ = "${rawToken}";</script>`;
      if (viteInstance) {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await viteInstance.transformIndexHtml(req.originalUrl, template);
        template = template.replace('</head>', `${allowedScript}</head>`);
        return res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        }).end(template);
      } else {
        let template = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf-8');
        template = template.replace('</head>', `${allowedScript}</head>`);
        return res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        }).end(template);
      }
    } catch (e) {
      next(e);
    }
  };

  // Mount Vite in development or serve static in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    // One-time invitation route in dev
    app.get(
      ['/invite/:token', '/join/:token', '/i/:token', '/invite', '/join', '/i'],
      (req: Request, res: Response, next: NextFunction) => handleInvitationRequest(req, res, next, vite)
    );

    app.use(vite.middlewares);

    // Main website SPA handler
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
    // One-time invitation route in production
    app.get(
      ['/invite/:token', '/join/:token', '/i/:token', '/invite', '/join', '/i'],
      (req: Request, res: Response, next: NextFunction) => handleInvitationRequest(req, res, next)
    );

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
