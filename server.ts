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

  // Mount Vite in development or serve static in production
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
