import React, { useState, useEffect, useCallback } from 'react';
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
import { InvitationService } from './services/invitationService';
import { Clock } from 'lucide-react';
import { AccessExpiredScreen } from './components/AccessExpiredScreen';

interface ActiveInviteState {
  token: string;
  expiresAt: number;
  durationStr?: string;
}

interface InviteLockState {
  isLocked: boolean;
  token?: string | null;
  expiresAt?: number | null;
  reason?: string;
}

function formatCountdown(totalSecs: number): string {
  if (totalSecs <= 0) return '00:00';
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

export default function App() {
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

  // Temporary Invitation Link status
  const [inviteNotice, setInviteNotice] = useState<{
    valid: boolean;
    token?: string;
    message?: string;
  } | null>(null);

  // Active Invite & Strict Expiration Enforcement State
  const [activeInvite, setActiveInvite] = useState<ActiveInviteState | null>(null);
  const [inviteLock, setInviteLock] = useState<InviteLockState>({ isLocked: false });
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // 1. Check for invitation token in URL query (?invite=...), pathname (/invite/...), hash (#invite/...), or stored session
  useEffect(() => {
    async function checkInviteToken() {
      const searchParams = new URLSearchParams(window.location.search);
      const queryToken =
        searchParams.get('invite') ||
        searchParams.get('token') ||
        searchParams.get('inv');
      const pathMatch = window.location.pathname.match(/\/invite\/([a-zA-Z0-9_-]+)/);
      const hashMatch = window.location.hash.match(/invite\/([a-zA-Z0-9_-]+)/);
      const urlToken = queryToken || (pathMatch ? pathMatch[1] : (hashMatch ? hashMatch[1] : null));

      // Either urlToken, or previously saved active invite token
      const storedToken =
        sessionStorage.getItem('activeInviteToken') ||
        localStorage.getItem('activeInviteToken');
      const token = urlToken || storedToken;

      if (token) {
        const res = await InvitationService.validateInviteToken(token);
        if (res.valid && res.expiresAt) {
          const inviteData: ActiveInviteState = {
            token,
            expiresAt: res.expiresAt,
            durationStr: res.durationStr,
          };
          setActiveInvite(inviteData);
          setInviteLock({ isLocked: false });
          sessionStorage.setItem('activeInviteToken', token);
          sessionStorage.setItem('activeInviteExpiresAt', String(res.expiresAt));
          localStorage.setItem('activeInviteToken', token);
          localStorage.setItem('activeInviteExpiresAt', String(res.expiresAt));

          if (urlToken) {
            setInviteNotice({
              valid: true,
              token,
              message: `Temporary invitation access active (${res.durationStr || 'Authorized'}). Welcome!`,
            });
            setTimeout(() => setInviteNotice(null), 6000);
          }

          if (queryToken) {
            searchParams.delete('invite');
            searchParams.delete('token');
            searchParams.delete('inv');
            const newSearch = searchParams.toString();
            const cleanUrl =
              window.location.pathname +
              (newSearch ? `?${newSearch}` : '') +
              window.location.hash;
            window.history.replaceState({ view: 'landing' }, '', cleanUrl || '/');
          } else if (window.location.pathname.startsWith('/invite/')) {
            window.history.replaceState({ view: 'landing' }, '', '/');
          }
        } else {
          // EXPIRED OR INVALID TOKEN! LOCK SCREEN IMMEDIATELY!
          sessionStorage.removeItem('activeInviteToken');
          sessionStorage.removeItem('activeInviteExpiresAt');
          localStorage.removeItem('activeInviteToken');
          localStorage.removeItem('activeInviteExpiresAt');
          setActiveInvite(null);

          setInviteLock({
            isLocked: true,
            token,
            expiresAt: res.expiresAt || null,
            reason:
              res.status === 'revoked'
                ? 'This invitation link has been revoked by the administrator.'
                : 'This temporary invitation link has expired. Access to the platform is now locked.',
          });
        }
      }
    }
    checkInviteToken();
  }, []);

  // 2. Real-time ticking heartbeat: Enforce strict second-by-second expiration
  useEffect(() => {
    if (!activeInvite?.expiresAt) {
      setSecondsRemaining(null);
      return;
    }

    function tick() {
      const now = Date.now();
      const diff = activeInvite!.expiresAt - now;

      if (diff <= 0) {
        // EXPIRED THE EXACT SECOND THE DURATION ENDS!
        const expiredToken = activeInvite!.token;
        const expiredAt = activeInvite!.expiresAt;

        setActiveInvite(null);
        setSecondsRemaining(0);
        sessionStorage.removeItem('activeInviteToken');
        sessionStorage.removeItem('activeInviteExpiresAt');
        localStorage.removeItem('activeInviteToken');
        localStorage.removeItem('activeInviteExpiresAt');

        setInviteLock({
          isLocked: true,
          token: expiredToken,
          expiresAt: expiredAt,
          reason: 'Your authorized temporary access time has expired. Platform features are now locked.',
        });

        // Mark expired in Firestore
        InvitationService.markExpired(expiredToken);
      } else {
        setSecondsRemaining(Math.ceil(diff / 1000));
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeInvite]);

  // 3. Periodic background check to catch owner revoking the invitation in real time
  useEffect(() => {
    if (!activeInvite?.token) return;

    async function revalidate() {
      if (!activeInvite?.token) return;
      const res = await InvitationService.validateInviteToken(activeInvite.token);
      if (!res.valid) {
        const token = activeInvite.token;
        const expiresAt = res.expiresAt || activeInvite.expiresAt;
        setActiveInvite(null);
        sessionStorage.removeItem('activeInviteToken');
        sessionStorage.removeItem('activeInviteExpiresAt');
        localStorage.removeItem('activeInviteToken');
        localStorage.removeItem('activeInviteExpiresAt');

        setInviteLock({
          isLocked: true,
          token,
          expiresAt,
          reason:
            res.status === 'revoked'
              ? 'This invitation link has been revoked by the administrator.'
              : 'Your temporary invitation has expired.',
        });
      }
    }

    const interval = setInterval(revalidate, 15000);
    window.addEventListener('focus', revalidate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', revalidate);
    };
  }, [activeInvite?.token]);

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
    const activeInvite = sessionStorage.getItem('activeInviteToken');
    if (activeInvite) {
      InvitationService.associateUserWithInvite(activeInvite, email);
    }
    setPrefilledEmail(email);
    setRegistrationMessage(
      'Account created successfully! Please sign in with your permanent credentials.'
    );
    navigate('sign-in');
  }

  function handleLoginSuccess(user: UserAccount) {
    setCurrentUser(user);
    setRegistrationMessage(null);

    const activeInvite = sessionStorage.getItem('activeInviteToken');
    if (activeInvite && user.email) {
      InvitationService.associateUserWithInvite(activeInvite, user.email);
    }

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
        onDeposit={handleDepositCompleted}
      />
    );
  }

  if (view === 'bank-details') {
    return (
      <BankDetailsPage
        amount={depositAmount}
        onBack={goBack}
        onDone={handleBankDetailsDone}
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

  if (inviteLock.isLocked) {
    return (
      <AccessExpiredScreen
        token={inviteLock.token}
        expiresAt={inviteLock.expiresAt}
        reason={inviteLock.reason}
        onUnlocked={(newToken) => {
          setInviteLock({ isLocked: false });
          window.location.search = `?invite=${encodeURIComponent(newToken)}`;
        }}
      />
    );
  }

  return (
    <>
      {inviteNotice && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            background: inviteNotice.valid ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: '92%',
          }}
        >
          <span>{inviteNotice.message}</span>
          <button
            type="button"
            onClick={() => setInviteNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Live ticking countdown floating badge for active temporary access */}
      {activeInvite && secondsRemaining !== null && secondsRemaining > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 18,
            right: 18,
            zIndex: 99999,
            background:
              secondsRemaining < 60
                ? '#ef4444'
                : secondsRemaining < 300
                ? '#f59e0b'
                : '#0f172a',
            color: '#ffffff',
            padding: '8px 14px',
            borderRadius: 30,
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Clock size={14} className={secondsRemaining < 60 ? 'animate-pulse' : ''} />
          <span>Access: {formatCountdown(secondsRemaining)} remaining</span>
        </div>
      )}

      {renderView()}
    </>
  );
}
