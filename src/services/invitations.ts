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

export class InvitationsService {
  /**
   * Fetch all invitation tokens (Owner only)
   */
  static async getInvitations(ownerToken: string): Promise<OneTimeInvitation[]> {
    try {
      const res = await fetch('/api/owner/invitations', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch invitations');
      }
      const data = await res.json();
      return data.invitations || [];
    } catch (err) {
      console.error('Error in getInvitations:', err);
      return [];
    }
  }

  /**
   * Generate a new one-time invitation link (Owner only)
   */
  static async createInvitation(
    ownerToken: string,
    note?: string
  ): Promise<{ success: boolean; invitation?: OneTimeInvitation; error?: string }> {
    try {
      const res = await fetch('/api/owner/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ note: note?.trim() || '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create invitation' };
      }
      return { success: true, invitation: data.invitation };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Revoke or delete an invitation (Owner only)
   */
  static async deleteInvitation(
    ownerToken: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/owner/invitations/${encodeURIComponent(token)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to delete invitation' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
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
