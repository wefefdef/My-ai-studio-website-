import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';
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

// Local cache helpers for instant synchronous UI render
function getLocalDb(): Record<string, UserAccount> {
  try {
    const raw = safeGetItem(DB_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLocalDb(dbData: Record<string, UserAccount>): void {
  try {
    safeSetItem(DB_KEY, JSON.stringify(dbData));
  } catch (err) {
    console.error('Error saving to local storage cache:', err);
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
      await setDoc(userRef, newUser);
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
    setDoc(userRef, updated, { merge: true }).catch((err) => {
      console.error('Failed to sync user updates to Firestore:', err);
    });

    return updated;
  },

  savePersonalDetails(email: string, details: PersonalDetails): UserAccount | null {
    return this.updateUserByEmail(email, {
      personalDetails: details,
      stage: 'payments',
    });
  },

  // Persistent Deposit Workflow
  saveDeposit(email: string, deposit: DepositRecord): UserAccount | null {
    const user = this.findUserByEmail(email);
    const currentLiveEquity = user?.liveEquity || 0;
    const updatedLiveEquity = +(currentLiveEquity + deposit.amount).toFixed(2);
    const docKey = getUserDocKey(email);

    // 1. Update user account in Firestore & local cache
    const updatedUser = this.updateUserByEmail(email, {
      deposit,
      isLiveAccount: true,
      liveEquity: updatedLiveEquity,
      accountType: 'live',
      stage: 'questionnaire',
    });

    // 2. Persist deposit transaction record in user's deposits subcollection in Firestore
    try {
      const depositRef = doc(db, 'users', docKey, 'deposits', 'DEP-' + Date.now());
      setDoc(depositRef, {
        amount: deposit.amount,
        method: deposit.method,
        status: deposit.status,
        date: deposit.date || new Date().toISOString(),
        reference: 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        userEmail: email,
      }).catch((err) => console.warn('Subcollection deposit save warning:', err));
    } catch (e) {
      console.warn(e);
    }

    return updatedUser;
  },

  saveQuestionnaire(email: string, data: QuestionnaireData): UserAccount | null {
    return this.updateUserByEmail(email, {
      questionnaire: data,
      isVerified: true,
      stage: 'all-done',
    });
  },

  completeAllDone(email: string): UserAccount | null {
    return this.updateUserByEmail(email, {
      stage: 'trading',
    });
  },

  // Persistent Trading Orders and Positions
  addPosition(email: string, position: TradePosition): UserAccount | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    const positions = [position, ...(user.positions || [])];
    const docKey = getUserDocKey(email);

    // Save position to root trades collection and user subcollection
    try {
      const rootTradeRef = doc(db, 'trades', position.id);
      setDoc(rootTradeRef, {
        ...position,
        userEmail: email,
        userId: user.uid || user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch((err) => console.warn('Root trades collection error:', err));

      const tradeRef = doc(db, 'users', docKey, 'trades', position.id);
      setDoc(tradeRef, {
        ...position,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      }).catch((err) => console.warn('Trade subcollection error:', err));
    } catch (e) {
      console.warn(e);
    }

    return this.updateUserByEmail(email, { positions });
  },

  updatePositions(email: string, positions: TradePosition[]): UserAccount | null {
    return this.updateUserByEmail(email, { positions });
  },

  closePosition(email: string, positionId: string): UserAccount | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    const pos = user.positions.find((p) => p.id === positionId);
    const positions = user.positions.filter((p) => p.id !== positionId);
    const docKey = getUserDocKey(email);

    // Update equity with closed position PnL
    const equityKey = user.accountType === 'live' ? 'liveEquity' : 'demoEquity';
    const newEquity = Math.max(0, +(user[equityKey] + (pos?.pnl || 0)).toFixed(2));

    // Update root trades collection and user subcollection in Firestore
    try {
      const rootTradeRef = doc(db, 'trades', positionId);
      setDoc(
        rootTradeRef,
        {
          status: 'closed',
          closeTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          closePrice: pos?.currentPrice || 0,
          finalPnl: pos?.pnl || 0,
          closedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => console.warn('Root trade close error:', err));

      const tradeRef = doc(db, 'users', docKey, 'trades', positionId);
      setDoc(
        tradeRef,
        {
          status: 'closed',
          closeTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          closePrice: pos?.currentPrice || 0,
          finalPnl: pos?.pnl || 0,
          closedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => console.warn('Trade close subcollection error:', err));
    } catch (e) {
      console.warn(e);
    }

    return this.updateUserByEmail(email, {
      positions,
      [equityKey]: newEquity,
    });
  },
};
