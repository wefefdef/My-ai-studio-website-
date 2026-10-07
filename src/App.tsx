import { useState, useEffect, useCallback } from 'react';
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from './services/firebase';

// Helper to extract invitation token from URL path or query params
function extractInviteToken(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const match = path.match(/^\/(?:invite|join|i)\/([^/?#]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const params = new URLSearchParams(window.location.search);
  const qToken = params.get('token') || params.get('invite');
  if (qToken) return qToken.trim();
  return null;
}

// Helper to determine the strictly legitimate next view for a user.
// Consolidates checks with StorageService to guarantee that 'details' and 'questionnaire'
// can NEVER be accessed again once completed, via back button or URL manipulation.
function resolveLegitimateView(targetView: ViewState, user: UserAccount | null): ViewState {
  if (!user) {
    if (targetView === 'register' || targetView === 'sign-in') {
      return targetView;
    }
    return 'landing';
  }

  const hasDetails = StorageService.hasCompletedPersonalDetails(user);
  const hasQuestionnaire = StorageService.hasCompletedQuestionnaire(user);
  const isCompleted =
    user.stage === 'trading' ||
    user.isVerified ||
    user.isLiveAccount ||
    (hasDetails && hasQuestionnaire);

  // If user has completed their onboarding or reached trading: NEVER EVER show details or questionnaire
  if (isCompleted) {
    if (
      targetView === 'details' ||
      targetView === 'questionnaire' ||
      targetView === 'sign-in' ||
      targetView === 'register' ||
      targetView === 'landing' ||
      targetView === 'all-done'
    ) {
      return 'trading';
    }
    return targetView;
  }

  // If details were already filled once: NEVER show details page again
  if (hasDetails && (targetView === 'details' || targetView === 'sign-in' || targetView === 'register')) {
    return user.stage === 'questionnaire' ? 'questionnaire' : 'payments';
  }

  // If questionnaire was already completed: NEVER show questionnaire again
  if (hasQuestionnaire && targetView === 'questionnaire') {
    return 'trading';
  }

  return targetView;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() =>
    StorageService.getCurrentUser()
  );

  const [view, setView] = useState<ViewState>(() => {
    const active = StorageService.getCurrentUser();
    // Check initial hash if present in URL
    const initialHash = window.location.hash.replace('#', '') as ViewState;
    if (active) {
      const candidate = initialHash || active.stage || 'trading';
      return resolveLegitimateView(candidate, active);
    }
    if (initialHash === 'register' || initialHash === 'sign-in') {
      return initialHash;
    }
    return 'landing';
  });

  const [historyStack, setHistoryStack] = useState<ViewState[]>([view]);
  const [depositAmount, setDepositAmount] = useState(200);
  const [depositMethod, setDepositMethod] = useState('bank-transfer-ng');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Registration feedback passed to Sign In page
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);

  // Routing guard for invitation tokens:
  // If an invitation token is marked as 'used' in Firebase, prevent rendering completely.
  const [isInviteBlocked, setIsInviteBlocked] = useState(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(() => Boolean(extractInviteToken()));

  useEffect(() => {
    const token = extractInviteToken();
    if (!token) {
      setIsCheckingInvite(false);
      return;
    }

    // Check if the server explicitly authorized this request as the valid first open
    const serverAllowedToken = typeof window !== 'undefined' ? (window as any).__INVITE_TOKEN_ALLOWED__ : null;
    if (serverAllowedToken && serverAllowedToken === token) {
      // Valid first opening! Clean up the URL in history so the one-time link is not in the address bar
      window.history.replaceState({ view: 'landing', stackIndex: 0 }, '', '/');
      setIsCheckingInvite(false);
      return;
    }

    const validToken = token;
    async function checkTokenInFirebase() {
      try {
        const snap = await getDoc(doc(db, 'invitations', validToken));
        if (!snap.exists() || snap.data()?.used || snap.data()?.status === 'used' || snap.data()?.status === 'revoked') {
          // Token is marked as 'used' in Firebase:
          // Trigger hard 404 response / prevent rendering permanently
          setIsInviteBlocked(true);
          document.title = '404 Not Found';
          return;
        }
        // Valid opening: clean URL so the token is not kept in address bar
        window.history.replaceState({ view: 'landing', stackIndex: 0 }, '', '/');
      } catch {
        setIsInviteBlocked(true);
        document.title = '404 Not Found';
      } finally {
        setIsCheckingInvite(false);
      }
    }

    checkTokenInFirebase();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync fresh persistent account from Cloud Firestore on initial page mount
  useEffect(() => {
    async function syncFirestore() {
      const activeUser = await StorageService.fetchFreshUserFromFirebase();
      if (activeUser) {
        setCurrentUser(activeUser);
        const resolved = resolveLegitimateView(view, activeUser);
        if (resolved !== view) {
          setView(resolved);
          window.history.replaceState({ view: resolved, stackIndex: 0 }, '', '#' + resolved);
        }
      }
    }
    syncFirestore();
  }, []);

  // Initialize browser history entry on mount so mobile hardware back button operates properly
  useEffect(() => {
    window.history.replaceState({ view, stackIndex: 0 }, '', '#' + view);
  }, []);

  // Keep currentUser state in sync with storage updates
  useEffect(() => {
    if (currentUser?.email) {
      const refreshed = StorageService.findUserByEmail(currentUser.email);
      if (refreshed) setCurrentUser(refreshed);
    }
  }, [view]);

  // Determine fallback 1-step back sequence
  const getOneStepBack = useCallback(
    (current: ViewState): ViewState => {
      const active = currentUser || StorageService.getCurrentUser();
      const hasDetails = StorageService.hasCompletedPersonalDetails(active);
      const hasQuestionnaire = StorageService.hasCompletedQuestionnaire(active);

      switch (current) {
        case 'register':
        case 'sign-in':
          return 'landing';

        case 'details':
          return 'sign-in';

        case 'payments':
          if (active?.stage === 'trading' || active?.isLiveAccount || hasDetails) {
            return 'trading';
          }
          return 'details';

        case 'bank-transfer':
          return 'payments';

        case 'bank-details':
          return 'bank-transfer';

        case 'card-form':
          return 'payments';

        case 'questionnaire':
          if (hasDetails) {
            return 'payments';
          }
          return 'bank-details';

        case 'all-done':
        case 'profile':
        case 'withdraw':
          return 'trading';

        case 'trading':
          return 'trading'; // Safe boundary on platform dashboard

        default:
          return 'landing';
      }
    },
    [currentUser]
  );

  // Navigate to next view, enforcing rules & pushing/replacing browser history
  const navigate = useCallback(
    (rawNext: ViewState, replace: boolean = false) => {
      const active = currentUser || StorageService.getCurrentUser();
      const next = resolveLegitimateView(rawNext, active);

      if (next === view) return;

      if (replace) {
        window.history.replaceState({ view: next }, '', '#' + next);
        setHistoryStack((prev) => [...prev.slice(0, -1), next]);
      } else {
        window.history.pushState({ view: next }, '', '#' + next);
        setHistoryStack((prev) => [...prev, next]);
      }

      setView(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [view, currentUser]
  );

  // Universal one-step back handler for platform back buttons and mobile devices
  const goBack = useCallback(() => {
    // If browser history has our stack, use window.history.back() to fire popstate
    if (historyStack.length > 1) {
      window.history.back();
    } else {
      const prev = getOneStepBack(view);
      navigate(prev, true);
    }
  }, [historyStack, view, getOneStepBack, navigate]);

  // Mobile phone hardware back button & browser back button listener
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const active = currentUser || StorageService.getCurrentUser();

      let targetView: ViewState = e.state?.view || getOneStepBack(view);
      const resolved = resolveLegitimateView(targetView, active);

      // If user attempted to return to a completed/forbidden page, rewrite history entry immediately
      if (resolved !== targetView) {
        window.history.replaceState({ view: resolved }, '', '#' + resolved);
      }

      setView(resolved);

      // Purge any completed onboarding pages from the in-memory history stack
      setHistoryStack((prev) => {
        const cleaned = prev.filter((v) => {
          if (v === 'details' && StorageService.hasCompletedPersonalDetails(active)) return false;
          if (v === 'questionnaire' && StorageService.hasCompletedQuestionnaire(active)) return false;
          if ((v === 'register' || v === 'sign-in') && active) return false;
          return true;
        });
        return cleaned.length > 1 ? cleaned.slice(0, -1) : [resolved];
      });
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, currentUser, getOneStepBack]);

  // URL Manipulation Guard (e.g. user manually typing '#details' or '#questionnaire' in address bar)
  useEffect(() => {
    function handleHashChange() {
      const hashView = window.location.hash.replace('#', '') as ViewState;
      if (hashView) {
        const active = currentUser || StorageService.getCurrentUser();
        const resolved = resolveLegitimateView(hashView, active);

        if (resolved !== hashView) {
          // Immediately redirect and replace the manipulated URL
          window.history.replaceState({ view: resolved }, '', '#' + resolved);
        }

        if (resolved !== view) {
          setView(resolved);
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [view, currentUser]);

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

    const hasDetails = StorageService.hasCompletedPersonalDetails(user);
    const hasQuestionnaire = StorageService.hasCompletedQuestionnaire(user);
    const isCompleted =
      user.stage === 'trading' ||
      user.isVerified ||
      user.isLiveAccount ||
      (hasDetails && hasQuestionnaire);

    // If details & questionnaire are already filled, go directly to trading! Never ask again!
    if (isCompleted) {
      // Purge onboarding pages from history stack
      setHistoryStack(['trading']);
      navigate('trading', true);
    } else if (hasDetails) {
      setHistoryStack(['payments']);
      navigate(user.stage === 'details' ? 'payments' : (user.stage || 'payments'), true);
    } else {
      navigate('details', true);
    }
  }

  function handleLogout() {
    StorageService.logout();
    setCurrentUser(null);
    setHistoryStack(['landing']);
    navigate('landing', true);
  }

  function handlePersonalDetailsProceed() {
    const activeEmail = currentUser?.email || StorageService.getCurrentUser()?.email;
    if (activeEmail) {
      const updated = StorageService.updateUserByEmail(activeEmail, {
        personalDetailsCompleted: true,
        stage: 'payments',
      });
      if (updated) setCurrentUser(updated);
    }

    // Effectively remove 'details', 'register', 'sign-in' from history stack
    setHistoryStack((prev) =>
      prev.filter((v) => v !== 'details' && v !== 'register' && v !== 'sign-in' && v !== 'landing')
    );

    // Replace browser history entry so back button can NEVER return to details
    navigate('payments', true);
  }

  function handleDepositInitiated(amount: number) {
    setDepositAmount(amount);
    if (currentUser?.email) {
      // Record pending deposit ONLY - strictly DO NOT credit liveEquity before passcode
      const updated = StorageService.recordPendingDeposit(currentUser.email, {
        amount,
        method: depositMethod,
        date: new Date().toISOString(),
        status: 'pending',
      });
      if (updated) setCurrentUser(updated);
    }
    navigate('bank-details');
  }

  function handleVerifyPasscodeAndCredit(passcode: string): boolean {
    if (!currentUser?.email) return false;
    const res = StorageService.verifyAndCreditDeposit(
      currentUser.email,
      depositAmount,
      passcode,
      depositMethod
    );
    if (res.success && res.user) {
      setCurrentUser(res.user);
      return true;
    }
    return false;
  }

  function handleBankDetailsDone() {
    if (currentUser?.email) {
      const hasQuestionnaire = StorageService.hasCompletedQuestionnaire(currentUser);
      if (hasQuestionnaire || currentUser.stage === 'trading' || currentUser.isLiveAccount) {
        // Questionnaire already filled; immediately open live account and purge onboarding history
        const updated = StorageService.updateUserByEmail(currentUser.email, {
          stage: 'trading',
          isLiveAccount: true,
          accountType: 'live',
          questionnaireCompleted: true,
          personalDetailsCompleted: true,
        });
        if (updated) setCurrentUser(updated);
        setHistoryStack(['trading']);
        navigate('trading', true);
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
        questionnaireCompleted: true,
        personalDetailsCompleted: true,
        isVerified: true,
        isLiveAccount: true,
        accountType: 'live',
      });
      if (updated) setCurrentUser(updated);
    }

    // Effectively remove all onboarding pages ('questionnaire', 'details', 'payments') from history stack
    setHistoryStack(['trading']);

    // Replace browser history entry so back button can NEVER return to questionnaire
    navigate('trading', true);
  }

  function handleStartTrading() {
    if (currentUser?.email) {
      const updated = StorageService.completeAllDone(currentUser.email);
      if (updated) setCurrentUser(updated);
    }
    setHistoryStack(['trading']);
    navigate('trading', true);
  }

  // --- ROUTED VIEWS WITH EXACT 1-STEP BACK & PERMANENT STAGE GUARDS ---
  function renderView() {
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
        onBack={goBack}
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
        onBack={goBack}
      />
    );
  }

  if (view === 'details') {
    return (
      <PersonalDetailsPage
        currentUser={currentUser}
        onBack={goBack}
        onProceed={handlePersonalDetailsProceed}
      />
    );
  }

  if (view === 'payments') {
    return (
      <PaymentMethodsPage
        onBack={goBack}
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
        onBack={goBack}
        onDeposit={handleDepositInitiated}
      />
    );
  }

  if (view === 'bank-details') {
    return (
      <BankDetailsPage
        amount={depositAmount}
        onBack={goBack}
        onDone={handleBankDetailsDone}
        onVerifyPasscode={handleVerifyPasscodeAndCredit}
      />
    );
  }

  if (view === 'card-form') {
    return <CardFormPage onBack={goBack} />;
  }

  if (view === 'questionnaire') {
    return (
      <QuestionnairePage
        currentUser={currentUser}
        onComplete={handleQuestionnaireComplete}
        onBack={goBack}
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
        onBack={goBack}
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
      return <WithdrawalPage onBack={goBack} />;
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

  // If request used an invitation token marked 'used' in Firebase, prevent rendering completely
  if (isInviteBlocked) {
    return null;
  }

  if (isCheckingInvite) {
    return null;
  }

  return renderView();
}

export default App;
