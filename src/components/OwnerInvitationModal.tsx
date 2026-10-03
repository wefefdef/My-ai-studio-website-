import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Link as LinkIcon,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Ban,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { InvitationRecord } from '../types';
import { InvitationService } from '../services/invitationService';

interface OwnerInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_DURATIONS = [
  '5 minutes',
  '15 minutes',
  '30 minutes',
  '1 hour',
  '2 hours',
  '24 hours',
  '7 days',
  '15 days',
];

export function OwnerInvitationModal({ isOpen, onClose }: OwnerInvitationModalProps) {
  // Authentication states
  const [passcode, setPasscode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);

  // Invitation Generator states
  const [customDuration, setCustomDuration] = useState('24 hours');
  const [isGenerating, setIsGenerating] = useState(false);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState<InvitationRecord | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (!isOpen) {
      setPasscode('');
      setAuthError(null);
      setActionMsg(null);
      setRecentlyCreated(null);
    }
  }, [isOpen]);

  // Load invitations when authenticated
  useEffect(() => {
    if (ownerToken) {
      loadInvitations(ownerToken);
    }
  }, [ownerToken]);

  async function loadInvitations(token: string) {
    setIsLoadingList(true);
    try {
      const data = await InvitationService.getInvitations(token);
      setInvitations(data);
    } catch {
      setActionMsg({ text: 'Failed to fetch invitation records.', isError: true });
    } finally {
      setIsLoadingList(false);
    }
  }

  // 1. Submit owner passcode to backend (zero frontend validation)
  async function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    if (!passcode.trim()) {
      setAuthError('Please enter the owner passcode.');
      return;
    }

    setIsVerifying(true);
    const res = await InvitationService.verifyOwnerPasscode(passcode);
    setIsVerifying(false);

    if (res.success && res.token) {
      setOwnerToken(res.token);
      setPasscode('');
    } else {
      setAuthError(res.error || 'Incorrect passcode. Access denied.');
    }
  }

  // 2. Generate a new invitation with custom duration
  async function handleGenerateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (isGenerating) return;

    if (!ownerToken) {
      setActionMsg({ text: 'Session expired. Please lock and re-authenticate.', isError: true });
      return;
    }

    const trimmedDuration = (customDuration || '').trim();
    if (!trimmedDuration) {
      setActionMsg({ text: 'Please enter or select a duration.', isError: true });
      return;
    }

    setIsGenerating(true);
    setActionMsg(null);

    try {
      const res = await InvitationService.generateInvitation(trimmedDuration, ownerToken);
      if (res.success && res.invitation) {
        setRecentlyCreated(res.invitation);
        setInvitations((prev) => [
          res.invitation!,
          ...prev.filter((i) => i.token !== res.invitation!.token),
        ]);
        setActionMsg({ text: `Temporary invitation link generated (${res.invitation.durationStr})!` });
        handleCopyLink(res.invitation.token);
        setTimeout(() => setActionMsg(null), 4500);
      } else {
        setActionMsg({ text: res.error || 'Failed to generate invitation.', isError: true });
      }
    } catch (err: any) {
      setActionMsg({ text: 'An unexpected error occurred while generating link.', isError: true });
    } finally {
      setIsGenerating(false);
    }
  }

  // 3. Revoke invitation
  async function handleRevoke(token: string) {
    if (!ownerToken) return;
    const ok = await InvitationService.revokeInvitation(token, ownerToken);
    if (ok) {
      setInvitations((prev) =>
        prev.map((i) => (i.token === token ? { ...i, status: 'revoked' } : i))
      );
      if (recentlyCreated?.token === token) {
        setRecentlyCreated((prev) => (prev ? { ...prev, status: 'revoked' } : null));
      }
      setActionMsg({ text: 'Invitation revoked successfully.' });
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  // 4. Delete invitation record
  async function handleDelete(token: string) {
    if (!ownerToken) return;
    const ok = await InvitationService.deleteInvitation(token, ownerToken);
    if (ok) {
      setInvitations((prev) => prev.filter((i) => i.token !== token));
      if (recentlyCreated?.token === token) {
        setRecentlyCreated(null);
      }
      setActionMsg({ text: 'Invitation record removed.' });
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  function getInviteUrl(token: string): string {
    let origin = window.location.origin;
    if (!origin || origin === 'null') {
      origin = window.location.href.split('?')[0].split('#')[0].replace(/\/invite\/.*/, '').replace(/\/$/, '');
    }
    return `${origin}/?invite=${token}`;
  }

  // 5. Copy link to clipboard with multi-tier fallback
  function handleCopyLink(token: string) {
    const fullUrl = getInviteUrl(token);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).catch(() => {
        fallbackCopy(fullUrl);
      });
    } else {
      fallbackCopy(fullUrl);
    }

    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken((curr) => (curr === token ? null : curr));
    }, 2500);
  }

  function fallbackCopy(text: string) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  }

  // Format relative remaining time
  function getRemainingTime(expiresAt: number): string {
    if (!expiresAt || isNaN(expiresAt)) return 'Active';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Expired';

    const mins = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (days > 0) {
      const remHours = hours % 24;
      return `${days}d ${remHours}h left`;
    }
    if (hours > 0) {
      const remMins = mins % 60;
      return `${hours}h ${remMins}m left`;
    }
    return `${Math.max(1, mins)}m left`;
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card, #ffffff)',
          color: 'var(--text, #1e293b)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border, #e2e8f0)',
          width: '100%',
          maxWidth: ownerToken ? 680 : 420,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'max-width 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            background: 'var(--bg2, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ownerToken ? <LinkIcon size={18} /> : <Lock size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                {ownerToken ? 'Owner Invitation Management' : 'Owner Authentication'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2, #64748b)' }}>
                {ownerToken
                  ? 'Generate & manage temporary access links'
                  : 'Authorized personnel verification'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ownerToken && (
              <button
                type="button"
                onClick={() => setOwnerToken(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: 'var(--text2, #64748b)',
                  cursor: 'pointer',
                }}
              >
                Lock
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text2, #64748b)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMsg && (
          <div
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              background: actionMsg.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: actionMsg.isError ? '#ef4444' : '#10b981',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {actionMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {!ownerToken ? (
            /* ================================================= */
            /* 1. AUTHENTICATION POPUP (Owner Passcode)          */
            /* ================================================= */
            <form onSubmit={handlePasscodeSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'var(--text, #0f172a)',
                  }}
                >
                  Owner Passcode
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter owner passcode"
                    autoFocus
                    disabled={isVerifying}
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${authError ? '#ef4444' : 'var(--border, #cbd5e1)'}`,
                      background: 'var(--input-bg, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text2, #94a3b8)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {authError && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> {authError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 8,
                  background: 'var(--accent, #0284c7)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: isVerifying ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Verifying Passcode...
                  </>
                ) : (
                  'Authorize Access'
                )}
              </button>
            </form>
          ) : (
            /* ================================================= */
            /* 2. OWNER INVITATION MANAGEMENT PAGE               */
            /* ================================================= */
            <div>
              {/* Generator Section */}
              <div
                style={{
                  background: 'var(--bg2, #f8fafc)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                  Generate New Temporary Link
                </h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text2, #64748b)' }}>
                  Create an invitation link valid for any custom duration. The recipient can freely register, sign in, and use the platform normally. Their account and data remain permanent in the database even after link expiration.
                </p>

                <form onSubmit={handleGenerateInvite}>
                  <div style={{ marginBottom: 10 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text2, #475569)',
                        marginBottom: 6,
                      }}
                    >
                      Duration (Type any duration):
                    </label>
                    <input
                      type="text"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="e.g. 5 minutes, 45 minutes, 3 hours, 7 days..."
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border, #cbd5e1)',
                        background: 'var(--card, #ffffff)',
                        color: 'var(--text, #0f172a)',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Preset duration chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {PRESET_DURATIONS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setCustomDuration(dur)}
                        style={{
                          background: customDuration === dur ? 'var(--accent, #0284c7)' : 'var(--card, #ffffff)',
                          color: customDuration === dur ? '#ffffff' : 'var(--text2, #64748b)',
                          border: `1px solid ${customDuration === dur ? 'var(--accent, #0284c7)' : 'var(--border, #cbd5e1)'}`,
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 8,
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: isGenerating ? 0.7 : 1,
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" /> Generating Secure Link...
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Generate New Temporary Link
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Recently Created Highlight Box */}
              {recentlyCreated && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid #10b981',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={15} /> Link Ready to Share (Duration: {recentlyCreated.durationStr})
                    </span>
                    <span style={{ fontSize: 11, color: '#059669' }}>
                      Expires: {new Date(recentlyCreated.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(recentlyCreated.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--card, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      gap: 8,
                    }}
                  >
                    <input
                      type="text"
                      readOnly
                      value={getInviteUrl(recentlyCreated.token)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: 'var(--text, #0f172a)',
                        fontFamily: 'monospace',
                      }}
                    />
                    <a
                      href={getInviteUrl(recentlyCreated.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open and test link in new tab"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border, #cbd5e1)',
                        background: 'var(--bg2, #f8fafc)',
                        color: 'var(--text, #0f172a)',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={14} /> Test
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(recentlyCreated.token)}
                      style={{
                        background: copiedToken === recentlyCreated.token ? '#10b981' : 'var(--accent, #0284c7)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {copiedToken === recentlyCreated.token ? (
                        <>
                          <Check size={14} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* List of Generated Links */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                    Generated Invitations ({invitations.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => ownerToken && loadInvitations(ownerToken)}
                    disabled={isLoadingList}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent, #0284c7)',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={12} className={isLoadingList ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div
                    style={{
                      padding: 30,
                      textAlign: 'center',
                      color: 'var(--text2, #64748b)',
                      fontSize: 13,
                      border: '1px dashed var(--border, #cbd5e1)',
                      borderRadius: 10,
                    }}
                  >
                    No invitation links generated yet. Create your first link above!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                    {invitations.map((inv) => {
                      const isExpired = inv.status === 'expired' || inv.expiresAt <= Date.now();
                      const isRevoked = inv.status === 'revoked';
                      const isActive = !isExpired && !isRevoked;

                      return (
                        <div
                          key={inv.token}
                          style={{
                            background: 'var(--card, #ffffff)',
                            border: '1px solid var(--border, #e2e8f0)',
                            borderRadius: 10,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: isActive ? 'rgba(16, 185, 129, 0.12)' : isRevoked ? 'rgba(148, 163, 184, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                                  color: isActive ? '#10b981' : isRevoked ? '#64748b' : '#ef4444',
                                }}
                              >
                                {isActive ? '● Active' : isRevoked ? 'Revoked' : 'Expired'}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                                Duration: {inv.durationStr}
                              </span>
                            </div>

                            <span style={{ fontSize: 11, color: 'var(--text2, #64748b)' }}>
                              {isActive ? getRemainingTime(inv.expiresAt) : `Expired on ${new Date(inv.expiresAt).toLocaleDateString()}`}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg2, #f8fafc)',
                              padding: '6px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontFamily: 'monospace',
                              color: 'var(--text2, #334155)',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                              ?invite={inv.token}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <a
                                href={getInviteUrl(inv.token)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open link in new tab"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  color: 'var(--text2, #64748b)',
                                  textDecoration: 'none',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  border: '1px solid var(--border, #cbd5e1)',
                                }}
                              >
                                <ExternalLink size={11} /> Open
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(inv.token)}
                                style={{
                                  background: copiedToken === inv.token ? '#10b981' : 'none',
                                  color: copiedToken === inv.token ? '#ffffff' : 'var(--accent, #0284c7)',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '3px 8px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {copiedToken === inv.token ? <Check size={12} /> : <Copy size={12} />}
                                {copiedToken === inv.token ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text2, #64748b)' }}>
                            <span>
                              Used: {inv.usedCount || 0} times
                              {inv.associatedUserEmail ? ` · Registered: ${inv.associatedUserEmail}` : ''}
                            </span>

                            <div style={{ display: 'flex', gap: 6 }}>
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(inv.token)}
                                  title="Revoke Link"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#f59e0b',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    padding: '2px 4px',
                                  }}
                                >
                                  Revoke
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(inv.token)}
                                title="Delete Record"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  padding: '2px 4px',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
