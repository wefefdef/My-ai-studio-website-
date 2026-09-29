import { MarketAsset } from '../types';

export const OTC_ASSETS: MarketAsset[] = [
  { name: 'Gold (OTC)', symbol: 'XAU/USD (OTC)', price: 2345.6, change: 0.67, category: 'Commodities' },
  { name: 'Silver (OTC)', symbol: 'XAG/USD (OTC)', price: 28.45, change: -0.34, category: 'Commodities' },
  { name: 'Oil (Brent OTC)', symbol: 'BCO/USD (OTC)', price: 82.3, change: 1.23, category: 'Commodities' },
  { name: 'GBP/USD (OTC)', symbol: 'GBP/USD (OTC)', price: 1.2654, change: -0.08, category: 'Forex' },
  { name: 'Bitcoin (OTC)', symbol: 'BTC/USD (OTC)', price: 67432.5, change: 2.34, category: 'Crypto' },
  { name: 'Apple (OTC)', symbol: 'AAPL (OTC)', price: 189.45, change: 1.56, category: 'Stocks' },
];

export const MARKET_CATEGORIES = ['OTC Markets', 'Crypto', 'Indices', 'Commodities', 'Forex', 'Stocks'] as const;

export const MARKET_ASSETS: MarketAsset[] = [
  ...OTC_ASSETS,
  { name: 'Ethereum', symbol: 'ETH/USD', price: 3521.8, change: -1.12, category: 'Crypto' },
  { name: 'Solana', symbol: 'SOL/USD', price: 172.45, change: 5.67, category: 'Crypto' },
  { name: 'Ripple', symbol: 'XRP/USD', price: 0.6234, change: 0.89, category: 'Crypto' },
  { name: 'S&P 500', symbol: 'SPX', price: 5432.1, change: 0.45, category: 'Indices' },
  { name: 'NASDAQ', symbol: 'NDX', price: 18976.3, change: 0.78, category: 'Indices' },
  { name: 'Dow Jones', symbol: 'DJI', price: 39876.5, change: -0.23, category: 'Indices' },
  { name: 'FTSE 100', symbol: 'UKX', price: 8234.7, change: 0.12, category: 'Indices' },
  { name: 'Natural Gas', symbol: 'NG/USD', price: 2.876, change: -2.1, category: 'Commodities' },
  { name: 'EUR/USD', symbol: 'EUR/USD', price: 1.0867, change: 0.15, category: 'Forex' },
  { name: 'USD/JPY', symbol: 'USD/JPY', price: 154.32, change: 0.34, category: 'Forex' },
  { name: 'AUD/USD', symbol: 'AUD/USD', price: 0.6543, change: -0.45, category: 'Forex' },
  { name: 'Tesla', symbol: 'TSLA', price: 245.67, change: -2.34, category: 'Stocks' },
  { name: 'Microsoft', symbol: 'MSFT', price: 425.3, change: 0.89, category: 'Stocks' },
  { name: 'Amazon', symbol: 'AMZN', price: 186.2, change: 1.12, category: 'Stocks' },
];

export const NEWS_HEADLINES = [
  'Gold & Silver OTC liquidity strengthens amid global rate speculation',
  'Oil (Brent OTC) stabilizes following OPEC output consensus',
  'Bitcoin surges past $67,000 as institutional buying increases',
  'GBP/USD steady after Bank of England policy remarks',
  'Apple OTC volume surges following product and earnings updates',
  'Crypto market cap surpasses $2.5 trillion',
  'S&P 500 reaches record high on tech momentum',
];

export const STATS_ITEMS = [
  { value: '150+', label: 'Trading Instruments' },
  { value: '50K+', label: 'Active Traders' },
  { value: '0.01s', label: 'Avg. Execution' },
  { value: '24/7', label: 'Customer Support' },
];
