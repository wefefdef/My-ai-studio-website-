export type ViewState =
  | 'landing'
  | 'register'
  | 'sign-in'
  | 'details'
  | 'payments'
  | 'bank-transfer'
  | 'bank-details'
  | 'card-form'
  | 'questionnaire'
  | 'all-done'
  | 'trading'
  | 'profile'
  | 'withdraw';

export interface MarketAsset {
  name: string;
  symbol: string;
  price: number;
  change: number;
  category: 'Crypto' | 'Indices' | 'Commodities' | 'Forex' | 'Stocks';
}

export interface Question {
  title: string;
  subtitle: string;
  options: string[];
}

export interface Country {
  name: string;
  code: string;
}

export interface PaymentOption {
  key: string;
  label: string;
  sub: string;
  logoClass?: string;
  logoText?: string;
}

export interface PaymentMethod {
  id: string;
  title: string;
  type: 'bank' | 'crypto' | 'custom';
  bankName?: string;
  accountNumber?: string;
  accountOwnerName?: string;
  walletAddress?: string;
  network?: string;
  instructions?: string;
  enabled: boolean;
  order: number;
  updatedAt?: string;
}

export interface PersonalDetails {
  address: string;
  city: string;
  zipCode: string;
  residence: string;
  nationality: string;
  dob: string;
  idType?: string;
  idNumber?: string;
}

export interface QuestionnaireData {
  age?: string;
  profession?: string;
  experience?: string;
  reason?: string;
  method?: string;
  source?: string;
  tin?: string;
  notUsCitizen?: boolean;
}

export interface DepositRecord {
  amount: number;
  method: string;
  date: string;
  status: 'completed' | 'pending';
}

export interface TradePosition {
  id: string;
  symbol: string;
  assetName: string;
  side: 'buy' | 'sell';
  lotSize: number;
  leverage?: number;
  accountType?: 'live' | 'demo';
  entryPrice: number;
  currentPrice: number;
  closePrice?: number;
  closeReason?: 'manual' | 'tp' | 'sl';
  tp?: string;
  sl?: string;
  pnl: number;
  finalPnl?: number;
  openTime: string;
  closeTime?: string;
  duration?: string;
  expiryDate?: string;
  status?: 'active' | 'closed';
  userId?: string;
  userEmail?: string;
  createdAt?: string;
  closedAt?: string;
}

export interface UserAccount {
  id: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  createdAt: string;
  stage: ViewState;
  personalDetails?: PersonalDetails;
  personalDetailsCompleted?: boolean;
  questionnaire?: QuestionnaireData;
  questionnaireCompleted?: boolean;
  deposit?: DepositRecord;
  isVerified: boolean;
  isLiveAccount: boolean;
  accountType: 'live' | 'demo';
  demoEquity: number;
  liveEquity: number;
  positions: TradePosition[];
}
