import React, { useState, useEffect } from 'react';
import { ViewState, UserAccount } from './types';
import { LandingPage } from './components/LandingPage';
import { RegisterPage } from './components/RegisterPage';
import { SignInPage } from './components/SignInPage';
import { PersonalDetailsPage } from './components/PersonalDetailsPage';
import { PaymentMethodsPage } from './components/PaymentMethodsPage';
import { BankTransferDepositPage } from './components/BankTransferDepositPage';
import { BankDetailsPage } from './components/BankDetailsPage';
import { CardFormPage } from './components/CardFormPage';
import { QuestionnairePage } from './components/QuestionnairePage';
import { AllDonePage } from './components/AllDonePage';
import { TradingDashboard } from './components/TradingDashboard';
import { FullProfilePage } from './components/FullProfilePage';
import { WithdrawalPage } from './components/WithdrawalPage';
import { StorageService } from './services/storage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() =>
    StorageService.getCurrentUser()
  );

  const [view, setView] = useState<ViewState>(() => {
    const active = StorageService.getCurrentUser();
    if (active) {
      // Resume from where the user left off
      return active.stage || 'trading';
    }
    return 'landing';
  });

  const [prevView, setPrevView] = useState<ViewState>('landing');
  const [depositAmount, setDepositAmount] = useState(200);
  const [depositMethod, setDepositMethod] = useState('bank-transfer-ng');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Registration feedback passed to Sign In page
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keep currentUser state in sync with storage updates
  useEffect(() => {
    if (currentUser?.email) {
      const refreshed = StorageService.findUserByEmail(currentUser.email);
      if (refreshed) setCurrentUser(refreshed);
    }
  }, [view]);

  function navigate(next: ViewState) {
    setPrevView(view);
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRegistered(email: string) {
    setPrefilledEmail(email);
    setRegistrationMessage(
      'Account created successfully! Please sign in with your permanent credentials.'
    );
    navigate('sign-in');
  }

  function handleLoginSuccess(user: UserAccount) {
    setCurrentUser(user);
    setRegistrationMessage(null);

    // Continue from where the user left off:
    // If they already completed everything or have live account, go straight to trading!
    if (user.stage === 'trading' || user.isVerified || user.isLiveAccount) {
      navigate('trading');
    } else {
      navigate(user.stage || 'details');
    }
  }

  function handleLogout() {
    StorageService.logout();
    setCurrentUser(null);
    navigate('landing');
  }

  function handlePersonalDetailsProceed() {
    if (currentUser?.email) {
      const updated = StorageService.updateUserByEmail(currentUser.email, {
        stage: 'payments',
      });
      if (updated) setCurrentUser(updated);
    }
    navigate('payments');
  }

  function handleDepositCompleted(amount: number) {
    setDepositAmount(amount);
    if (currentUser?.email) {
      const updated = StorageService.saveDeposit(currentUser.email, {
        amount,
        method: depositMethod,
        date: new Date().toISOString(),
        status: 'completed',
      });
      if (updated) setCurrentUser(updated);
    }
    navigate('bank-details');
  }

  function handleBankDetailsDone() {
    if (currentUser?.email) {
      const hasQuestionnaire = !!currentUser.questionnaire;
      if (hasQuestionnaire) {
        // Questionnaire already filled; immediately open live account
        const updated = StorageService.updateUserByEmail(currentUser.email, {
          stage: 'trading',
          isLiveAccount: true,
          accountType: 'live',
        });
        if (updated) setCurrentUser(updated);
        navigate('trading');
        return;
      }

      const updated = StorageService.updateUserByEmail(currentUser.email, {
        stage: 'questionnaire',
      });
      if (updated) setCurrentUser(updated);
      navigate('questionnaire');
    } else {
      navigate('trading');
    }
  }

  function handleQuestionnaireComplete() {
    if (currentUser?.email) {
      const updated = StorageService.updateUserByEmail(currentUser.email, {
        stage: 'trading',
        isVerified: true,
        isLiveAccount: true,
        accountType: 'live',
      });
      if (updated) setCurrentUser(updated);
    }
    navigate('trading');
  }

  function handleStartTrading() {
    if (currentUser?.email) {
      const updated = StorageService.completeAllDone(currentUser.email);
      if (updated) setCurrentUser(updated);
    }
    navigate('trading');
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={() => {
          setRegistrationMessage(null);
          navigate('sign-in');
        }}
        onStartTrading={() => navigate('register')}
      />
    );
  }

  if (view === 'register') {
    return (
      <RegisterPage
        onRegistered={handleRegistered}
        onGoToLogin={() => {
          setRegistrationMessage(null);
          navigate('sign-in');
        }}
        onBack={() => navigate('landing')}
      />
    );
  }

  if (view === 'sign-in') {
    return (
      <SignInPage
        initialEmail={prefilledEmail}
        registrationSuccessMessage={registrationMessage}
        onLoginSuccess={handleLoginSuccess}
        onGoToRegister={() => navigate('register')}
        onBack={() => navigate('landing')}
      />
    );
  }

  if (view === 'details') {
    return (
      <PersonalDetailsPage
        currentUser={currentUser}
        onBack={() => navigate('sign-in')}
        onProceed={handlePersonalDetailsProceed}
      />
    );
  }

  if (view === 'payments') {
    return (
      <PaymentMethodsPage
        onBack={() => navigate(prevView === 'trading' ? 'trading' : 'details')}
        onBankTransfer={(m) => {
          setDepositMethod(m);
          navigate('bank-transfer');
        }}
        onCardForm={() => navigate('card-form')}
        onNotNow={() => {
          if (currentUser?.email) {
            StorageService.updateUserByEmail(currentUser.email, {
              stage: 'questionnaire',
            });
          }
          navigate('questionnaire');
        }}
      />
    );
  }

  if (view === 'bank-transfer') {
    return (
      <BankTransferDepositPage
        method={depositMethod}
        onBack={() => navigate('payments')}
        onDeposit={handleDepositCompleted}
      />
    );
  }

  if (view === 'bank-details') {
    return (
      <BankDetailsPage
        amount={depositAmount}
        onBack={() => navigate('bank-transfer')}
        onDone={handleBankDetailsDone}
      />
    );
  }

  if (view === 'card-form') {
    return <CardFormPage onBack={() => navigate('payments')} />;
  }

  if (view === 'questionnaire') {
    return (
      <QuestionnairePage
        currentUser={currentUser}
        onComplete={handleQuestionnaireComplete}
        onBack={() => navigate('payments')}
      />
    );
  }

  if (view === 'all-done') {
    return <AllDonePage onStartTrading={handleStartTrading} />;
  }

  if (view === 'profile') {
    return (
      <FullProfilePage
        currentUser={currentUser}
        onBack={() => navigate('trading')}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
        onUserUpdated={(updated) => setCurrentUser(updated)}
        onSwitchAccountType={(type) => {
          if (currentUser?.email) {
            const updated = StorageService.updateUserByEmail(currentUser.email, {
              accountType: type,
            });
            if (updated) setCurrentUser(updated);
          }
        }}
      />
    );
  }

  if (view === 'withdraw') {
    return <WithdrawalPage onBack={() => navigate('trading')} />;
  }

  return (
    <TradingDashboard
      currentUser={currentUser}
      onDeposit={() => navigate('payments')}
      onWithdraw={() => navigate('withdraw')}
      theme={theme}
      onThemeChange={setTheme}
      onLogout={handleLogout}
      onUserUpdated={(updated) => setCurrentUser(updated)}
      onOpenProfile={() => navigate('profile')}
    />
  );
}
