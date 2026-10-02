import { InvitationRecord } from '../types';

export const InvitationService = {
  // 1. Verify owner passcode with secure backend
  async verifyOwnerPasscode(passcode: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/owner/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, token: data.token };
      }
      return { success: false, error: data.error || 'Incorrect passcode. Access denied.' };
    } catch {
      return { success: false, error: 'Connection error while verifying passcode.' };
    }
  },

  // 2. Generate a new temporary invitation link
  async generateInvitation(
    duration: string,
    ownerToken: string
  ): Promise<{ success: boolean; invitation?: InvitationRecord; error?: string }> {
    try {
      const res = await fetch('/api/owner/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ duration }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, invitation: data.invitation };
      }
      return { success: false, error: data.error || 'Failed to generate invitation.' };
    } catch {
      return { success: false, error: 'Network error while generating invitation.' };
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
    } catch (err) {
      console.warn('Failed to fetch invitations:', err);
    }
    return [];
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
      return res.ok;
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
      return res.ok;
    } catch {
      return false;
    }
  },

  // 6. Validate invitation token for visiting user
  async validateInviteToken(token: string): Promise<{ valid: boolean; status?: string }> {
    try {
      const res = await fetch(`/api/invite/validate/${token}`);
      if (res.status === 404) {
        return { valid: false, status: 'expired' };
      }
      const data = await res.json();
      if (res.ok && data.valid) {
        return { valid: true, status: 'active' };
      }
      return { valid: false, status: data.status || 'invalid' };
    } catch {
      // In case of transient network glitch, don't immediately kill session
      return { valid: true, status: 'unknown' };
    }
  },

  // 7. Associate user email with invitation token when user registers or logs in
  async associateUserWithInvite(token: string, email: string): Promise<void> {
    try {
      await fetch('/api/invite/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
    } catch {
      // Silent catch
    }
  },
};
