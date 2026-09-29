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
  entryPrice: number;
  currentPrice: number;
  tp?: string;
  sl?: string;
  pnl: number;
  openTime: string;
  duration?: string;
  expiryDate?: string;
  status?: 'active' | 'closed';
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  createdAt: string;
  stage: ViewState;
  personalDetails?: PersonalDetails;
  questionnaire?: QuestionnaireData;
  deposit?: DepositRecord;
  isVerified: boolean;
  isLiveAccount: boolean;
  accountType: 'live' | 'demo';
  demoEquity: number;
  liveEquity: number;
  positions: TradePosition[];
}
