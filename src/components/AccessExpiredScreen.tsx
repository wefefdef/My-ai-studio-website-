import React, { useState } from 'react';
import { ShieldAlert, Clock, Lock, ArrowRight, KeyRound, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { InvitationService } from '../services/invitationService';
import { OwnerInvitationModal } from './OwnerInvitationModal';

interface AccessExpiredScreenProps {
  token?: string | null;
  expiresAt?: number | null;
  reason?: string;
  onUnlocked: (newToken: string) => void;
}

export function AccessExpiredScreen({
  token,
  expiresAt,
  reason,
  onUnlocked,
}: AccessExpiredScreenProps) {
  const [newInput, setNewInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  async function handleVerifyNewToken(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const input = newInput.trim();
    if (!input) {
      setErrorMsg('Please enter a valid invitation link or token.');
      return;
    }

    // Extract token if user pasted full URL
    let extracted = input;
    try {
      if (input.includes('invite=') || input.includes('token=') || input.includes('/invite/')) {
        const url = new URL(input.startsWith('http') ? input : `https://example.com/${input.replace(/^\//, '')}`);
        extracted =
          url.searchParams.get('invite') ||
          url.searchParams.get('token') ||
          url.searchParams.get('inv') ||
          input.split('/invite/')[1]?.split('?')[0]?.split('#')[0] ||
          input;
      }
    } catch {
      // Use raw input if URL parsing fails
    }

    // Clean any trailing query/hash chars
    extracted = extracted.replace(/[?#].*$/, '').trim();

    setIsVerifying(true);
    try {
      const res = await InvitationService.validateInviteToken(extracted);
      if (res.valid) {
        onUnlocked(extracted);
      } else {
        setErrorMsg(
          res.status === 'revoked'
            ? 'This invitation link has been revoked.'
            : res.status === 'expired'
            ? 'This new link is also expired. Please request an active link.'
            : 'Invalid invitation link or token. Please check and try again.'
        );
      }
    } catch {
      setErrorMsg('Failed to verify token. Please check connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  }

  const expiredDateStr = expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const expiredDayStr = expiresAt ? new Date(expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: '#f8fafc',
        padding: 20,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#0f172a',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 20,
          padding: '36px 28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.1)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Animated Icon Header */}
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
          Access Expired
        </h2>

        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>
          {reason || 'Your temporary invitation period has ended. Access to trading, account operations, and platform features is now locked.'}
        </p>

        {/* Expiration Details Card */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 24,
            textAlign: 'left',
            fontSize: 13,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {expiredDateStr && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} /> Expired At:
              </span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                {expiredDateStr} ({expiredDayStr})
              </span>
            </div>
          )}

          {token && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={14} /> Token:
              </span>
              <span style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}>
                {token}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> Status:
            </span>
            <span style={{ color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>
              Locked
            </span>
          </div>
        </div>

        {/* Input for New Token */}
        <form onSubmit={handleVerifyNewToken} style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
            Have a new invitation link or token?
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="Paste invitation link or token..."
              disabled={isVerifying}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#1e293b',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isVerifying}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isVerifying ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Unlock <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#ef4444', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {errorMsg}
            </p>
          )}
        </form>

        {/* Owner override link */}
        <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.12)', paddingTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowOwnerModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Lock size={12} /> Owner / Administrator Authentication
          </button>
        </div>
      </div>

      <OwnerInvitationModal
        isOpen={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
      />
    </div>
  );
}
