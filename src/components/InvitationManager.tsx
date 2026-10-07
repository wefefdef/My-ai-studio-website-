import { useState, useEffect } from 'react';
import {
  Link2,
  Copy,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';
import { InvitationsService, OneTimeInvitation } from '../services/invitations';

interface InvitationManagerProps {
  ownerToken: string;
}

export function InvitationManager({ ownerToken }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<OneTimeInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newlyCreatedUrl, setNewlyCreatedUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingToken, setDeletingToken] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [ownerToken]);

  async function loadInvitations() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await InvitationsService.getInvitations(ownerToken);
      setInvitations(list);
    } catch {
      setErrorMsg('Failed to load invitations from database.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg(null);
    setNewlyCreatedUrl(null);

    const res = await InvitationsService.createInvitation(ownerToken, note);
    setIsGenerating(false);

    if (res.success && res.invitation) {
      const fullUrl = InvitationsService.buildInviteUrl(res.invitation.token);
      setNewlyCreatedUrl(fullUrl);
      setNote('');
      setInvitations((prev) => [res.invitation!, ...prev]);
    } else {
      setErrorMsg(res.error || 'Failed to create invitation link.');
    }
  }

  async function handleDelete(token: string) {
    if (!window.confirm('Are you sure you want to delete this invitation link?')) {
      return;
    }
    setDeletingToken(token);
    const res = await InvitationsService.deleteInvitation(ownerToken, token);
    setDeletingToken(null);
    if (res.success) {
      setInvitations((prev) => prev.filter((i) => i.token !== token));
      if (newlyCreatedUrl && newlyCreatedUrl.includes(token)) {
        setNewlyCreatedUrl(null);
      }
    } else {
      setErrorMsg(res.error || 'Failed to delete invitation link.');
    }
  }

  function handleCopy(url: string, token: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Info */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(26, 109, 212, 0.08) 0%, rgba(3, 105, 161, 0.04) 100%)',
          border: '1px solid var(--border, #dce3ed)',
          borderRadius: 12,
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={20} color="var(--accent, #1a6dd4)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text, #111820)' }}>
            One-Time Invitation Link System
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text2, #4a5568)', lineHeight: 1.5 }}>
          When opened for the <strong>FIRST</strong> time, the link loads your existing website normally.
          Immediately upon that first opening, the URL is permanently invalidated server-side in Firebase. Any
          subsequent opening (refresh, back button, WhatsApp click, incognito, or another browser) returns a real{' '}
          <strong>HTTP 404 Not Found</strong> response.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #f87171',
            color: '#991b1b',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generation Form */}
      <form
        onSubmit={handleGenerate}
        style={{
          background: 'var(--bg2, #f4f7fb)',
          border: '1px solid var(--border, #dce3ed)',
          borderRadius: 12,
          padding: '18px 20px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text, #111820)' }}>
          Create New Invitation Link
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Label / Client name (optional, e.g. For VIP trader)"
            style={{
              flex: 1,
              minWidth: 240,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border, #dce3ed)',
              background: 'var(--bg, #ffffff)',
              color: 'var(--text, #111820)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 8,
              background: 'var(--accent, #1a6dd4)',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="spin-icon" /> Generating...
              </>
            ) : (
              <>
                <Plus size={16} /> Generate Invitation Link
              </>
            )}
          </button>
        </div>
      </form>

      {/* Newly Created Link Highlight Callout */}
      {newlyCreatedUrl && (
        <div
          className="fade-in"
          style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 12,
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: '#047857' }}>
            <Check size={18} />
            <strong style={{ fontSize: 14 }}>One-Time Invitation Link Generated!</strong>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: 12, color: '#065f46' }}>
            Send this URL to your invitee. It will work once and immediately self-invalidate to 404:
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: '#ffffff',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              padding: '10px 14px',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: 13,
              color: '#111820',
            }}
          >
            <span>{newlyCreatedUrl}</span>
            <button
              type="button"
              onClick={() => handleCopy(newlyCreatedUrl, 'newly-created')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {copiedToken === 'newly-created' ? (
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

      {/* List of Existing Invitations */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={16} color="var(--accent, #1a6dd4)" />
            <strong style={{ fontSize: 14, color: 'var(--text, #111820)' }}>
              All Generated Invitation Links ({invitations.length})
            </strong>
          </div>
          <button
            type="button"
            onClick={loadInvitations}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--accent, #1a6dd4)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} /> Refresh Status
          </button>
        </div>

        {isLoading && invitations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text3, #9ca3af)' }}>
            <Loader2 size={24} className="spin-icon" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13 }}>Loading invitations from Firebase...</div>
          </div>
        ) : invitations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: 'var(--bg2, #f4f7fb)',
              borderRadius: 12,
              border: '1px dashed var(--border, #dce3ed)',
              color: 'var(--text2, #4a5568)',
              fontSize: 13,
            }}
          >
            No invitation links generated yet. Click &quot;Generate Invitation Link&quot; above to create one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invitations.map((inv) => {
              const fullUrl = InvitationsService.buildInviteUrl(inv.token);
              const isCopied = copiedToken === inv.token;
              const isDeleting = deletingToken === inv.token;
              const isUsed = Boolean(inv.used);

              return (
                <div
                  key={inv.token}
                  style={{
                    background: 'var(--card, #ffffff)',
                    border: `1px solid ${isUsed ? 'var(--border, #e2e8f0)' : 'rgba(26, 109, 212, 0.3)'}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isUsed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          <XCircle size={13} /> Used (Invalidated - 404)
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#ecfdf5',
                            color: '#065f46',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          <Check size={13} /> Active (Unused)
                        </span>
                      )}
                      {inv.note && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text, #111820)',
                            background: 'var(--bg2, #f4f7fb)',
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {inv.note}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(fullUrl, inv.token)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--border, #dce3ed)',
                          background: 'var(--bg, #ffffff)',
                          color: 'var(--text, #111820)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} color="#059669" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy Link
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(inv.token)}
                        disabled={isDeleting}
                        title="Delete invitation"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: 6,
                          borderRadius: 6,
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isDeleting ? (
                          <Loader2 size={13} className="spin-icon" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* URL Row */}
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      background: 'var(--bg2, #f4f7fb)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      wordBreak: 'break-all',
                      color: isUsed ? 'var(--text3, #9ca3af)' : 'var(--text, #111820)',
                      textDecoration: isUsed ? 'line-through' : 'none',
                    }}
                  >
                    {fullUrl}
                  </div>

                  {/* Timestamps & Audit details */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      fontSize: 11,
                      color: 'var(--text3, #9ca3af)',
                    }}
                  >
                    <span>
                      Created: {new Date(inv.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {isUsed && inv.usedAt && (
                      <span style={{ color: '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> Opened &amp; Invalidated:{' '}
                        {new Date(inv.usedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
