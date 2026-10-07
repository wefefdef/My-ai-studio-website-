import { useState, useRef } from 'react';
import {
  CreditCard,
  Landmark,
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
import {
  VisaMastercardBadge,
  BankTransferSticker,
  BankInstitutionIcon,
  CryptoClusterIcon,
  BitcoinIcon,
  TetherIcon,
  EthereumIcon,
  CircleBackButton,
  CircleForwardArrow,
  CircleScrollArrow,
} from './PaymentMethodIcons';

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
  type: 'bank' | 'visa-mastercard' | 'crypto' | 'skrill' | 'gpay' | 'applepay';
}

const PAYMENT_LABELS: Record<string, string> = {
  skrill: 'Skrill',
  cryptopay: 'CryptoPay (BTC, USDT, ETH)',
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
        left: direction === 'left' ? -220 : 220,
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
      key: 'bank-transfer-ng',
      type: 'bank',
      label: 'Bank Transfer',
      sub: 'Direct bank deposit',
    },
    {
      key: 'visa',
      type: 'visa-mastercard',
      label: 'Visa / Mastercard',
      sub: 'Credit or Debit card',
    },
    {
      key: 'cryptopay',
      type: 'crypto',
      label: 'CryptoPay',
      sub: 'BTC, USDT, ETH, USDC',
    },
    {
      key: 'skrill',
      type: 'skrill',
      label: 'Skrill',
      sub: 'Online wallet',
    },
    {
      key: 'gpay',
      type: 'gpay',
      label: 'Google Pay',
      sub: 'Digital wallet',
    },
    {
      key: 'applepay',
      type: 'applepay',
      label: 'Apple Pay',
      sub: 'Digital wallet',
    },
  ];

  const altMethods: PaymentMethodItem[] = [
    {
      key: 'bank-transfer-ng',
      type: 'bank',
      label: 'Bank Transfer NG',
      sub: 'Local bank deposit',
    },
    {
      key: 'bank-transfer-e',
      type: 'bank',
      label: 'Bank Transfer E',
      sub: 'Electronic bank transfer',
    },
  ];

  const currentMethods = tab === 'main' ? mainMethods : altMethods;

  function renderMethodVisual(m: PaymentMethodItem) {
    if (m.type === 'bank') {
      return (
        <span className="method-logo badge-wrap" style={{ padding: '3px 6px' }}>
          <BankInstitutionIcon size={32} />
        </span>
      );
    }

    if (m.type === 'visa-mastercard') {
      return (
        <span className="method-logo badge-wrap" style={{ padding: '4px 6px' }}>
          <VisaMastercardBadge size="sm" />
        </span>
      );
    }

    if (m.type === 'crypto') {
      return (
        <span className="method-logo badge-wrap" style={{ padding: '3px 8px' }}>
          <CryptoClusterIcon size={30} />
        </span>
      );
    }

    if (m.type === 'skrill') {
      return <span className="method-logo skrill">Skrill</span>;
    }

    if (m.type === 'gpay') {
      return <span className="method-logo gpay-logo">G</span>;
    }

    if (m.type === 'applepay') {
      return <span className="method-logo apple-logo">AP</span>;
    }

    return (
      <span className="method-logo bank-logo">
        <Landmark size={22} />
      </span>
    );
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <CircleBackButton onClick={onBack} ariaLabel="Go back" />
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="payment-shell">
        <p className="eyebrow">FUND YOUR ACCOUNT</p>
        <h1>Choose how to deposit</h1>
        <p className="payment-intro">
          Select a verified payment method to securely add funds to your trading account.
        </p>

        <div className="payment-tabs">
          <button
            className={tab === 'main' ? 'payment-tab active' : 'payment-tab'}
            type="button"
            onClick={() => {
              setTab('main');
              setSelectedMethod('bank-transfer-ng');
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
              setSelectedMethod('bank-transfer-ng');
              setSkrillWarning(false);
            }}
          >
            <Landmark size={19} /> Alternative payment
          </button>
        </div>

        <div className="method-scroll-wrap">
          <CircleScrollArrow
            direction="left"
            onClick={() => handleScroll('left')}
            ariaLabel="Scroll payment methods left"
          />

          <div className="method-scroll" ref={scrollRef}>
            {currentMethods.map((m) => {
              const isSelected = selectedMethod === m.key;
              return (
                <button
                  className={isSelected ? 'method-card-h selected' : 'method-card-h'}
                  type="button"
                  key={m.key + m.type}
                  onClick={() => handleSelect(m.key)}
                  style={{ minWidth: 154 }}
                >
                  {renderMethodVisual(m)}
                  <strong style={{ marginTop: 2 }}>{m.label}</strong>
                  <span className="method-sub">{m.sub}</span>
                  {isSelected && (
                    <Check className="method-check-badge" size={16} />
                  )}
                </button>
              );
            })}
          </div>

          <CircleScrollArrow
            direction="right"
            onClick={() => handleScroll('right')}
            ariaLabel="Scroll payment methods right"
          />
        </div>

        {/* Selected method dynamic security identifier */}
        {selectedMethod && !skrillWarning && !isComingSoon && (
          <div
            className="secure-deposit-label fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 18px',
              borderRadius: 12,
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              marginTop: 18,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text, #111820)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <ShieldCheck size={20} color="#16a34a" />
            <span>Secure deposit using {PAYMENT_LABELS[selectedMethod]}</span>
            {(selectedMethod === 'bank-transfer-ng' || selectedMethod === 'bank-transfer-e') && (
              <BankTransferSticker size="sm" />
            )}
            {selectedMethod === 'visa' && <VisaMastercardBadge size="sm" />}
            {selectedMethod === 'cryptopay' && (
              <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <BitcoinIcon size={18} />
                <TetherIcon size={18} />
                <EthereumIcon size={18} />
              </div>
            )}
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

        {/* Standardized Circular Action Arrow on Proceed */}
        <button
          className="primary-button proceed"
          type="button"
          onClick={handleContinue}
          disabled={isComingSoon}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 20,
          }}
        >
          <span>Continue</span>
          <CircleForwardArrow />
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
