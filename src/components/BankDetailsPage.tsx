import React, { useState } from 'react';
import {
  ArrowLeft,
  CircleCheck,
  Landmark,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  KeyRound,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';

interface BankDetailsPageProps {
  amount: number;
  onBack: () => void;
  onDone?: () => void;
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

export function BankDetailsPage({ amount, onBack, onDone }: BankDetailsPageProps) {
  const convertedNgn = Math.round(amount * 1330);
  const [showTrxPrompt, setShowTrxPrompt] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [trxError, setTrxError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  function handleVerifyTrx(e: React.FormEvent) {
    e.preventDefault();
    setTrxError(null);

    if (!trxId.trim()) {
      setTrxError('Please enter your Transaction Reference ID.');
      return;
    }

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      // Validates secret transaction key
      if (trxId.trim().toLowerCase() === 'smc123123') {
        setIsVerified(true);
        setTimeout(() => {
          if (onDone) onDone();
        }, 1200);
      } else {
        setTrxError('Invalid Transaction ID. Please verify your payment receipt reference and try again.');
      }
    }, 800);
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <button
          className="back-button visible"
          type="button"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="payment-shell bank-details-shell">
        <div className="success-icon">
          <CircleCheck size={28} />
        </div>
        <p className="eyebrow">BANK TRANSFER</p>
        <h1>Complete your deposit</h1>
        <p className="payment-intro">
          Transfer the converted amount below using the bank details provided. Tap any row to copy it.
        </p>

        <div className="transfer-summary">
          <span>You selected</span>
          <strong>${amount.toLocaleString()} USD</strong>
          <span>Converted amount</span>
          <strong>₦{convertedNgn.toLocaleString()}</strong>
        </div>

        <div className="bank-card">
          <div className="bank-card-title">
            <Landmark size={21} /> Bank details
          </div>
          <BankRow label="Bank name" value="Paga" />
          <BankRow label="Account number" value="0469216912" />
          <BankRow label="Account owner name" value="Uthman" />
        </div>

        <div className="transfer-note">
          <ShieldCheck size={18} />
          <span>Transfer the exact converted amount to complete your deposit.</span>
        </div>

        {!showTrxPrompt ? (
          <button
            className="primary-button proceed"
            type="button"
            onClick={() => setShowTrxPrompt(true)}
          >
            Done <ArrowRight size={20} />
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
              <KeyRound size={18} color="var(--accent)" /> Enter Transaction ID
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px 0' }}>
              Please enter the payment confirmation / transaction reference code from your bank transfer receipt to activate your live account.
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
                <Check size={16} />
                <span>Transaction verified! Live account is opening...</span>
              </div>
            )}

            <form onSubmit={handleVerifyTrx}>
              <div className="input-wrap">
                <span>Transaction ID *</span>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. TRX-..."
                  disabled={isVerifying || isVerified}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowTrxPrompt(false)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isVerifying || isVerified || !trxId.trim()}
                  style={{ flex: 1, margin: 0 }}
                >
                  {isVerifying ? (
                    <>
                      Verifying... <Loader2 size={16} className="spin-icon" />
                    </>
                  ) : (
                    <>
                      Confirm &amp; Activate Live Account <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
