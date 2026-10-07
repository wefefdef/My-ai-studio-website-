import { useState } from 'react';
import { X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';
import { VisaMastercardBadge, CircleBackButton, CircleForwardArrow } from './PaymentMethodIcons';

interface CardFormPageProps {
  onBack: () => void;
}

export function CardFormPage({ onBack }: CardFormPageProps) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [hasError, setHasError] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const isValid =
    name.trim() &&
    number.trim() &&
    expiry.trim() &&
    cvv.trim() &&
    typeof amount === 'number' &&
    amount >= 1 &&
    accepted;

  function handleSubmit() {
    if (isValid) {
      setHasError(true);
    }
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <CircleBackButton onClick={onBack} ariaLabel="Go back" />
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="payment-shell deposit-shell">
        <p className="eyebrow">VISA / MASTERCARD</p>
        <h1>Enter your card details</h1>
        
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 14px' }}>
          <VisaMastercardBadge size="md" />
        </div>

        <p className="payment-intro">Fill in your card information to make a secure deposit.</p>

        <div className="card-form-panel">
          <div className="input-wrap">
            <span>Cardholder name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name on card"
            />
          </div>

          <div className="input-wrap">
            <span>Card number</span>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              inputMode="numeric"
            />
          </div>

          <div className="two-columns">
            <div className="input-wrap">
              <span>Expiry date</span>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM / YY"
                maxLength={7}
                inputMode="numeric"
              />
            </div>
            <div className="input-wrap">
              <span>CVV</span>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                maxLength={4}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="input-wrap" style={{ marginTop: 8 }}>
            <span>Amount (USD)</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value ? Number(e.target.value) : '')
              }
              placeholder="Enter amount"
            />
          </div>

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

          {hasError && (
            <div className="card-error">
              <X size={18} /> Your card is not applicable for this transaction.
            </div>
          )}

          <button
            className="primary-button deposit-button"
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              marginTop: 20,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span>Deposit</span>
            <CircleForwardArrow />
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
