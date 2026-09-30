import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Landmark,
  ChevronLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Info,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';
import { OwnerPaymentSettingsModal } from './OwnerPaymentSettingsModal';

interface PaymentMethodsPageProps {
  onBack: () => void;
  onBankTransfer: (method: string) => void;
  onCardForm: () => void;
  onNotNow: () => void;
}

interface PaymentMethodItem {
  key: string;
  label: string;
  sub: string;
  logoClass?: string;
  logoText?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  skrill: 'Skrill',
  cryptopay: 'CryptoPay',
  visa: 'Visa / Mastercard',
  gpay: 'Google Pay',
  applepay: 'Apple Pay',
  'bank-transfer-ng': 'Bank Transfer NG',
  'bank-transfer-e': 'Bank Transfer E',
};

export function PaymentMethodsPage({
  onBack,
  onBankTransfer,
  onCardForm,
  onNotNow,
}: PaymentMethodsPageProps) {
  const [tab, setTab] = useState<'main' | 'alternative'>('main');
  const [selectedMethod, setSelectedMethod] = useState<string | null>('bank-transfer-ng');
  const [skrillWarning, setSkrillWarning] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function handleContinue() {
    const method = selectedMethod || 'bank-transfer-ng';
    if (method === 'skrill') {
      setSkrillWarning(true);
      return;
    }
    if (method === 'visa') {
      onCardForm();
      return;
    }
    if (method === 'bank-transfer-ng' || method === 'bank-transfer-e') {
      onBankTransfer(method);
      return;
    }
    onBankTransfer('bank-transfer-ng');
  }

  function handleSelect(key: string) {
    setSkrillWarning(false);
    setSelectedMethod(key);
  }

  function handleScroll(direction: 'left' | 'right') {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  }

  const isComingSoon =
    selectedMethod === 'cryptopay' ||
    selectedMethod === 'gpay' ||
    selectedMethod === 'applepay';

  const mainMethods: PaymentMethodItem[] = [
    {
      key: 'skrill',
      logoClass: 'skrill',
      logoText: 'Skrill',
      label: 'Skrill',
      sub: 'Online wallet',
    },
    {
      key: 'cryptopay',
      logoClass: 'crypto-logo',
      logoText: 'CP',
      label: 'CryptoPay',
      sub: 'Cryptocurrency',
    },
    {
      key: 'visa',
      logoClass: 'visa-logo',
      logoText: 'VISA',
      label: 'Visa / Mastercard',
      sub: 'Credit or Debit card',
    },
    {
      key: 'gpay',
      logoClass: 'gpay-logo',
      logoText: 'G',
      label: 'Google Pay',
      sub: 'Digital wallet',
    },
    {
      key: 'applepay',
      logoClass: 'apple-logo',
      logoText: 'AP',
      label: 'Apple Pay',
      sub: 'Digital wallet',
    },
  ];

  const altMethods: PaymentMethodItem[] = [
    {
      key: 'bank-transfer-ng',
      label: 'Bank Transfer NG',
      sub: 'Local bank deposit',
    },
    {
      key: 'bank-transfer-e',
      label: 'Bank Transfer E',
      sub: 'Electronic bank deposit',
    },
  ];

  const currentMethods = tab === 'main' ? mainMethods : altMethods;

  return (
    <main className="payment-page">
      <header className="payment-header">
        <button className="back-button visible" type="button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="payment-shell">
        <p className="eyebrow">FUND YOUR ACCOUNT</p>
        <h1>Choose how to deposit</h1>
        <p className="payment-intro">
          Select a secure payment method to add funds to your account.
        </p>

        <div className="payment-tabs">
          <button
            className={tab === 'main' ? 'payment-tab active' : 'payment-tab'}
            type="button"
            onClick={() => {
              setTab('main');
              setSelectedMethod(null);
              setSkrillWarning(false);
            }}
          >
            <CreditCard size={19} /> Main payment
          </button>
          <button
            className={tab === 'alternative' ? 'payment-tab active' : 'payment-tab'}
            type="button"
            onClick={() => {
              setTab('alternative');
              setSelectedMethod(null);
              setSkrillWarning(false);
            }}
          >
            <Landmark size={19} /> Alternative payment
          </button>
        </div>

        <div className="method-scroll-wrap">
          <button
            className="method-scroll-arrow left"
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="method-scroll" ref={scrollRef}>
            {currentMethods.map((m) => (
              <button
                className={selectedMethod === m.key ? 'method-card-h selected' : 'method-card-h'}
                type="button"
                key={m.key}
                onClick={() => handleSelect(m.key)}
              >
                {'logoClass' in m ? (
                  <span className={`method-logo ${m.logoClass}`}>{m.logoText}</span>
                ) : (
                  <span className="method-logo bank-logo">
                    <Landmark size={22} />
                  </span>
                )}
                <strong>{m.label}</strong>
                <span className="method-sub">{m.sub}</span>
                {selectedMethod === m.key && (
                  <Check className="method-check-badge" size={16} />
                )}
              </button>
            ))}
          </div>

          <button
            className="method-scroll-arrow right"
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        {selectedMethod && !skrillWarning && !isComingSoon && (
          <div className="secure-deposit-label fade-in">
            <ShieldCheck size={18} /> Secure deposit using {PAYMENT_LABELS[selectedMethod]}
          </div>
        )}

        {skrillWarning && selectedMethod === 'skrill' && (
          <div className="enrolled-toast" style={{ marginTop: 16 }}>
            <Info size={20} /> You don't have a Skrill account linked. Please choose another payment method.
          </div>
        )}

        {isComingSoon && (
          <div className="enrolled-toast" style={{ marginTop: 16 }}>
            <Info size={20} /> This payment method is coming soon. Please choose another option.
          </div>
        )}

        <button
          className="primary-button proceed"
          type="button"
          onClick={handleContinue}
          disabled={isComingSoon}
        >
          Continue <ArrowRight size={20} />
        </button>

        <button className="not-now-btn" type="button" onClick={onNotNow}>
          <Clock size={18} /> Not Now
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
      </section>

      <OwnerPaymentSettingsModal
        isOpen={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
      />

      <Footer />
    </main>
  );
}
