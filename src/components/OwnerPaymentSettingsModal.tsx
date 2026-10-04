import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Landmark,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Link2,
} from 'lucide-react';
import { PaymentMethod } from '../types';
import { PaymentMethodsService } from '../services/paymentMethods';
import { InvitationManager } from './InvitationManager';

interface OwnerPaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMethodsUpdated?: () => void;
}

export function OwnerPaymentSettingsModal({
  isOpen,
  onClose,
  onMethodsUpdated,
}: OwnerPaymentSettingsModalProps) {
  // Authentication states
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'methods' | 'invitations'>('methods');

  // Panel data states
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id?: string; text: string; isError?: boolean } | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setAuthError(null);
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  // Load payment methods when authenticated
  useEffect(() => {
    if (ownerToken) {
      loadAllMethods(ownerToken);
    }
  }, [ownerToken]);

  async function loadAllMethods(token: string) {
    setIsLoadingMethods(true);
    try {
      const data = await PaymentMethodsService.getPaymentMethods(token);
      setMethods(data);
    } catch {
      setFeedbackMsg({ text: 'Failed to load payment methods from database.', isError: true });
    } finally {
      setIsLoadingMethods(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    if (!password.trim()) {
      setAuthError('Please enter password.');
      return;
    }

    setIsVerifying(true);
    const res = await PaymentMethodsService.verifyOwnerPassword(password);
    setIsVerifying(false);

    if (res.success && res.token) {
      setOwnerToken(res.token);
      setPassword('');
    } else {
      setAuthError(res.error || 'Access denied. Incorrect password.');
    }
  }

  function handleMethodFieldChange(id: string, field: keyof PaymentMethod, value: any) {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  async function handleSaveChanges(method: PaymentMethod) {
    if (!ownerToken) return;
    setSavingId(method.id);
    setFeedbackMsg(null);

    const res = await PaymentMethodsService.savePaymentMethod(ownerToken, method);
    setSavingId(null);

    if (res.success) {
      setFeedbackMsg({ id: method.id, text: 'Changes saved to database successfully!' });
      if (onMethodsUpdated) onMethodsUpdated();
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ id: method.id, text: res.error || 'Failed to save changes.', isError: true });
    }
  }

  async function handleDelete(id: string) {
    if (!ownerToken) return;
    if (methods.length <= 1) {
      alert('You must have at least one payment method configured.');
      return;
    }
    if (!window.confirm('Are you sure you want to permanently delete this payment method?')) {
      return;
    }

    setSavingId(id);
    const res = await PaymentMethodsService.deletePaymentMethod(ownerToken, id);
    setSavingId(null);

    if (res.success) {
      setMethods((prev) => prev.filter((m) => m.id !== id));
      setFeedbackMsg({ text: 'Payment method removed from database.' });
      if (onMethodsUpdated) onMethodsUpdated();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ text: res.error || 'Failed to delete payment method.', isError: true });
    }
  }

  function handleAddNewMethod() {
    const newId = 'pm_' + Date.now().toString(36);
    const newMethod: PaymentMethod = {
      id: newId,
      title: 'New Payment Method',
      type: 'bank',
      bankName: '',
      accountNumber: '',
      accountOwnerName: '',
      walletAddress: '',
      network: 'TRC20',
      instructions: '',
      enabled: true,
      order: methods.length + 1,
      updatedAt: new Date().toISOString(),
    };
    setMethods((prev) => [...prev, newMethod]);
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card, #ffffff)',
          color: 'var(--text, #111820)',
          borderRadius: 14,
          border: '1px solid var(--border, #dce3ed)',
          width: '100%',
          maxWidth: ownerToken ? 620 : 400,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, #dce3ed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg2, #f8fafe)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--accent, #1a6dd4)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Lock size={16} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {ownerToken ? 'Payment Settings' : 'Authentication'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text2, #8896a8)',
              cursor: 'pointer',
              padding: 4,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {/* STATE 1: PASSWORD AUTHENTICATION */}
          {!ownerToken ? (
            <form onSubmit={handlePasswordSubmit}>
              <p style={{ fontSize: 13, color: 'var(--text2, #6b7280)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Enter the password to access private payment settings.
              </p>

              {authError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border, #dce3ed)',
                      background: 'var(--bg, #ffffff)',
                      color: 'var(--text, #111820)',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text3, #9ca3af)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !password}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: 'var(--accent, #1a6dd4)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isVerifying || !password ? 'not-allowed' : 'pointer',
                  opacity: isVerifying || !password ? 0.7 : 1,
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
            /* STATE 2: AUTHENTICATED OWNER CONTROL PANEL */
            <div>
              {/* Navigation Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  borderBottom: '1px solid var(--border, #dce3ed)',
                  paddingBottom: 12,
                  marginBottom: 16,
                  overflowX: 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('methods')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: activeTab === 'methods' ? 'var(--accent, #1a6dd4)' : 'transparent',
                    color: activeTab === 'methods' ? '#ffffff' : 'var(--text2, #6b7280)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CreditCard size={15} /> Payment Methods
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('invitations')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: activeTab === 'invitations' ? 'var(--accent, #1a6dd4)' : 'transparent',
                    color: activeTab === 'invitations' ? '#ffffff' : 'var(--text2, #6b7280)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Link2 size={15} /> One-Time Invitation Links
                </button>
              </div>

              {activeTab === 'invitations' ? (
                <InvitationManager ownerToken={ownerToken!} />
              ) : (
                /* PAYMENT SETTINGS TAB */
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Payment Methods</h3>
                      <span style={{ fontSize: 12, color: 'var(--text2, #6b7280)' }}>
                        Saved changes persist permanently in the backend database.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNewMethod}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: 'var(--accent, #1a6dd4)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} /> Add Payment Method
                    </button>
                  </div>

              {feedbackMsg && !feedbackMsg.id && (
                <div
                  style={{
                    background: feedbackMsg.isError ? '#fef2f2' : '#ecfdf5',
                    border: `1px solid ${feedbackMsg.isError ? '#f87171' : '#6ee7b7'}`,
                    color: feedbackMsg.isError ? '#991b1b' : '#065f46',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {feedbackMsg.isError ? <AlertCircle size={16} /> : <Check size={16} />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {isLoadingMethods ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text2, #6b7280)' }}>
                  <Loader2 size={24} className="spin-icon" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: 13 }}>Loading payment methods from database...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {methods.map((method, idx) => {
                    const isSavingThis = savingId === method.id;
                    const feedbackThis = feedbackMsg && feedbackMsg.id === method.id ? feedbackMsg : null;

                    return (
                      <div
                        key={method.id}
                        style={{
                          background: 'var(--bg2, #f8fafe)',
                          border: `1px solid ${method.enabled ? 'var(--border, #dce3ed)' : 'rgba(239, 68, 68, 0.3)'}`,
                          borderRadius: 10,
                          padding: 16,
                          position: 'relative',
                        }}
                      >
                        {/* Card Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 14,
                            paddingBottom: 10,
                            borderBottom: '1px solid var(--border, #e5e7eb)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {method.type === 'bank' ? (
                              <Landmark size={18} color="var(--accent, #1a6dd4)" />
                            ) : method.type === 'crypto' ? (
                              <Coins size={18} color="#f59e0b" />
                            ) : (
                              <CreditCard size={18} color="var(--text2, #6b7280)" />
                            )}
                            <strong style={{ fontSize: 14 }}>
                              #{idx + 1} {method.title || 'Payment Method'}
                            </strong>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: method.enabled ? '#10b98120' : '#ef444420',
                                color: method.enabled ? '#10b981' : '#ef4444',
                              }}
                            >
                              {method.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(method.id)}
                              title="Delete payment method"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 4,
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Card Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                              Method Title
                            </label>
                            <input
                              type="text"
                              value={method.title || ''}
                              onChange={(e) => handleMethodFieldChange(method.id, 'title', e.target.value)}
                              placeholder="e.g. Bank Details"
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border, #dce3ed)',
                                background: 'var(--card, #ffffff)',
                                color: 'var(--text, #111820)',
                                fontSize: 13,
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                              Method Type
                            </label>
                            <select
                              value={method.type || 'bank'}
                              onChange={(e) => handleMethodFieldChange(method.id, 'type', e.target.value as any)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border, #dce3ed)',
                                background: 'var(--card, #ffffff)',
                                color: 'var(--text, #111820)',
                                fontSize: 13,
                              }}
                            >
                              <option value="bank">Bank Details</option>
                              <option value="crypto">Crypto Wallet</option>
                              <option value="custom">Custom Payment</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                              Status
                            </label>
                            <select
                              value={method.enabled ? 'enabled' : 'disabled'}
                              onChange={(e) => handleMethodFieldChange(method.id, 'enabled', e.target.value === 'enabled')}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border, #dce3ed)',
                                background: 'var(--card, #ffffff)',
                                color: 'var(--text, #111820)',
                                fontSize: 13,
                              }}
                            >
                              <option value="enabled">Enabled (Visible to users)</option>
                              <option value="disabled">Disabled (Hidden from users)</option>
                            </select>
                          </div>
                        </div>

                        {/* Conditional Fields based on Type */}
                        {method.type === 'bank' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                                Bank Name
                              </label>
                              <input
                                type="text"
                                value={method.bankName || ''}
                                onChange={(e) => handleMethodFieldChange(method.id, 'bankName', e.target.value)}
                                placeholder="e.g. Paga"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border, #dce3ed)',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text, #111820)',
                                  fontSize: 13,
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                                Account Number
                              </label>
                              <input
                                type="text"
                                value={method.accountNumber || ''}
                                onChange={(e) => handleMethodFieldChange(method.id, 'accountNumber', e.target.value)}
                                placeholder="e.g. 0469216912"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border, #dce3ed)',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text, #111820)',
                                  fontSize: 13,
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                                Account Owner Name
                              </label>
                              <input
                                type="text"
                                value={method.accountOwnerName || ''}
                                onChange={(e) => handleMethodFieldChange(method.id, 'accountOwnerName', e.target.value)}
                                placeholder="e.g. Uthman"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border, #dce3ed)',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text, #111820)',
                                  fontSize: 13,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {method.type === 'crypto' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                                Wallet Address
                              </label>
                              <input
                                type="text"
                                value={method.walletAddress || ''}
                                onChange={(e) => handleMethodFieldChange(method.id, 'walletAddress', e.target.value)}
                                placeholder="e.g. TR7NHkork5684vstq9w1v8n1..."
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border, #dce3ed)',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text, #111820)',
                                  fontSize: 13,
                                  fontFamily: 'monospace',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                                Network / Protocol
                              </label>
                              <input
                                type="text"
                                value={method.network || ''}
                                onChange={(e) => handleMethodFieldChange(method.id, 'network', e.target.value)}
                                placeholder="e.g. USDT (TRC20)"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border, #dce3ed)',
                                  background: 'var(--card, #ffffff)',
                                  color: 'var(--text, #111820)',
                                  fontSize: 13,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Optional Instructions */}
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2, #6b7280)', marginBottom: 4 }}>
                            Instructions / Note (optional)
                          </label>
                          <input
                            type="text"
                            value={method.instructions || ''}
                            onChange={(e) => handleMethodFieldChange(method.id, 'instructions', e.target.value)}
                            placeholder="e.g. Transfer exact converted amount to complete your deposit"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--border, #dce3ed)',
                              background: 'var(--card, #ffffff)',
                              color: 'var(--text, #111820)',
                              fontSize: 13,
                            }}
                          />
                        </div>

                        {/* Feedback message for this card */}
                        {feedbackThis && (
                          <div
                            style={{
                              background: feedbackThis.isError ? '#fef2f2' : '#ecfdf5',
                              color: feedbackThis.isError ? '#991b1b' : '#065f46',
                              fontSize: 12,
                              padding: '6px 10px',
                              borderRadius: 6,
                              marginBottom: 10,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {feedbackThis.isError ? <AlertCircle size={14} /> : <Check size={14} />}
                            {feedbackThis.text}
                          </div>
                        )}

                        {/* Save Changes Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveChanges(method)}
                            disabled={isSavingThis}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 16px',
                              borderRadius: 6,
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: isSavingThis ? 'not-allowed' : 'pointer',
                              opacity: isSavingThis ? 0.7 : 1,
                            }}
                          >
                            {isSavingThis ? (
                              <>
                                <Loader2 size={14} className="spin-icon" /> Saving to Database...
                              </>
                            ) : (
                              <>
                                <Save size={14} /> Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
