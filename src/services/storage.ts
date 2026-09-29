import { UserAccount, TradePosition, ViewState, PersonalDetails, QuestionnaireData, DepositRecord } from '../types';

const DB_KEY = 'immediate_users_database';
const SESSION_KEY = 'immediate_current_user_email';

function getDb(): Record<string, UserAccount> {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading user database from localStorage', err);
    return {};
  }
}

function saveDb(db: Record<string, UserAccount>): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Error saving user database to localStorage', err);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const StorageService = {
  getUsers(): Record<string, UserAccount> {
    return getDb();
  },

  findUserByEmail(email: string): UserAccount | null {
    const db = getDb();
    const key = normalizeEmail(email);
    return db[key] || null;
  },

  registerUser(data: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    password: string;
  }): { success: boolean; error?: string; user?: UserAccount } {
    const db = getDb();
    const key = normalizeEmail(data.email);

    if (db[key]) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      };
    }

    const newUser: UserAccount = {
      id: 'IMP-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      country: data.country.trim(),
      password: data.password,
      createdAt: new Date().toISOString(),
      stage: 'details', // next step is personal details verification
      isVerified: false,
      isLiveAccount: false,
      accountType: 'live',
      demoEquity: 10000,
      liveEquity: 0,
      positions: [],
    };

    db[key] = newUser;
    saveDb(db);

    return { success: true, user: newUser };
  },

  loginUser(
    email: string,
    password: string
  ): { success: boolean; error?: string; user?: UserAccount } {
    const db = getDb();
    const key = normalizeEmail(email);
    const user = db[key];

    if (!user) {
      return {
        success: false,
        error: 'No account exists. Please open an account first.',
      };
    }

    if (user.password !== password) {
      return {
        success: false,
        error: 'Incorrect password. Please try again.',
      };
    }

    // Set active session
    localStorage.setItem(SESSION_KEY, key);
    return { success: true, user };
  },

  getCurrentUser(): UserAccount | null {
    try {
      const activeEmail = localStorage.getItem(SESSION_KEY);
      if (!activeEmail) return null;
      return this.findUserByEmail(activeEmail);
    } catch {
      return null;
    }
  },

  setCurrentUserSession(email: string | null): void {
    if (!email) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, normalizeEmail(email));
    }
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  changePassword(
    email: string,
    currentPass: string,
    newPass: string
  ): { success: boolean; error?: string; user?: UserAccount } {
    const db = getDb();
    const key = normalizeEmail(email);
    const user = db[key];

    if (!user) {
      return {
        success: false,
        error: 'User account not found.',
      };
    }

    if (user.password !== currentPass) {
      return {
        success: false,
        error: 'Current password is incorrect.',
      };
    }

    if (newPass.length < 6) {
      return {
        success: false,
        error: 'New password must be at least 6 characters.',
      };
    }

    if (currentPass === newPass) {
      return {
        success: false,
        error: 'New password must be different from current password.',
      };
    }

    const updated: UserAccount = {
      ...user,
      password: newPass,
    };

    db[key] = updated;
    saveDb(db);
    return { success: true, user: updated };
  },

  updateCurrentUser(updates: Partial<UserAccount>): UserAccount | null {
    const current = this.getCurrentUser();
    if (!current) return null;

    const db = getDb();
    const key = normalizeEmail(current.email);

    const updated: UserAccount = {
      ...current,
      ...updates,
    };

    db[key] = updated;
    saveDb(db);
    return updated;
  },

  updateUserByEmail(email: string, updates: Partial<UserAccount>): UserAccount | null {
    const db = getDb();
    const key = normalizeEmail(email);
    if (!db[key]) return null;

    const updated: UserAccount = {
      ...db[key],
      ...updates,
    };

    db[key] = updated;
    saveDb(db);
    return updated;
  },

  savePersonalDetails(email: string, details: PersonalDetails): UserAccount | null {
    return this.updateUserByEmail(email, {
      personalDetails: details,
      stage: 'payments',
    });
  },

  saveDeposit(email: string, deposit: DepositRecord): UserAccount | null {
    const user = this.findUserByEmail(email);
    const updatedLiveEquity = (user?.liveEquity || 0) + deposit.amount;

    return this.updateUserByEmail(email, {
      deposit,
      isLiveAccount: true,
      liveEquity: updatedLiveEquity,
      accountType: 'live',
      stage: 'questionnaire',
    });
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

  addPosition(email: string, position: TradePosition): UserAccount | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    const positions = [position, ...(user.positions || [])];
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

    // Adjust equity with PnL
    const equityKey = user.accountType === 'live' ? 'liveEquity' : 'demoEquity';
    const newEquity = Math.max(0, +(user[equityKey] + (pos?.pnl || 0)).toFixed(2));

    return this.updateUserByEmail(email, {
      positions,
      [equityKey]: newEquity,
    });
  },
};
