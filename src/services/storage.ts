import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, increment } from 'firebase/firestore';
import { db } from './firebase';
import {
  UserAccount,
  TradePosition,
  ViewState,
  PersonalDetails,
  QuestionnaireData,
  DepositRecord,
} from '../types';

const DB_KEY = 'immediate_users_database';
const SESSION_KEY = 'immediate_current_user_email';

const memStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memStore[key] || null;
    }
  }
  return memStore[key] || null;
}

function safeSetItem(key: string, val: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, val);
    } catch {
      // ignore
    }
  }
  memStore[key] = val;
}

function safeRemoveItem(key: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  delete memStore[key];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getUserDocKey(email: string): string {
  return normalizeEmail(email).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Deeply sanitizes an object or array by removing any properties with value `undefined`.
 * Firestore strictly rejects `undefined` values and throws:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function removeUndefinedFields<T>(val: T): T {
  if (val === undefined || val === null) {
    return null as any;
  }
  if (Array.isArray(val)) {
    return val.map((item) => removeUndefinedFields(item)) as any;
  }
  if (typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        cleaned[k] = removeUndefinedFields(v);
      }
    }
    return cleaned as T;
  }
  return val;
}

// In-Memory Permanent Account Store (retained throughout browser runtime & fallback)
const memoryUsersMap: Record<string, UserAccount> = {};

// Local cache helpers for instant synchronous UI render
function getLocalDb(): Record<string, UserAccount> {
  try {
    const raw = safeGetItem(DB_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...memoryUsersMap, ...parsed };
  } catch {
    return { ...memoryUsersMap };
  }
}

function saveLocalDb(dbData: Record<string, UserAccount>): void {
  // Always update in-memory permanent store
  Object.assign(memoryUsersMap, dbData);
  try {
    safeSetItem(DB_KEY, JSON.stringify(dbData));
  } catch (err) {
    console.warn('Error saving to local storage cache, maintained in memory:', err);
  }
}

