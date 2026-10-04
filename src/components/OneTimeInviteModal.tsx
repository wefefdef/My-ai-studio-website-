import React, { useState } from 'react';
import { X, Copy, Check, Plus, Loader2, AlertCircle, Trash2, Clock, XCircle } from 'lucide-react';
import { InvitationsService, OneTimeInvitation } from '../services/invitations';

interface OneTimeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OneTimeInviteModal({ isOpen, onClose }: OneTimeInviteModalProps) {
  const [passcode, setPasscode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);

  // Management states
  const [invitations, setInvitations] = useState<OneTimeInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (!passcode.trim()) {
      setAuthError('Please enter passcode.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/owner/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode.trim() }),
      });
      const data = await res.json();
      setIsVerifying(false);

      if (data.success && data.token) {
        setOwnerToken(data.token);
        setPasscode('');
        loadExistingInvites(data.token);
      } else {
        setAuthError('Incorrect passcode.');
      }
    } catch {
      setIsVerifying(false);
      setAuthError('Error verifying passcode.');
    }
  }

  async function loadExistingInvites(token: string) {
    setIsLoading(true);
    try {
      const list = await InvitationsService.getInvitations(token);
      setInvitations(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!ownerToken) return;

    setIsGenerating(true);
    const res = await InvitationsService.createInvitation(ownerToken, note);
    setIsGenerating(false);

    if (res.success && res.invitation) {
      const url = InvitationsService.buildInviteUrl(res.invitation.token);
      setLatestUrl(url);
      setNote('');
      setInvitations((prev) => [res.invitation!, ...prev]);
    }
  }

  async function handleDelete(token: string) {
    if (!ownerToken) return;
    const res = await InvitationsService.deleteInvitation(ownerToken, token);
    if (res.success) {
      setInvitations((prev) => prev.filter((i) => i.token !== token));
      if (latestUrl && latestUrl.includes(token)) {
        setLatestUrl(null);
      }
    }
  }

  function handleCopy(url: string, id: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  }

  return (
    <div
      className="app-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        zIndex: 9999,
      }}
    >
      <div
        className="app-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card, #ffffff)',
          color: 'var(--text, #111820)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, #dce3ed)',
          }}
        >
          <strong style={{ fontSize: 15, fontWeight: 700 }}>
            {ownerToken ? 'Generate Invitation Link' : 'Passcode Required'}
          </strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text3, #8896a8)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {!ownerToken ? (
            /* Passcode Verification Screen */
            <form onSubmit={handleVerify}>
              <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--text2, #4a5568)' }}>
                Enter passcode to access invitation generator:
              </p>

              {authError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 13,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border, #dce3ed)',
                  background: 'var(--bg, #ffffff)',
                  color: 'var(--text, #111820)',
                  fontSize: 14,
                  outline: 'none',
                  marginBottom: 16,
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="submit"
                disabled={isVerifying || !passcode}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: 'var(--accent, #1a6dd4)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isVerifying || !passcode ? 'not-allowed' : 'pointer',
                  opacity: isVerifying || !passcode ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={16} className="spin-icon" /> Checking...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          ) : (
            /* Generator Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'var(--bg2, #f4f7fb)',
                  border: '1px solid var(--border, #dce3ed)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: 'var(--text2, #4a5568)',
                  lineHeight: 1.5,
                }}
              >
                Each link works <strong>ONE TIME ONLY</strong>. It opens the website normally on first visit, then becomes permanently invalid immediately after.
              </div>

              {/* Generate Action */}
              <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note / label (optional)"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: '10px 12px',
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
                    gap: 6,
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: 'var(--accent, #1a6dd4)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isGenerating ? (
                    <Loader2 size={15} className="spin-icon" />
                  ) : (
                    <Plus size={15} />
                  )}
                  Generate Link
                </button>
              </form>

              {/* Latest Generated Link Alert */}
              {latestUrl && (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #10b981',
                    borderRadius: 10,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#047857', fontSize: 13, fontWeight: 700 }}>
                    <Check size={16} /> Link Ready (One-Time Only):
                  </div>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #a7f3d0',
                      borderRadius: 6,
                      padding: '8px 10px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      color: '#111820',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span>{latestUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(latestUrl, 'latest')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      {copiedId === 'latest' ? <Check size={13} /> : <Copy size={13} />}
                      {copiedId === 'latest' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* All links history */}
              <div>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                  Invitation Links ({invitations.length})
                </strong>
                {isLoading && invitations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3, #8896a8)', fontSize: 12 }}>
                    Loading...
                  </div>
                ) : invitations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3, #8896a8)', fontSize: 12 }}>
                    No links generated yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                    {invitations.map((inv) => {
                      const full = InvitationsService.buildInviteUrl(inv.token);
                      const isUsed = Boolean(inv.used);
                      const isCopied = copiedId === inv.token;

                      return (
                        <div
                          key={inv.token}
                          style={{
                            background: 'var(--bg2, #f4f7fb)',
                            border: `1px solid ${isUsed ? 'var(--border, #dce3ed)' : 'rgba(26, 109, 212, 0.3)'}`,
                            borderRadius: 8,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isUsed ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  <XCircle size={11} /> Invalidated
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: '#ecfdf5',
                                    color: '#065f46',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  <Check size={11} /> Active (Unused)
                                </span>
                              )}
                              {inv.note && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2, #4a5568)' }}>
                                  {inv.note}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => handleCopy(full, inv.token)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: 11,
                                  borderRadius: 4,
                                  border: '1px solid var(--border, #dce3ed)',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text, #111820)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {isCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                                {isCopied ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(inv.token)}
                                title="Delete"
                                style={{
                                  padding: 4,
                                  borderRadius: 4,
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: isUsed ? 'var(--text3, #8896a8)' : 'var(--text, #111820)',
                              textDecoration: isUsed ? 'line-through' : 'none',
                              wordBreak: 'break-all',
                            }}
                          >
                            {full}
                          </div>

                          {isUsed && inv.usedAt && (
                            <div style={{ fontSize: 10, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={10} /> Used on {new Date(inv.usedAt).toLocaleString()}
                            </div>
                          )}
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
