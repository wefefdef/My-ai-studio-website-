import { useState, useEffect } from 'react';
import {
  CircleCheck,
  Landmark,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';
import { PaymentMethod } from '../types';
import { PaymentMethodsService, INITIAL_DEFAULT_PAYMENT_METHODS } from '../services/paymentMethods';
import { OwnerPaymentSettingsModal } from './OwnerPaymentSettingsModal';
import {
  BankTransferSticker,
  PagaBankLogo,
  getCryptoBadge,
  CircleBackButton,
  CircleForwardArrow,
} from './PaymentMethodIcons';

interface BankDetailsPageProps {
  amount: number;
  onBack: () => void;
  onDone?: () => void;
  onVerifyPasscode?: (passcode: string) => boolean;
}

interface BankRowProps {
  label: string;
  value: string;
}

function BankRow({ label, value }: BankRowProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  }

  return (
    <div
      className="bank-row"
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCopy();
        }
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <span className="copy-icon">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </span>
    </div>
  );
}

export function BankDetailsPage({
  amount,
  onBack,
  onDone,
  onVerifyPasscode,
}: BankDetailsPageProps) {
  const convertedNgn = Math.round(amount * 1330);
  const [showTrxPrompt, setShowTrxPrompt] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [trxError, setTrxError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Dynamic payment methods from persistent database
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(INITIAL_DEFAULT_PAYMENT_METHODS);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  useEffect(() => {
    // Initial fetch from backend/database
    PaymentMethodsService.getPaymentMethods().then((res) => {
      if (res && res.length > 0) {
        setPaymentMethods(res);
      }
    });

    // Real-time listener: any change saved by owner immediately updates this page
    const unsubscribe = PaymentMethodsService.subscribePaymentMethods((methods) => {
      if (methods && methods.length > 0) {
        setPaymentMethods(methods);
      }
    });

    return () => unsubscribe();
  }, []);

  function handleVerifyTrx(e: React.FormEvent) {
    e.preventDefault();
    setTrxError(null);

    const clean = trxId.replace(/[\s\u200B-\u200D\uFEFF]/g, '');

    if (!clean) {
      setTrxError('Please enter your confirmation passcode to credit your live account.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      // Strictly verify authentic permanent passcode: 123123123123
      if (clean === '123123123123') {
        let credited = true;
        if (onVerifyPasscode) {
          credited = onVerifyPasscode(clean);
        }
        if (credited) {
          setIsVerified(true);
          setTimeout(() => {
            if (onDone) onDone();
          }, 1200);
        } else {
          setTrxError('Failed to credit live account. Please try again.');
        }
      } else {
        // Strictly DO NOT add a single penny if passcode is incorrect
        setTrxError('Incorrect passcode. No funds have been added. You must enter the authentic passcode 123123123123 to credit funds to your live account.');
      }
    }, 600);
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <CircleBackButton onClick={onBack} ariaLabel="Go back" />
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="payment-shell bank-details-shell">
        <div className="success-icon">
          <CircleCheck size={28} />
        </div>
        <p className="eyebrow">PAYMENT DETAILS</p>
        <h1>Complete your deposit</h1>
        <p className="payment-intro">
          Transfer the converted amount below using the bank or crypto details provided. Tap any row to copy it.
        </p>

        <div className="transfer-summary">
          <span>You selected</span>
          <strong>${amount.toLocaleString()} USD</strong>
          <span>Converted amount</span>
          <strong>₦{convertedNgn.toLocaleString()}</strong>
        </div>

        {/* Dynamic Database Payment Methods with Appropriate Visual Identifiers */}
        {paymentMethods.map((method) => {
          if (method.type === 'crypto') {
            return (
              <div className="bank-card" key={method.id} style={{ marginBottom: 16 }}>
                <div
                  className="bank-card-title"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getCryptoBadge(method.title + ' ' + (method.network || ''), 24)}
                    <span>{method.title || 'Crypto Wallet'}</span>
                  </div>
                  {method.network && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(98, 126, 234, 0.12)',
                        color: '#627eea',
                      }}
                    >
                      {method.network}
                    </span>
                  )}
                </div>
                {method.network && <BankRow label="Network / Protocol" value={method.network} />}
                <BankRow label="Wallet address" value={method.walletAddress || ''} />
                {method.instructions && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text2)',
                      padding: '8px 14px',
                      background: 'var(--bg2)',
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {method.instructions}
                  </div>
                )}
              </div>
            );
          }

          // Bank transfer method with official Visa/Mastercard visual identifier
          return (
            <div className="bank-card" key={method.id} style={{ marginBottom: 16 }}>
              <div
                className="bank-card-title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Landmark size={20} color="var(--accent, #1a6dd4)" />
                  <span>{method.title || 'Bank details'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {method.bankName?.toLowerCase().includes('paga') ? (
                    <PagaBankLogo height={18} />
                  ) : (
                    <BankTransferSticker size="sm" />
                  )}
                </div>
              </div>
              <BankRow label="Bank name" value={method.bankName || 'Paga'} />
              <BankRow label="Account number" value={method.accountNumber || '0469216912'} />
              <BankRow label="Account owner name" value={method.accountOwnerName || 'Uthman'} />
              {method.instructions && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text2)',
                    padding: '8px 14px',
                    background: 'var(--bg2)',
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                >
                  {method.instructions}
                </div>
              )}
            </div>
          );
        })}

        <div className="transfer-note">
          <ShieldCheck size={18} />
          <span>Transfer the exact converted amount to complete your deposit securely.</span>
        </div>

        {!showTrxPrompt ? (
          <button
            className="primary-button proceed"
            type="button"
            onClick={() => setShowTrxPrompt(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 16,
            }}
          >
            <span>Done</span>
            <CircleForwardArrow />
          </button>
        ) : (
          <div
            className="fade-in"
            style={{
              marginTop: 20,
              padding: 20,
              background: 'var(--bg2)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              textAlign: 'left',
            }}
          >
            <h3 style={{ fontSize: 16, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="var(--accent)" /> Enter Confirmation Passcode
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px 0' }}>
              To activate and credit <strong>${amount.toLocaleString()} USD</strong> into your live trading account, enter the authentic confirmation passcode (<strong>123123123123</strong>).
            </p>

            {trxError && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #f87171',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{trxError}</span>
              </div>
            )}

            {isVerified && (
              <div
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #6ee7b7',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                }}
              >
                <Check size={18} />
                <span>Passcode verified! ${amount.toLocaleString()} USD credited to your live account. Redirecting...</span>
              </div>
            )}

            <form onSubmit={handleVerifyTrx}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  marginBottom: 6,
                }}
              >
                Authentic Confirmation Passcode:
              </label>
              <input
                type="text"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                placeholder="Enter passcode (123123123123)"
                disabled={isVerifying || isVerified}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 12,
                }}
              />
              <button
                type="submit"
                className="primary-button proceed"
                disabled={isVerifying || isVerified}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={18} className="spin-icon" style={{ marginRight: 8 }} />
                    Verifying Reference...
                  </>
                ) : isVerified ? (
                  'Verified!'
                ) : (
                  <>
                    <span>Submit & Activate Account</span>
                    <CircleForwardArrow />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Discreet neutral corner icon */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowOwnerModal(true)}
            aria-label="Options"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--text3, #9ca3af)',
              opacity: 0.35,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.35')}
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </section>

      <OwnerPaymentSettingsModal
        isOpen={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
      />

      <Footer />
    </main>
  );
}
