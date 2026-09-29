import React, { useState, useEffect } from 'react';
import { ArrowLeft, Banknote, ArrowRight, LoaderCircle } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';

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

      <section className="payment-shell deposit-shell">
        <p className="eyebrow">ALTERNATIVE PAYMENT</p>
        <h1>Secure deposit using {methodName}</h1>
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
          >
            Deposit <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
