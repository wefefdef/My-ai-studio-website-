import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { QUESTIONS } from '../data/questionnaire';
import { UserAccount } from '../types';
import { StorageService } from '../services/storage';

interface QuestionnairePageProps {
  currentUser?: UserAccount | null;
  onComplete: () => void;
  onBack: () => void;
}

export function QuestionnairePage({
  currentUser,
  onComplete,
  onBack,
}: QuestionnairePageProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [tin, setTin] = useState('');
  const [notUsCitizen, setNotUsCitizen] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const totalQuestions = QUESTIONS.length + 1; // 6 questions + 1 TIN identification
  const progressPercent = ((step + 1) / totalQuestions) * 100;

  function handleNext() {
    setDirection('forward');
    if (step < totalQuestions - 1) {
      setStep((prev) => prev + 1);
    } else {
      // Save to user storage
      if (currentUser?.email) {
        StorageService.saveQuestionnaire(currentUser.email, {
          age: answers[0],
          profession: answers[1],
          experience: answers[2],
          reason: answers[3],
          method: answers[4],
          source: answers[5],
          tin: tin.trim() || undefined,
          notUsCitizen,
        });
      }
      onComplete();
    }
  }

  function handleBack() {
    setDirection('back');
    if (step > 0) {
      setStep((prev) => prev - 1);
    } else {
      onBack();
    }
  }

  function selectOption(opt: string) {
    setAnswers({ ...answers, [step]: opt });
  }

  const isStepValid =
    step < QUESTIONS.length
      ? Boolean(answers[step])
      : notUsCitizen || tin.trim().length > 0;

  return (
    <main className="payment-page">
      <header className="payment-header">
        <button
          className="back-button visible"
          type="button"
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="questionnaire-shell">
        <div className="q-progress-bar">
          <div className="q-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="q-step-label">
          Question {step + 1} of {totalQuestions}
        </p>

        <div className={`q-card q-slide-${direction}`} key={step}>
          {step < QUESTIONS.length ? (
            <>
              <h1 className="q-title">{QUESTIONS[step].title}</h1>
              <p className="q-subtitle">{QUESTIONS[step].subtitle}</p>
              <div className="q-options">
                {QUESTIONS[step].options.map((opt) => (
                  <button
                    type="button"
                    className={answers[step] === opt ? 'q-option selected' : 'q-option'}
                    key={opt}
                    onClick={() => selectOption(opt)}
                  >
                    <span>{opt}</span>
                    {answers[step] === opt && <Check size={18} />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="q-title">Identification</h1>
              <p className="q-subtitle">Tax Identification Number (TIN)</p>
              <div className="q-tin-section">
                <div className="input-wrap">
                  <span>TIN Number</span>
                  <input
                    type="text"
                    placeholder="Enter your TIN number"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    disabled={notUsCitizen}
                  />
                </div>
                <label className="q-checkbox">
                  <input
                    type="checkbox"
                    checked={notUsCitizen}
                    onChange={(e) => {
                      setNotUsCitizen(e.target.checked);
                      if (e.target.checked) setTin('');
                    }}
                  />
                  <span>I am not a US citizen</span>
                </label>
              </div>
            </>
          )}
        </div>

        <button
          className="primary-button proceed"
          type="button"
          onClick={handleNext}
          disabled={!isStepValid}
        >
          {step === totalQuestions - 1 ? 'Complete Verification ' : 'Next '}
          <ArrowRight size={20} />
        </button>
      </section>
    </main>
  );
}
