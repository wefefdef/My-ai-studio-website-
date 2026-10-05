import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface OneTimeInvitation {
  token: string;
  createdAt: string;
  createdTimestamp: number;
  used: boolean;
  usedAt?: string | null;
  usedByIp?: string | null;
  usedUserAgent?: string | null;
  note?: string;
  status?: 'active' | 'used' | 'revoked';
}

function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

export class InvitationsService {
  /**
   * Fetch all invitation tokens (Owner only) with direct Firestore fallback
   */
  static async getInvitations(ownerToken: string): Promise<OneTimeInvitation[]> {
    // 1. Try backend API first
    try {
      const res = await fetch('/api/owner/invitations', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.invitations)) {
          return data.invitations;
        }
      }
    } catch {
      // Backend route unreachable, use direct Firestore fallback
    }

    // 2. Direct Firestore fallback
    try {
      const colRef = collection(db, 'invitations');
      const snap = await getDocs(colRef);
      const list: OneTimeInvitation[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as OneTimeInvitation), token: d.id });
      });
      list.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
      return list;
    } catch (err) {
      console.error('Error fetching invitations from Firestore:', err);
      return [];
    }
  }

  /**
   * Generate a new one-time invitation link with direct Firestore fallback
   */
  static async createInvitation(
    ownerToken: string,
    note?: string
  ): Promise<{ success: boolean; invitation?: OneTimeInvitation; error?: string }> {
    // 1. Try backend API first
    try {
      const res = await fetch('/api/owner/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ note: note?.trim() || '' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.invitation) {
          return { success: true, invitation: data.invitation };
        }
      }
    } catch {
      // Fall through to direct Firestore creation
    }

    // 2. Direct Firestore creation
    try {
      const token = generateSecureToken();
      const payload: OneTimeInvitation = {
        token,
        createdAt: new Date().toISOString(),
        createdTimestamp: Date.now(),
        used: false,
        usedAt: null,
        usedByIp: null,
        usedUserAgent: null,
        status: 'active',
        note: note?.trim() || '',
      };

      await setDoc(doc(db, 'invitations', token), payload);
      return { success: true, invitation: payload };
    } catch (err: any) {
      console.error('Error saving invitation to Firestore:', err);
      return { success: false, error: err?.message || 'Failed to create invitation in database.' };
    }
  }

  /**
   * Revoke or delete an invitation with direct Firestore fallback
   */
  static async deleteInvitation(
    ownerToken: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Try backend API first
    try {
      const res = await fetch(`/api/owner/invitations/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { success: true };
        }
      }
    } catch {
      // Fall through to direct Firestore deletion
    }

    // 2. Direct Firestore deletion
    try {
      await deleteDoc(doc(db, 'invitations', token));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting invitation from Firestore:', err);
      return { success: false, error: err?.message || 'Failed to delete invitation.' };
    }
  }

  /**
   * Build the full shareable URL for an invitation token
   */
  static buildInviteUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/invite/${token}`;
  }
}
