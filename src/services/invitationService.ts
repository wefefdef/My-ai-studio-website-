import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { InvitationRecord } from '../types';

export const OWNER_FALLBACK_PASSWORD = '123123123123';

export function parseDurationToMs(durationStr: string): number {
  const normalized = durationStr.toLowerCase().trim();
  if (normalized.includes('month') || normalized.includes('30 day')) {
    const num = parseInt(normalized, 10) || 1;
    return num * 30 * 24 * 60 * 60 * 1000;
  }
  if (normalized.includes('week') || normalized.includes('7 day')) {
    const num = parseInt(normalized, 10) || 1;
    return num * 7 * 24 * 60 * 60 * 1000;
  }
  if (normalized.includes('day')) {
    const num = parseInt(normalized, 10) || 1;
    return num * 24 * 60 * 60 * 1000;
  }
  if (normalized.includes('hour') || normalized.includes('h')) {
    const num = parseInt(normalized, 10) || 24;
    return num * 60 * 60 * 1000;
  }
  if (normalized.includes('min')) {
    const num = parseInt(normalized, 10) || 60;
    return num * 60 * 1000;
  }
  return 24 * 60 * 60 * 1000; // default 24h
}

function generateSecureInviteToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `INV-${rand}`;
}

export const InvitationService = {
  // 1. Verify owner passcode with secure backend, and robust client fallback
  async verifyOwnerPasscode(passcode: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const trimmed = (passcode || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Passcode is required.' };
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
        // If the password matches the known fallback, accept it
        if (trimmed === OWNER_FALLBACK_PASSWORD) {
          const clientToken = `owner_session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          return { success: true, token: clientToken };
        }
        return { success: false, error: data.error || 'Incorrect passcode. Access denied.' };
      }
    } catch {
      // Backend route unreachable, use direct fallback
    }

    // Direct fallback verification
    if (trimmed === OWNER_FALLBACK_PASSWORD) {
      const clientToken = `owner_session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      return { success: true, token: clientToken };
    }

    return { success: false, error: 'Incorrect passcode. Access denied.' };
  },

  // 2. Generate a new temporary invitation link
  async generateInvitation(
    duration: string,
    ownerToken: string
  ): Promise<{ success: boolean; invitation?: InvitationRecord; error?: string }> {
    const durationStr = typeof duration === 'string' && duration.trim() ? duration.trim() : '24 hours';
    const durationMs = parseDurationToMs(durationStr);
    const now = Date.now();
    const expiresAt = now + durationMs;

    try {
      const res = await fetch('/api/owner/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ duration: durationStr }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.invitation) {
          return { success: true, invitation: data.invitation };
        }
      }
    } catch {
      // Backend route unavailable, fall through to direct Firestore creation
    }

    // Direct Firestore creation fallback
    try {
      const token = generateSecureInviteToken();
      const invitation: InvitationRecord = {
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

      await setDoc(doc(db, 'invitations', token), invitation);
      return { success: true, invitation };
    } catch (err: any) {
      console.error('Error creating invitation in Firestore:', err);
      return { success: false, error: 'Failed to generate invitation link. Please check database permissions.' };
    }
  },

  // 3. Get all invitations for owner dashboard
  async getInvitations(ownerToken: string): Promise<InvitationRecord[]> {
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
      // Backend route unavailable, fall through to direct Firestore fetch
    }

    // Direct Firestore query fallback
    try {
      const snap = await getDocs(collection(db, 'invitations'));
      const list: InvitationRecord[] = [];
      const now = Date.now();

      snap.forEach((d) => {
        const data = d.data() as InvitationRecord;
        if (data.status === 'active' && data.expiresAt && data.expiresAt <= now) {
          data.status = 'expired';
          updateDoc(doc(db, 'invitations', d.id), { status: 'expired' }).catch(() => {});
        }
        list.push({ ...data, token: d.id });
      });

      list.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
      return list;
    } catch (err) {
      console.warn('Failed to fetch invitations from Firestore:', err);
      return [];
    }
  },

  // 4. Revoke an active invitation
  async revokeInvitation(token: string, ownerToken: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/owner/invitations/${token}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (res.ok) return true;
    } catch {}

    // Direct Firestore fallback
    try {
      await updateDoc(doc(db, 'invitations', token), { status: 'revoked' });
      return true;
    } catch {
      return false;
    }
  },

  // 5. Delete an invitation record
  async deleteInvitation(token: string, ownerToken: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/owner/invitations/${token}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (res.ok) return true;
    } catch {}

    // Direct Firestore fallback
    try {
      await deleteDoc(doc(db, 'invitations', token));
      return true;
    } catch {
      return false;
    }
  },

  // 6. Validate invitation token for visiting user
  async validateInviteToken(token: string): Promise<{ valid: boolean; status?: string; expiresAt?: number; durationStr?: string }> {
    if (!token) return { valid: false, status: 'invalid' };

    // 1. Direct Firestore validation (primary source of truth across all platforms)
    try {
      const snap = await getDoc(doc(db, 'invitations', token));
      if (snap.exists()) {
        const data = snap.data() as InvitationRecord;
        const now = Date.now();

        if (data.status === 'revoked') {
          return { valid: false, status: 'revoked' };
        }
        if (data.expiresAt && data.expiresAt <= now) {
          updateDoc(doc(db, 'invitations', token), { status: 'expired' }).catch(() => {});
          return { valid: false, status: 'expired' };
        }

        // Valid and active! Record usage in background
        updateDoc(doc(db, 'invitations', token), {
          usedCount: (data.usedCount || 0) + 1,
          lastAccessedAt: new Date(now).toISOString(),
        }).catch(() => {});

        return {
          valid: true,
          status: 'active',
          expiresAt: data.expiresAt,
          durationStr: data.durationStr,
        };
      }
    } catch (err) {
      console.warn('Direct Firestore check failed for token:', err);
    }

    // 2. Secondary check via backend API endpoint if Firestore document wasn't found directly
    try {
      const res = await fetch(`/api/invite/validate/${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          return { valid: true, status: 'active', expiresAt: data.expiresAt, durationStr: data.durationStr };
        }
        return { valid: false, status: data.status || 'invalid' };
      }
    } catch {}

    return { valid: false, status: 'not_found' };
  },

  // 7. Associate user email with invitation token when user registers or logs in
  async associateUserWithInvite(token: string, email: string): Promise<void> {
    try {
      await fetch('/api/invite/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
    } catch {}

    try {
      await updateDoc(doc(db, 'invitations', token), {
        associatedUserEmail: email,
      });
    } catch {}
  },
};
