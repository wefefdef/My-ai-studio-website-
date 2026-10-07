import { useState, useEffect } from 'react';
import { Banknote, LoaderCircle, SlidersHorizontal } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';
import { OwnerPaymentSettingsModal } from './OwnerPaymentSettingsModal';
import { BankTransferSticker, CircleBackButton, CircleForwardArrow } from './PaymentMethodIcons';

interface BankTransferDepositPageProps {
  method: string;
  onBack: () => void;
  onDeposit: (amount: number) => void;
}

export function BankTransferDepositPage({
  method,
  onBack,
  onDeposit,
}: BankTransferDepositPageProps) {
  const [amount, setAmount] = useState<number | ''>(200);
  const [accepted, setAccepted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const presets = [200, 300, 400];
  const methodName =
    method === 'bank-transfer-ng' ? 'Bank Transfer NG' : 'Bank Transfer E';

  useEffect(() => {
    if (!generating) return;
    if (countdown <= 0) {
      onDeposit(typeof amount === 'number' ? amount : 200);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [generating, countdown, amount, onDeposit]);

  function handleStartDeposit() {
    if (!amount || amount < 1 || !accepted) return;
    setGenerating(true);
    setCountdown(10);
  }

  if (generating) {
    return (
      <main className="payment-page">
        <header className="payment-header">
          <CircleBackButton onClick={onBack} ariaLabel="Go back" />
          <BrandMark onClick={onBack} />
          <LanguageButton />
        </header>

        <section className="payment-shell deposit-shell generating-shell">
          <div className="generating-spinner">
            <LoaderCircle size={40} className="spin-icon" />
          </div>
          <h1>Generating payment details</h1>
          <p className="payment-intro">
            Please wait while we prepare your secure payment details. This will take a few seconds.
          </p>
          <div className="countdown-display">{countdown}s</div>
          <div className="countdown-bar">
            <div
              className="countdown-fill"
              style={{ width: `${((10 - countdown) / 10) * 100}%` }}
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <CircleBackButton onClick={onBack} ariaLabel="Go back" />
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="payment-shell deposit-shell">
        <p className="eyebrow">ALTERNATIVE PAYMENT</p>
        <h1>Secure deposit using {methodName}</h1>
        
        {/* Official Bank Transfer sticker badge */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px' }}>
          <BankTransferSticker size="md" />
        </div>

        <p className="payment-intro">
          Choose an amount to continue with a secure local bank transfer.
        </p>

        <div className="amount-panel">
          <div className="amount-heading">
            <Banknote size={22} />
            <span>Deposit amount</span>
          </div>

          <label className="amount-input">
            <span>Amount in USD</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value ? Number(e.target.value) : '')
              }
              placeholder="Enter amount"
            />
          </label>

          <div className="amount-options">
            {presets.map((val) => (
              <button
                type="button"
                className={amount === val ? 'amount-option active' : 'amount-option'}
                key={val}
                onClick={() => setAmount(val)}
              >
                ${val}
              </button>
            ))}
          </div>

          <p className="amount-note">
            Your selected amount will be converted to Nigerian Naira at the current rate (1 USD = 1,330
            NGN) on the next step.
          </p>

          <label className="declaration-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              I have read and accept the terms, conditions, and declaration of this deposit.
            </span>
          </label>

          <button
            className="primary-button deposit-button"
            type="button"
            onClick={handleStartDeposit}
            disabled={!amount || amount < 1 || !accepted}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span>Deposit</span>
            <CircleForwardArrow />
          </button>

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
