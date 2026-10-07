import { useState } from 'react';
import { Banknote, X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';
import { CircleBackButton, CircleForwardArrow } from './PaymentMethodIcons';

interface WithdrawalPageProps {
  onBack: () => void;
}

export function WithdrawalPage({ onBack }: WithdrawalPageProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [hasError, setHasError] = useState(false);

  const isValid =
    typeof amount === 'number' &&
    amount >= 1 &&
    bankName.trim() &&
    accountNumber.trim() &&
    accountHolder.trim();

  function handleWithdraw() {
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
        <p className="eyebrow">WITHDRAW FUNDS</p>
        <h1>Withdraw money</h1>
        <p className="payment-intro">
          Enter the amount and bank details where you want to receive your funds.
        </p>

        <div className="amount-panel">
          <div className="amount-heading">
            <Banknote size={22} />
            <span>Withdrawal amount</span>
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

          <div className="input-wrap">
            <span>Bank name</span>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Enter your bank name"
            />
          </div>

          <div className="input-wrap">
            <span>Account number</span>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              inputMode="numeric"
            />
          </div>

          <div className="input-wrap">
            <span>Account holder name</span>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Enter account holder name"
            />
          </div>

          {hasError && (
            <div className="card-error">
              <X size={18} /> You have no live account to withdraw money from. Please switch to a live
              trading account to make withdrawals.
            </div>
          )}

          <button
            className="primary-button deposit-button"
            type="button"
            onClick={handleWithdraw}
            disabled={!isValid}
            style={{
              marginTop: 20,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span>Withdraw</span>
            <CircleForwardArrow />
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