export const StorageService = {
  getUsers(): Record<string, UserAccount> {
    return getLocalDb();
  },

  findUserByEmail(email: string): UserAccount | null {
    const local = getLocalDb();
    const key = normalizeEmail(email);
    return local[key] || null;
  },

  getCurrentUser(): UserAccount | null {
    try {
      const activeEmail = safeGetItem(SESSION_KEY);
      if (!activeEmail) return null;
      return this.findUserByEmail(activeEmail);
    } catch {
      return null;
    }
  },

  setCurrentUserSession(email: string | null): void {
    if (!email) {
      safeRemoveItem(SESSION_KEY);
    } else {
      safeSetItem(SESSION_KEY, normalizeEmail(email));
    }
  },

  logout(): void {
    safeRemoveItem(SESSION_KEY);
  },

  hasCompletedPersonalDetails(userOrEmail?: UserAccount | string | null): boolean {
    const user =
      typeof userOrEmail === 'string'
        ? this.findUserByEmail(userOrEmail)
        : (userOrEmail || this.getCurrentUser());
    if (!user) return false;
    return !!(
      user.personalDetailsCompleted ||
      (user.personalDetails && (user.personalDetails.address || user.personalDetails.city || user.personalDetails.dob)) ||
      user.stage === 'trading' ||
      user.isLiveAccount ||
      user.isVerified
    );
  },

  hasCompletedQuestionnaire(userOrEmail?: UserAccount | string | null): boolean {
    const user =
      typeof userOrEmail === 'string'
        ? this.findUserByEmail(userOrEmail)
        : (userOrEmail || this.getCurrentUser());
    if (!user) return false;
    return !!(
      user.questionnaireCompleted ||
      (user.questionnaire && (user.questionnaire.profession || user.questionnaire.age || user.questionnaire.notUsCitizen || user.questionnaire.tin)) ||
      user.stage === 'trading' ||
      user.isLiveAccount ||
      user.isVerified
    );
  },

  hasCompletedOnboarding(userOrEmail?: UserAccount | string | null): boolean {
    return this.hasCompletedPersonalDetails(userOrEmail) && this.hasCompletedQuestionnaire(userOrEmail);
  },

  // Fetch the definitive source-of-truth from Cloud Firestore
  async fetchFreshUserFromFirebase(email?: string): Promise<UserAccount | null> {
    const targetEmail = email || safeGetItem(SESSION_KEY);
    if (!targetEmail) return null;

    const docKey = getUserDocKey(targetEmail);
    try {
      const userRef = doc(db, 'users', docKey);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const firestoreUser = snap.data() as UserAccount;
        // Update local cache
        const local = getLocalDb();
        local[normalizeEmail(targetEmail)] = firestoreUser;
        saveLocalDb(local);
        return firestoreUser;
      }
    } catch (err) {
      console.warn('Could not read user from Firestore, fallback to local cache:', err);
    }

    return this.findUserByEmail(targetEmail);
  },

  // User Registration with Cloud Firestore persistence
  async registerUser(data: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const key = normalizeEmail(data.email);
    const docKey = getUserDocKey(data.email);

    // 1. Check Cloud Firestore for existing account
    try {
      const userRef = doc(db, 'users', docKey);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return {
          success: false,
          error: 'An account with this email already exists. Please log in instead.',
        };
      }
    } catch (err) {
      console.warn('Firestore check error (will continue):', err);
    }

    // 2. Check local database
    const localDb = getLocalDb();
    if (localDb[key]) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      };
    }

    // 3. Construct permanent account
    const uid = 'USR-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const newUser: UserAccount = {
      id: 'IMP-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      uid,
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      country: data.country.trim(),
      password: data.password,
      createdAt: new Date().toISOString(),
      stage: 'details',
      isVerified: false,
      isLiveAccount: false,
      accountType: 'live',
      demoEquity: 10000,
      liveEquity: 0,
      positions: [],
    };

    // 4. Save to Cloud Firestore
    try {
      const userRef = doc(db, 'users', docKey);
      await setDoc(userRef, removeUndefinedFields(newUser));
    } catch (err) {
      console.error('Failed to save new user to Firestore:', err);
    }

    // 5. Save to local cache
    localDb[key] = newUser;
    saveLocalDb(localDb);

    return { success: true, user: newUser };
  },

  // User Login with Cloud Firestore verification
  async loginUser(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
    const key = normalizeEmail(email);
    const docKey = getUserDocKey(email);
    let user: UserAccount | null = null;

    // 1. Fetch live user from Cloud Firestore
    try {
      const userRef = doc(db, 'users', docKey);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        user = snap.data() as UserAccount;
      }
    } catch (err) {
      console.warn('Firestore read on login failed, falling back to local storage:', err);
    }

    // 2. Fallback to local cache if offline
    if (!user) {
      const localDb = getLocalDb();
      user = localDb[key] || null;
    }

    if (!user) {
      return {
        success: false,
        error: 'No account exists with this email. Please open an account first.',
      };
    }

    if (user.password !== password) {
      return {
        success: false,
        error: 'Incorrect password. Please try again.',
      };
    }

    // 3. Update local cache and active session
    const localDb = getLocalDb();
    localDb[key] = user;
    saveLocalDb(localDb);
    safeSetItem(SESSION_KEY, key);

    return { success: true, user };
  },

  changePassword(
    email: string,
    currentPass: string,
    newPass: string
  ): { success: boolean; error?: string; user?: UserAccount } {
    const user = this.findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }
    if (user.password !== currentPass) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    if (newPass.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    if (currentPass === newPass) {
      return { success: false, error: 'New password must be different from current password.' };
    }

    const updated = this.updateUserByEmail(email, { password: newPass });
    return { success: true, user: updated || undefined };
  },

  // Update User state in Firestore & local cache
  updateUserByEmail(email: string, updates: Partial<UserAccount>): UserAccount | null {
    const key = normalizeEmail(email);
    const docKey = getUserDocKey(email);
    const localDb = getLocalDb();
    const current = localDb[key];
    if (!current) return null;

    const updated: UserAccount = {
      ...current,
      ...updates,
    };

    // Save to local cache
    localDb[key] = updated;
    saveLocalDb(localDb);

    // Asynchronously write to Cloud Firestore
    const userRef = doc(db, 'users', docKey);
    const sanitizedDoc = removeUndefinedFields(updated);
    setDoc(userRef, sanitizedDoc, { merge: true }).catch((err) => {
      console.error('Failed to sync user updates to Firestore:', err);
    });

    return updated;
  },

  savePersonalDetails(email: string, details: PersonalDetails): UserAccount | null {
    return this.updateUserByEmail(email, {
      personalDetails: details,
      personalDetailsCompleted: true,
      stage: 'payments',
    });
  },

  // Persistent Deposit Workflow - ONLY credits liveEquity when authentic passcode is verified
  verifyAndCreditDeposit(
    email: string,
    amount: number,
    passcode: string,
    method?: string
  ): { success: boolean; user?: UserAccount; error?: string } {
    const cleanPasscode = passcode.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    if (cleanPasscode !== '123123123123') {
      return {
        success: false,
        error: 'Incorrect passcode. Deposit funds cannot be credited.',
      };
    }

    const user = this.findUserByEmail(email);
    const currentLiveEquity = user?.liveEquity || 0;
    const updatedLiveEquity = +(currentLiveEquity + amount).toFixed(2);
    const docKey = getUserDocKey(email);

    // 1. Update user account in Firestore & local cache
    const updatedUser = this.updateUserByEmail(email, {
      deposit: {
        amount,
        method: method || 'bank-transfer',
        date: new Date().toISOString(),
        status: 'completed',
        reference: 'AUTH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      },
      isLiveAccount: true,
      liveEquity: updatedLiveEquity,
      accountType: 'live',
    });

    // 2. Persist deposit transaction record in user's deposits subcollection in Firestore
    try {
      const depositRef = doc(db, 'users', docKey, 'deposits', 'DEP-' + Date.now());
      setDoc(depositRef, removeUndefinedFields({
        amount,
        method: method || 'bank-transfer',
        status: 'completed',
        date: new Date().toISOString(),
        reference: 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        passcodeVerified: true,
        userEmail: email,
      })).catch((err) => console.warn('Subcollection deposit save warning:', err));
    } catch (e) {
      console.warn(e);
    }

    if (updatedUser) {
      return { success: true, user: updatedUser };
    }
    return { success: false, error: 'User account not found.' };
  },

  recordPendingDeposit(email: string, deposit: DepositRecord): UserAccount | null {
    return this.updateUserByEmail(email, {
      deposit: {
        ...deposit,
        status: 'pending',
      },
    });
  },

  saveDeposit(email: string, deposit: DepositRecord, passcode?: string): UserAccount | null {
    const cleanPasscode = (passcode || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    if (cleanPasscode === '123123123123') {
      const res = this.verifyAndCreditDeposit(email, deposit.amount, cleanPasscode, deposit.method);
      return res.user || null;
    }
    // Strictly DO NOT add any money to live account without authentic passcode!
    return this.recordPendingDeposit(email, deposit);
  },

  saveQuestionnaire(email: string, data: QuestionnaireData): UserAccount | null {
    return this.updateUserByEmail(email, {
      questionnaire: data,
      questionnaireCompleted: true,
      isVerified: true,
      isLiveAccount: true,
      stage: 'trading',
    });
  },

  completeAllDone(email: string): UserAccount | null {
    return this.updateUserByEmail(email, {
      personalDetailsCompleted: true,
      questionnaireCompleted: true,
      isVerified: true,
      isLiveAccount: true,
      stage: 'trading',
    });
  },

  // Persistent Trading Orders and Positions
  addPosition(email: string, position: TradePosition): UserAccount | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    const cleanPos = removeUndefinedFields(position);
    const positions = [cleanPos, ...(user.positions || [])];
    const docKey = getUserDocKey(email);

    // Save position to root trades collection and user subcollection
    try {
      const rootTradeRef = doc(db, 'trades', position.id);
      setDoc(rootTradeRef, removeUndefinedFields({
        ...position,
        userEmail: email,
        userId: user.uid || user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })).catch((err) => console.warn('Root trades collection error:', err));

      const tradeRef = doc(db, 'users', docKey, 'trades', position.id);
      setDoc(tradeRef, removeUndefinedFields({
        ...position,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      })).catch((err) => console.warn('Trade subcollection error:', err));
    } catch (e) {
      console.warn(e);
    }

    return this.updateUserByEmail(email, { positions });
  },

  updatePositions(email: string, positions: TradePosition[]): UserAccount | null {
    return this.updateUserByEmail(email, { positions: removeUndefinedFields(positions) });
  },

  closePosition(
    email: string,
    positionId: string,
    customClosePrice?: number,
    customPnl?: number,
    reason?: 'manual' | 'tp' | 'sl'
  ): UserAccount | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    const pos = user.positions.find((p) => p.id === positionId);
    const positions = user.positions.filter((p) => p.id !== positionId);
    const docKey = getUserDocKey(email);

    const closePrice = customClosePrice !== undefined ? customClosePrice : (pos?.currentPrice || 0);
    const finalPnl = customPnl !== undefined ? customPnl : (pos?.pnl || 0);

    // Determine account mode (live vs demo) from the position itself or user account
    const posAccountType = pos?.accountType || user.accountType || (user.isLiveAccount ? 'live' : 'demo');
    const equityKey = posAccountType === 'live' ? 'liveEquity' : 'demoEquity';
    const currentEquityVal =
      typeof user[equityKey] === 'number' && !isNaN(user[equityKey])
        ? user[equityKey]
        : posAccountType === 'live'
        ? 250
        : 10000;
    const newEquity = Math.max(0, +(currentEquityVal + finalPnl).toFixed(2));

    const now = new Date();
    const closeTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update root trades collection and user subcollection in Firestore
    try {
      const rootTradeRef = doc(db, 'trades', positionId);
      setDoc(
        rootTradeRef,
        removeUndefinedFields({
          status: 'closed',
          closeTime: closeTimeStr,
          closePrice,
          finalPnl,
          closeReason: reason || 'manual',
          closedAt: now.toISOString(),
          accountType: posAccountType,
        }),
        { merge: true }
      ).catch((err) => console.warn('Root trade close error:', err));

      const tradeRef = doc(db, 'users', docKey, 'trades', positionId);
      setDoc(
        tradeRef,
        removeUndefinedFields({
          status: 'closed',
          closeTime: closeTimeStr,
          closePrice,
          finalPnl,
          closeReason: reason || 'manual',
          closedAt: now.toISOString(),
          accountType: posAccountType,
        }),
        { merge: true }
      ).catch((err) => console.warn('Trade close subcollection error:', err));
    } catch (e) {
      console.warn(e);
    }

    // Atomic update in Firestore using increment() to prevent race conditions
    // across concurrent trade executions and settlements on both demo and live account equity!
    try {
      const userRef = doc(db, 'users', docKey);
      updateDoc(userRef, {
        [equityKey]: increment(finalPnl),
        positions: removeUndefinedFields(positions),
      }).catch((err) => {
        console.warn('Atomic increment failed on Firestore, falling back to setDoc:', err);
        const cleanUser = removeUndefinedFields({
          ...user,
          positions,
          [equityKey]: newEquity,
        });
        setDoc(userRef, cleanUser, { merge: true }).catch((e) => console.error(e));
      });
    } catch (err) {
      console.warn('Atomic increment call error:', err);
    }

    // Optimistic local cache update
    const key = normalizeEmail(email);
    const localDb = getLocalDb();
    const updatedLocal: UserAccount = {
      ...user,
      positions,
      [equityKey]: newEquity,
    };
    localDb[key] = updatedLocal;
    saveLocalDb(localDb);

    return updatedLocal;
  },
};
