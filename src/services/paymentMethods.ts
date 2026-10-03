import {
  collection,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { PaymentMethod } from '../types';

export const OWNER_FALLBACK_PASSWORD = '123123123123';

export const INITIAL_DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'bank_default',
    title: 'Bank Details',
    type: 'bank',
    bankName: 'Paga',
    accountNumber: '0469216912',
    accountOwnerName: 'Uthman',
    enabled: true,
    order: 1,
    updatedAt: new Date().toISOString(),
  },
];

export const PaymentMethodsService = {
  // Fetch active/enabled payment methods for normal users from backend API or Firestore
  async getPaymentMethods(ownerToken?: string | null): Promise<PaymentMethod[]> {
    try {
      const headers: Record<string, string> = {};
      if (ownerToken) {
        headers['Authorization'] = `Bearer ${ownerToken}`;
      }
      const res = await fetch('/api/payment-methods', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0) {
          return data.paymentMethods;
        }
      }
    } catch {
      // Fallback directly to Firestore if backend route is unavailable
    }

    // Direct Firestore fallback
    try {
      const colRef = collection(db, 'payment_methods');
      const q = query(colRef, orderBy('order', 'asc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: PaymentMethod[] = [];
        snap.forEach((d) => {
          const item = d.data() as PaymentMethod;
          if (ownerToken || item.enabled !== false) {
            list.push({ ...item, id: d.id });
          }
        });
        if (list.length > 0) return list;
      }
    } catch (err) {
      console.warn('Firestore fallback fetch warning:', err);
    }

    return INITIAL_DEFAULT_PAYMENT_METHODS;
  },

  // Subscribe to real-time changes from Firestore database so changes show instantly
  subscribePaymentMethods(
    callback: (methods: PaymentMethod[]) => void,
    includeDisabled: boolean = false
  ): () => void {
    try {
      const colRef = collection(db, 'payment_methods');
      return onSnapshot(
        colRef,
        (snap) => {
          if (snap.empty) {
            // First time load fallback
            callback(INITIAL_DEFAULT_PAYMENT_METHODS);
            return;
          }
          const list: PaymentMethod[] = [];
          snap.forEach((d) => {
            const item = d.data() as PaymentMethod;
            if (includeDisabled || item.enabled !== false) {
              list.push({ ...item, id: d.id });
            }
          });
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
          callback(list.length > 0 ? list : INITIAL_DEFAULT_PAYMENT_METHODS);
        },
        (error) => {
          console.warn('Payment methods snapshot listener error:', error);
          callback(INITIAL_DEFAULT_PAYMENT_METHODS);
        }
      );
    } catch {
      callback(INITIAL_DEFAULT_PAYMENT_METHODS);
      return () => {};
    }
  },

  // Owner authentication: Verify password on backend server with robust client fallback
  async verifyOwnerPassword(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const trimmed = (password || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Password is required.' };
    }

    try {
      const res = await fetch('/api/owner/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          return { success: true, token: data.token };
        }
      } else if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (trimmed === OWNER_FALLBACK_PASSWORD) {
          const clientToken = `owner_session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          return { success: true, token: clientToken };
        }
        return { success: false, error: data.error || 'Access denied. Incorrect password.' };
      }
    } catch {
      // Backend route unreachable, use direct fallback
    }

    if (trimmed === OWNER_FALLBACK_PASSWORD) {
      const clientToken = `owner_session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      return { success: true, token: clientToken };
    }

    return { success: false, error: 'Access denied. Incorrect password.' };
  },

  // Owner action: Save or update a payment method via authenticated backend API or direct Firestore
  async savePaymentMethod(
    token: string,
    method: Partial<PaymentMethod> & { id: string; title: string }
  ): Promise<{ success: boolean; data?: PaymentMethod; error?: string }> {
    try {
      const res = await fetch('/api/owner/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(method),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch {
      // Route unreachable, fall through to direct Firestore
    }

    // Direct Firestore update fallback
    try {
      const docRef = doc(db, 'payment_methods', method.id);
      const cleanData: Record<string, any> = {
        ...method,
        updatedAt: new Date().toISOString(),
      };
      // Clean undefined fields for Firestore safety
      Object.keys(cleanData).forEach((k) => {
        if (cleanData[k] === undefined) delete cleanData[k];
      });

      await setDoc(docRef, cleanData, { merge: true });
      return { success: true, data: cleanData as PaymentMethod };
    } catch (err: any) {
      console.error('Failed to save payment method to Firestore:', err);
      return { success: false, error: 'Failed to save payment method to database.' };
    }
  },

  // Owner action: Delete a payment method via authenticated backend API or direct Firestore
  async deletePaymentMethod(token: string, id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/owner/payment-methods/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Route unreachable, fall through to direct Firestore
    }

    // Direct Firestore delete fallback
    try {
      await deleteDoc(doc(db, 'payment_methods', id));
      return { success: true };
    } catch (err) {
      console.error('Failed to delete payment method from Firestore:', err);
      return { success: false, error: 'Failed to delete payment method from database.' };
    }
  },
};
