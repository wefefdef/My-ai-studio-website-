import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { PaymentMethod } from '../types';

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

  // Owner authentication: Verify password on backend server (never checked on frontend)
  async verifyOwnerPassword(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/owner/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: 'Connection to server failed. Please try again.' };
    }
  },

  // Owner action: Save or update a payment method via authenticated backend API
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
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Failed to save payment method to database.' };
    }
  },

  // Owner action: Delete a payment method via authenticated backend API
  async deletePaymentMethod(token: string, id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/owner/payment-methods/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Failed to delete payment method from database.' };
    }
  },
};
