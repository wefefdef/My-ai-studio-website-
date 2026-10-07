import { CircleCheck, ArrowRight } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';

interface AllDonePageProps {
  onStartTrading: () => void;
}

export function AllDonePage({ onStartTrading }: AllDonePageProps) {
  return (
    <main className="payment-page all-done-page">
      <header className="payment-header">
        <div />
        <BrandMark />
        <LanguageButton />
      </header>

      <section className="all-done-shell">
        <div className="all-done-icon">
          <CircleCheck size={56} />
        </div>
        <h1>All Done!</h1>
        <p className="all-done-text">
          Your account is ready. You can now explore the markets and start your trading journey with
          a demo account.
        </p>
        <button
          className="primary-button start-trading-btn"
          type="button"
          onClick={onStartTrading}
        >
          Start Trading <ArrowRight size={20} />
        </button>
      </section>
    </main>
  );
}
