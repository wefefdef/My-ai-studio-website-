import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  LayoutDashboard,
  BarChart2,
  FileText,
  Activity,
  Trash2,
  History,
  RefreshCw,
  Zap,
  Target,
  ShieldAlert,
  Search,
  Flame,
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { MarketAsset, UserAccount, TradePosition } from '../types';
import { MARKET_CATEGORIES, MARKET_ASSETS, OTC_ASSETS, NEWS_HEADLINES } from '../data/markets';
import { BrandMark } from './BrandMark';
import { InteractiveChart } from './InteractiveChart';
import { SparklineChart } from './SparklineChart';
import { StorageService, removeUndefinedFields, getUserDocKey } from '../services/storage';
import { playTradeSound } from '../utils/tradeAudio';

const LEVERAGE_OPTIONS = [
  { value: 50, label: '1:50', tier: 'Standard', marginPct: '2.00%' },
  { value: 100, label: '1:100', tier: 'Classic', marginPct: '1.00%' },
  { value: 200, label: '1:200', tier: 'Pro', marginPct: '0.50%' },
  { value: 500, label: '1:500', tier: 'High', marginPct: '0.20%' },
  { value: 1000, label: '1:1000', tier: '⚡ Ultra High', marginPct: '0.10%' },
  { value: 2000, label: '1:2000', tier: '🔥 Extreme High', marginPct: '0.05%' },
  { value: 3000, label: '1:3000', tier: '🚀 Elite High', marginPct: '0.033%' },
  { value: 5000, label: '1:5000', tier: '👑 MAX PRO High', marginPct: '0.02%' },
];

const QUICK_LOTS = ['0.01', '0.05', '0.10', '0.25', '0.50', '1.00', '2.00', '5.00'];

interface TradingDashboardProps {
  currentUser?: UserAccount | null;
  onDeposit: () => void;
  onWithdraw: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLogout?: () => void;
  onUserUpdated?: (user: UserAccount) => void;
  onOpenProfile: () => void;
}

export function TradingDashboard({
  currentUser,
  onDeposit,
  onWithdraw,
  theme,
  onThemeChange,
  onLogout,
  onUserUpdated,
  onOpenProfile,
}: TradingDashboardProps) {
  const [otcAssets, setOtcAssets] = useState<MarketAsset[]>(MARKET_ASSETS);
  const assetsRef = useRef<MarketAsset[]>(MARKET_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset>(MARKET_ASSETS[0]);
  const [marketCategory, setMarketCategory] = useState<string>('All Markets');
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(500); // Default High Leverage 1:500
  const [isExecuting, setIsExecuting] = useState(false);
  const [newsIndex, setNewsIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'chart' | 'markets' | 'positions'>('chart');
  const [lotSize, setLotSize] = useState('0.10');
  const [tradeDuration, setTradeDuration] = useState('1 Day (24h)');
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [tradeNotification, setTradeNotification] = useState<string | null>(null);

  // Firestore Trade History & Sub-Tab state
  const [tradeHistory, setTradeHistory] = useState<TradePosition[]>([]);
  const [tradesSubTab, setTradesSubTab] = useState<'open' | 'history'>('open');
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  // Account mode: default to live if verified/deposited
  const [accountMode, setAccountMode] = useState<'live' | 'demo'>(
    currentUser?.accountType || (currentUser?.isLiveAccount ? 'live' : 'demo')
  );

  const positions = currentUser?.positions || [];

  // READ Operation: Fetch user's trade history and open positions from Firestore 'trades' collection
  async function fetchUserTrades() {
    if (!currentUser?.email) return;
    setIsLoadingTrades(true);
    try {
      const tradesRef = collection(db, 'trades');
      const q = query(tradesRef, where('userEmail', '==', currentUser.email));
      const snapshot = await getDocs(q);
      const activeTrades: TradePosition[] = [];
      const historyTrades: TradePosition[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as TradePosition;
        if (data.status === 'closed') {
          historyTrades.push({ ...data, id: docSnap.id });
        } else {
          activeTrades.push({ ...data, id: docSnap.id });
        }
      });

      // Sort history by creation / close date descending
      historyTrades.sort((a, b) => {
        const tA = a.closedAt || a.createdAt || '';
        const tB = b.closedAt || b.createdAt || '';
        return tB.localeCompare(tA);
      });

      setTradeHistory(historyTrades);

      // Sync active trades into currentUser state if needed
      if (activeTrades.length > 0 && onUserUpdated) {
        const currentIds = new Set(positions.map((p) => p.id));
        const outOfSync =
          activeTrades.length !== positions.length ||
          activeTrades.some((t) => !currentIds.has(t.id));

        if (outOfSync) {
          const updated = StorageService.updatePositions(currentUser.email, activeTrades);
          if (updated) onUserUpdated(updated);
        }
      }
    } catch (err) {
      console.warn('Error fetching trades from Firestore trades collection:', err);
    } finally {
      setIsLoadingTrades(false);
    }
  }

  // Real-Time Subscriptions using Firestore Listeners:
  // 1. User Document Listener: Live sync of account balance (liveEquity & demoEquity) and positions
  // 2. Trades Collection Listener: Live sync of open/closed orders and trade history
  useEffect(() => {
    if (!currentUser?.email) return;

    const email = currentUser.email;
    const docKey = getUserDocKey(email);
    const userDocRef = doc(db, 'users', docKey);

    // 1. Real-time listener on user account document in Firestore
    const unsubUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const firestoreUser = docSnap.data() as UserAccount;

        // Detect real-time balance change and pulse animation
        const currentMode = firestoreUser.accountType || accountMode;
        const newBal = currentMode === 'live' ? firestoreUser.liveEquity : firestoreUser.demoEquity;
        const oldBal = currentMode === 'live' ? currentUser?.liveEquity : currentUser?.demoEquity;

        if (oldBal !== undefined && newBal !== undefined && Math.abs(newBal - oldBal) >= 0.01) {
          const dir = newBal >= oldBal ? 'up' : 'down';
          setBalanceTickPulse(dir);
        }

        if (onUserUpdated) {
          onUserUpdated(firestoreUser);
        }
      },
      (err) => {
        console.warn('Firestore real-time user listener error:', err);
      }
    );

    // 2. Real-time listener on user's trades collection in Firestore
    const tradesQuery = query(
      collection(db, 'trades'),
      where('userEmail', '==', email)
    );

    const unsubTrades = onSnapshot(
      tradesQuery,
      (snapshot) => {
        const activeTrades: TradePosition[] = [];
        const historyTrades: TradePosition[] = [];

        snapshot.forEach((docSnap) => {
          const trade = docSnap.data() as TradePosition;
          const fullTrade = { ...trade, id: docSnap.id };
          if (trade.status === 'closed') {
            historyTrades.push(fullTrade);
          } else {
            activeTrades.push(fullTrade);
          }
        });

        // Sort history by close / creation time descending
        historyTrades.sort((a, b) => {
          const tA = a.closedAt || a.createdAt || '';
          const tB = b.closedAt || b.createdAt || '';
          return tB.localeCompare(tA);
        });

        setTradeHistory(historyTrades);

        // Instant active positions sync
        if (onUserUpdated) {
          const curPositions = currentUser?.positions || [];
          const curIds = new Set(curPositions.map((p) => p.id));
          const hasDiff =
            activeTrades.length !== curPositions.length ||
            activeTrades.some((t) => !curIds.has(t.id));

          if (hasDiff) {
            const updated = StorageService.updatePositions(email, activeTrades);
            if (updated) {
              onUserUpdated(updated);
            }
          }
        }
      },
      (err) => {
        console.warn('Firestore real-time trades listener error:', err);
      }
    );

    // Initial load
    fetchUserTrades();

    // Clean up active subscriptions on unmount / email change
    return () => {
      unsubUser();
      unsubTrades();
    };
  }, [currentUser?.email]);

  // Contract sizing for authentic financial market PnL calculation across 100+ assets
  const getContractMultiplier = (symbol: string): number => {
    // Forex pairs: 100,000 standard lot
    if (
      symbol.includes('EUR') ||
      symbol.includes('GBP') ||
      symbol.includes('AUD') ||
      symbol.includes('NZD') ||
      symbol.includes('CAD') ||
      symbol.includes('CHF') ||
      symbol.includes('JPY') ||
      symbol.includes('USD/MXN') ||
      symbol.includes('USD/ZAR') ||
      symbol.includes('USD/SGD') ||
      symbol.includes('USD/TRY') ||
      symbol.includes('USD/INR') ||
      symbol.includes('USD/BRL')
    ) {
      return 100000;
    }
    // High-value Crypto (BTC, ETH, SOL, BNB, AVAX, BCH, LTC, etc.)
    if (
      symbol.includes('BTC') ||
      symbol.includes('ETH') ||
      symbol.includes('SOL') ||
      symbol.includes('BNB') ||
      symbol.includes('AVAX') ||
      symbol.includes('BCH') ||
      symbol.includes('LTC')
    ) {
      return 1;
    }
    // Mid-value Crypto (XRP, ADA, DOT, LINK, SUI, NEAR, INJ, RENDER, POL, UNI, TON, KAS, ARB, OP)
    if (
      symbol.includes('XRP') ||
      symbol.includes('ADA') ||
      symbol.includes('DOT') ||
      symbol.includes('LINK') ||
      symbol.includes('SUI') ||
      symbol.includes('NEAR') ||
      symbol.includes('INJ') ||
      symbol.includes('RENDER') ||
      symbol.includes('POL') ||
      symbol.includes('UNI') ||
      symbol.includes('TON') ||
      symbol.includes('ARB') ||
      symbol.includes('OP') ||
      symbol.includes('KAS')
    ) {
      return 10;
    }
    // Micro/meme tokens (PEPE, SHIB, BONK, FLOKI, DOGE)
    if (
      symbol.includes('PEPE') ||
      symbol.includes('SHIB') ||
      symbol.includes('BONK') ||
      symbol.includes('FLOKI')
    ) {
      return 1000000;
    }
    if (symbol.includes('DOGE')) {
      return 1000;
    }
    // Precious Metals
    if (symbol.includes('XAU') || symbol.includes('Gold')) {
      return 100; // 100 oz Gold
    }
    if (symbol.includes('XAG') || symbol.includes('Silver')) {
      return 5000; // 5000 oz Silver
    }
    if (symbol.includes('XPT') || symbol.includes('Platinum') || symbol.includes('XPD') || symbol.includes('Palladium')) {
      return 100; // 100 oz
    }
    // Energy Commodities
    if (symbol.includes('BCO') || symbol.includes('Oil') || symbol.includes('WTI') || symbol.includes('NG')) {
      return 1000; // 1000 barrels / MMBtu
    }
    // Agricultural / Metal Commodities
    if (
      symbol.includes('HG') ||
      symbol.includes('Copper') ||
      symbol.includes('ALU') ||
      symbol.includes('Aluminum') ||
      symbol.includes('WHEAT') ||
      symbol.includes('CORN') ||
      symbol.includes('COFFEE') ||
      symbol.includes('SUGAR')
    ) {
      return 5000;
    }
    // Stocks & Indices: 100 contracts / shares per lot
    return 100;
  };

  // Categorize open trades by live vs demo account
  const livePositions = positions.filter(
    (p) => p.accountType === 'live' || (!p.accountType && currentUser?.isLiveAccount)
  );
  const demoPositions = positions.filter(
    (p) => p.accountType === 'demo' || (!p.accountType && !currentUser?.isLiveAccount)
  );

  const liveBookedBalance = currentUser?.liveEquity ?? 0;
  const demoBookedBalance = currentUser?.demoEquity ?? 10000;

  const liveUnrealizedPnl = +(livePositions.reduce((acc, pos) => acc + (pos.pnl || 0), 0)).toFixed(2);
  const demoUnrealizedPnl = +(demoPositions.reduce((acc, pos) => acc + (pos.pnl || 0), 0)).toFixed(2);

  const currentLiveEquity = +(liveBookedBalance + liveUnrealizedPnl).toFixed(2);
  const currentDemoEquity = +(demoBookedBalance + demoUnrealizedPnl).toFixed(2);

  const bookedBalance = accountMode === 'live' ? liveBookedBalance : demoBookedBalance;
  const totalUnrealizedPnl = accountMode === 'live' ? liveUnrealizedPnl : demoUnrealizedPnl;
  const currentEquity = accountMode === 'live' ? currentLiveEquity : currentDemoEquity;

  // Real-time per-second balance tick pulse state
  const [balanceTickPulse, setBalanceTickPulse] = useState<'up' | 'down' | null>(null);
  const prevEquityRef = useRef(currentEquity);

  useEffect(() => {
    if (Math.abs(currentEquity - prevEquityRef.current) >= 0.01) {
      const dir = currentEquity >= prevEquityRef.current ? 'up' : 'down';
      setBalanceTickPulse(dir);
      prevEquityRef.current = currentEquity;
      const t = setTimeout(() => setBalanceTickPulse(null), 550);
      return () => clearTimeout(t);
    }
  }, [currentEquity]);

  // Margin calculation incorporating selectable high leverage (1:50 up to 1:5000)
  const marginUsed = positions.reduce((acc, pos) => {
    const notional = pos.entryPrice * getContractMultiplier(pos.symbol) * pos.lotSize;
    const lev = pos.leverage || leverage || 500;
    return acc + notional / lev;
  }, 0);
  const freeMargin = Math.max(0, currentEquity - marginUsed);
  const marginLevel = marginUsed > 0 ? ((currentEquity / marginUsed) * 100).toFixed(1) : '100.0';

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % NEWS_HEADLINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Real-Market Live Price Stream & Order Settlement Engine
  // Simulates institutional market price ticks with asset-specific volatility
  // Automatically settles positions when Take Profit (TP) or Stop Loss (SL) is touched,
  // and updates user balance in real-time in both Cloud Firestore and local storage.
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Tick live market quotes using assetsRef for instant synchronous calculation
      const currentList = assetsRef.current;
      let updatedSelected: MarketAsset | null = null;

      const newAssetList = currentList.map((asset) => {
        let volatility = 0.0003;
        if (asset.category === 'Crypto') volatility = 0.0008;
        else if (asset.category === 'Forex') volatility = 0.00015;
        else if (asset.category === 'Commodities') volatility = 0.0004;
        else if (asset.category === 'Stocks') volatility = 0.0005;

        const randomWalk = (Math.random() - 0.495) * volatility;
        const isSmall = asset.price < 10;
        const newPrice = +(asset.price * (1 + randomWalk)).toFixed(isSmall ? 4 : 2);
        const newChange = +(asset.change + (randomWalk > 0 ? 0.01 : -0.01)).toFixed(2);

        const updatedAsset = { ...asset, price: newPrice, change: newChange };
        if (selectedAsset.symbol === asset.symbol) {
          updatedSelected = updatedAsset;
        }
        return updatedAsset;
      });

      assetsRef.current = newAssetList;
      setOtcAssets(newAssetList);

      if (updatedSelected) {
        setSelectedAsset(updatedSelected);
      }

      // 2. Revalue open positions against live market quotes & execute SL / TP triggers
      if (!currentUser?.positions || currentUser.positions.length === 0 || !currentUser?.email) {
        return;
      }

      const email = currentUser.email;
      let hasChange = false;
      const currentPositions = currentUser.positions;
      const remainingPositions: TradePosition[] = [];
      const now = new Date();
      const closeTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      for (const pos of currentPositions) {
        // Find corresponding asset quote
        const matched = newAssetList.find(
          (a) => a.symbol === pos.symbol || a.name === pos.assetName
        );
        const livePrice = matched ? matched.price : pos.currentPrice;
        const multiplier = getContractMultiplier(pos.symbol);

        // Genuine P&L formula:
        // BUY: (livePrice - entryPrice) * multiplier * lotSize
        // SELL: (entryPrice - livePrice) * multiplier * lotSize
        const priceDiff = pos.side === 'buy' ? livePrice - pos.entryPrice : pos.entryPrice - livePrice;
        const livePnl = +(priceDiff * multiplier * pos.lotSize).toFixed(2);

        // Parse TP and SL with regex cleansing to avoid NaN
        const tpVal = pos.tp ? parseFloat(pos.tp.replace(/[^\d.-]/g, '')) : NaN;
        const slVal = pos.sl ? parseFloat(pos.sl.replace(/[^\d.-]/g, '')) : NaN;

        // Check TP Trigger (Take Profit)
        let hitTp = false;
        if (!isNaN(tpVal)) {
          hitTp =
            (pos.side === 'buy' && livePrice >= tpVal) ||
            (pos.side === 'sell' && livePrice <= tpVal);
        }

        // Check SL Trigger (Stop Loss)
        let hitSl = false;
        if (!isNaN(slVal) && !hitTp) {
          hitSl =
            (pos.side === 'buy' && livePrice <= slVal) ||
            (pos.side === 'sell' && livePrice >= slVal);
        }

        if (hitTp || hitSl) {
          hasChange = true;
          const reason = hitTp ? 'tp' : 'sl';
          const targetStr = hitTp ? pos.tp : pos.sl;
          const parsedTarget = targetStr ? parseFloat(targetStr.replace(/[^\d.-]/g, '')) : NaN;
          const exitPrice = !isNaN(parsedTarget) ? parsedTarget : livePrice;
          const settledDiff = pos.side === 'buy' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
          const finalPnl = +(settledDiff * multiplier * pos.lotSize).toFixed(2);

          // Play trigger sound
          playTradeSound(hitTp ? 'tp' : 'sl');

          // Close position in persistent storage and Cloud Firestore, updating balance in live time!
          const updatedUser = StorageService.closePosition(email, pos.id, exitPrice, finalPnl, reason);
          if (updatedUser && onUserUpdated) {
            onUserUpdated(updatedUser);
          }

          // Add to trade history state
          const closedRecord: TradePosition = {
            ...pos,
            status: 'closed',
            closeTime: closeTimeStr,
            closePrice: exitPrice,
            finalPnl,
            closeReason: reason,
            closedAt: now.toISOString(),
          };
          setTradeHistory((prev) => [closedRecord, ...prev.filter((t) => t.id !== pos.id)]);

          const posMode = pos.accountType || currentUser?.accountType || accountMode;
          const newBal = posMode === 'live'
            ? (updatedUser?.liveEquity ?? currentLiveEquity + finalPnl)
            : (updatedUser?.demoEquity ?? currentDemoEquity + finalPnl);

          const isSmall = exitPrice < 10;
          if (hitTp) {
            setTradeNotification(
              `🎯 Take Profit Triggered! ${pos.side.toUpperCase()} ${pos.symbol} closed at $${exitPrice.toLocaleString(undefined, { minimumFractionDigits: isSmall ? 4 : 2 })} (+ $${finalPnl >= 0 ? '+' : ''}${finalPnl.toFixed(2)} USD). Live Balance updated: $${newBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD!`
            );
          } else {
            setTradeNotification(
              `🛡️ Stop Loss Triggered! ${pos.side.toUpperCase()} ${pos.symbol} closed at $${exitPrice.toLocaleString(undefined, { minimumFractionDigits: isSmall ? 4 : 2 })} ($${finalPnl >= 0 ? '+' : ''}${finalPnl.toFixed(2)} USD). Live Balance updated: $${newBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD!`
            );
          }
          setTimeout(() => setTradeNotification(null), 5000);
          continue; // Successfully closed, remove from open positions!
        }

        // Live market tick for position
        hasChange = true;
        remainingPositions.push({
          ...pos,
          currentPrice: livePrice,
          pnl: livePnl,
        });
      }

      if (hasChange) {
        const updatedUser = StorageService.updatePositions(email, remainingPositions);
        if (updatedUser && onUserUpdated) {
          onUserUpdated(updatedUser);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser?.positions, currentUser?.email, selectedAsset.symbol, onUserUpdated]);

  function handleSwitchAccount(mode: 'live' | 'demo') {
    setAccountMode(mode);
    if (currentUser?.email) {
      const updated = StorageService.updateUserByEmail(currentUser.email, {
        accountType: mode,
      });
      if (updated && onUserUpdated) onUserUpdated(updated);
    }
  }

  function handleLotAdjust(delta: number) {
    playTradeSound('click');
    setLotSize((prev) => {
      const current = parseFloat(prev) || 0.1;
      const next = Math.max(0.01, +(current + delta).toFixed(2));
      return String(next);
    });
  }

  // CREATE Operation: Instant optimistic execution with High Leverage
  async function handleExecuteTrade(side: 'buy' | 'sell') {
    setIsExecuting(true);
    const parsedLot = Math.max(0.01, parseFloat(lotSize) || 0.1);
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Genuine market order execution at exact live quote
    const entry = selectedAsset.price;
    const isSmall = entry < 10;
    const spreadPct = isSmall ? 0.0001 : 0.0002;
    const multiplier = getContractMultiplier(selectedAsset.symbol);
    const initialSpreadCost = -+(entry * spreadPct * multiplier * parsedLot).toFixed(2);

    const newPosition: TradePosition = {
      id: 'TRD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      symbol: selectedAsset.symbol,
      assetName: selectedAsset.name,
      side,
      lotSize: parsedLot,
      leverage, // High leverage attached to trade!
      accountType: currentUser?.accountType || accountMode,
      entryPrice: entry,
      currentPrice: entry,
      ...(tp.trim() ? { tp: tp.trim() } : {}),
      ...(sl.trim() ? { sl: sl.trim() } : {}),
      pnl: Math.min(-0.10, initialSpreadCost),
      openTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: tradeDuration || '1 Day (24h)',
      expiryDate:
        expiry.toLocaleDateString() +
        ' ' +
        expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'active',
      createdAt: now.toISOString(),
      userEmail: currentUser?.email,
      userId: currentUser?.uid || currentUser?.id,
    };

    // Instant audio feedback
    playTradeSound('execute');

    // Optimistic instant state update (0ms UI latency!)
    if (currentUser?.email) {
      const updated = StorageService.addPosition(currentUser.email, newPosition);
      if (updated && onUserUpdated) onUserUpdated(updated);

      // Async background save to Firestore 'trades' collection
      const tradeRef = doc(db, 'trades', newPosition.id);
      setDoc(
        tradeRef,
        removeUndefinedFields({
          ...newPosition,
          accountType: currentUser.accountType || accountMode,
        })
      ).catch((err) => console.error('Firestore save trade error:', err));
    }

    setIsExecuting(false);
    const formattedPrice = entry.toLocaleString(undefined, { minimumFractionDigits: isSmall ? 4 : 2 });
    const message = `🚀 Order Executed: ${side.toUpperCase()} ${parsedLot} Lot(s) ${selectedAsset.name} @ $${formattedPrice} · 1:${leverage} Leverage${tp ? ` · TP: $${tp}` : ''}${sl ? ` · SL: $${sl}` : ''}`;
    setTradeNotification(message);
    setTimeout(() => {
      setTradeNotification(null);
    }, 4500);
  }

  // UPDATE Operation: Update trade in Firestore 'trades' collection to 'closed'
  async function handleClosePosition(posId: string) {
    if (!currentUser?.email) return;

    playTradeSound('click');
    const posToClose = positions.find((p) => p.id === posId);
    const now = new Date();
    const closeTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentPrice = posToClose?.currentPrice || selectedAsset.price;
    const finalPnl = posToClose?.pnl || 0;

    // Add to local trade history state immediately
    if (posToClose) {
      const closedRecord: TradePosition = {
        ...posToClose,
        status: 'closed',
        closeTime: closeTimeStr,
        closePrice: currentPrice,
        finalPnl,
        closeReason: 'manual',
        closedAt: now.toISOString(),
      };
      setTradeHistory((prev) => [closedRecord, ...prev.filter((t) => t.id !== posId)]);
    }

    // Close in StorageService, which updates live balance and Firestore
    const updated = StorageService.closePosition(currentUser.email, posId, currentPrice, finalPnl, 'manual');
    if (updated && onUserUpdated) onUserUpdated(updated);

    const posMode = posToClose?.accountType || currentUser.accountType || accountMode;
    const newBal = posMode === 'live' ? updated?.liveEquity : updated?.demoEquity;
    setTradeNotification(
      `✅ Position Closed: ${posToClose?.side.toUpperCase()} ${posToClose?.symbol} @ $${currentPrice.toLocaleString()} (${finalPnl >= 0 ? '+' : ''}$${finalPnl.toFixed(2)} USD). Live Balance updated: $${newBal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD!`
    );
    setTimeout(() => setTradeNotification(null), 4500);
  }

  // DELETE Operation: Delete trade record from Firestore 'trades' collection
  async function handleDeleteTradeRecord(tradeId: string) {
    try {
      await deleteDoc(doc(db, 'trades', tradeId));
      setTradeHistory((prev) => prev.filter((t) => t.id !== tradeId));
      setTradeNotification('Trade record removed from database history.');
      setTimeout(() => setTradeNotification(null), 2500);
    } catch (err) {
      console.error('Error deleting trade from Firestore:', err);
    }
  }

  return (
    <div className="trading-page" style={{ paddingBottom: 'calc(78px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Top Header with Profile Shifted to Far Right */}
      <header
        className="trading-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '12px 20px',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {/* Left Side: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BrandMark />
        </div>

        {/* Center / Action Area: Live/Demo Switch & Equity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              background: 'var(--bg2)',
              borderRadius: 20,
              padding: 2,
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => handleSwitchAccount('live')}
              style={{
                border: 'none',
                background: accountMode === 'live' ? 'var(--accent)' : 'transparent',
                color: accountMode === 'live' ? '#fff' : 'var(--text2)',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>LIVE OTC</span>
              <span style={{ opacity: 0.85, fontSize: 11 }}>
                ${currentLiveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchAccount('demo')}
              style={{
                border: 'none',
                background: accountMode === 'demo' ? 'var(--accent)' : 'transparent',
                color: accountMode === 'demo' ? '#fff' : 'var(--text2)',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>DEMO</span>
              <span style={{ opacity: 0.85, fontSize: 11 }}>
                ${currentDemoEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </button>
          </div>

          <div className="equity-item" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="equity-label" style={{ fontSize: 11, color: 'var(--text2)' }}>
                {accountMode === 'live' ? 'Live Equity' : 'Demo Equity'}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '1px 5px',
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 4px #10b981',
                  }}
                />
                1s
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                className="equity-value"
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color:
                    balanceTickPulse === 'up'
                      ? '#10b981'
                      : balanceTickPulse === 'down'
                      ? '#ef4444'
                      : 'var(--text)',
                  textShadow:
                    balanceTickPulse === 'up'
                      ? '0 0 8px rgba(16, 185, 129, 0.4)'
                      : balanceTickPulse === 'down'
                      ? '0 0 8px rgba(239, 68, 68, 0.4)'
                      : 'none',
                  transition: 'color 0.25s ease, text-shadow 0.25s ease',
                }}
              >
                ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {totalUnrealizedPnl !== 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: totalUnrealizedPnl >= 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  ({totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          <button className="header-action deposit-action" type="button" onClick={onDeposit}>
            <Plus size={16} /> Deposit
          </button>
          <button className="header-action withdraw-action" type="button" onClick={onWithdraw}>
            <Minus size={16} /> Withdraw
          </button>
        </div>

        {/* Far Right: Profile Button opening FULL PAGE Profile */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
            title="Open Full Profile Page"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <User size={15} />
            </div>
            <span>Profile</span>
          </button>
        </div>
      </header>

      {tradeNotification && (
        <div
          className="fade-in"
          style={{
            background: tradeNotification.includes('Take Profit') || tradeNotification.includes('🎯')
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : tradeNotification.includes('Stop Loss') || tradeNotification.includes('🛡️')
              ? 'linear-gradient(135deg, #b91c1c, #ef4444)'
              : tradeNotification.includes('Order Executed') || tradeNotification.includes('🚀')
              ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
              : 'linear-gradient(135deg, #0f766e, #0d9488)',
            color: '#fff',
            padding: '11px 20px',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <CheckCircle2 size={17} />
          <span style={{ letterSpacing: '0.01em' }}>{tradeNotification}</span>
          <button
            type="button"
            onClick={() => setTradeNotification(null)}
            style={{
              marginLeft: 12,
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 20,
              height: 20,
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="news-ticker">
        <TrendingUp size={14} />
        <span className="ticker-text" key={newsIndex}>
          {NEWS_HEADLINES[newsIndex]}
        </span>
      </div>

      {/* Real-Time Live Ticking Account & Balance Metrics Ribbon */}
      <div
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          borderTop: '1px solid var(--border)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }}
            />
            <span style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Activity size={13} color="#10b981" /> Real-Time 1s Engine
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text3)' }}>Stored Booked Balance:</span>
            <strong style={{ color: 'var(--text)' }}>
              ${bookedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text3)' }}>{accountMode === 'live' ? 'Live Equity:' : 'Demo Equity:'}</span>
            <strong
              style={{
                color:
                  balanceTickPulse === 'up'
                    ? '#10b981'
                    : balanceTickPulse === 'down'
                    ? '#ef4444'
                    : 'var(--text)',
                transition: 'color 0.25s ease',
              }}
            >
              ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text3)' }}>{accountMode === 'live' ? 'Demo Equity:' : 'Live Equity:'}</span>
            <strong style={{ color: 'var(--text2)' }}>
              ${(accountMode === 'live' ? currentDemoEquity : currentLiveEquity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text3)' }}>Floating P&amp;L:</span>
            <strong
              style={{
                color: totalUnrealizedPnl >= 0 ? '#10b981' : '#ef4444',
                background: totalUnrealizedPnl >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)} USD
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'var(--text3)' }}>Free Margin: </span>
            <strong style={{ color: 'var(--text)' }}>
              ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text3)' }}>Margin Level: </span>
            <strong style={{ color: marginUsed > 0 ? '#10b981' : 'var(--text2)' }}>
              {marginLevel}%
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text3)' }}>Leverage: </span>
            <strong style={{ color: 'var(--accent)' }}>1:{leverage}</strong>
          </div>
        </div>
      </div>

      {accountMode === 'live' ? (
        <div
          style={{
            background: 'linear-gradient(90deg, #10b98118, #1a6dd418)',
            border: '1px solid #10b98150',
            padding: '12px 20px',
            borderRadius: 8,
            margin: '12px 20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#10b981" /> Live Account Active — {currentUser?.fullName || 'Verified Trader'}
            </strong>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              ({otcAssets.length}+ Live Market Assets · High Leverage Enabled)
            </span>
          </div>
          <button
            type="button"
            onClick={onDeposit}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: '#10b981',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} /> Add Deposit
          </button>
        </div>
      ) : (
        <div className="deposit-banner">
          <div className="db-content">
            <Sparkles size={20} />
            <div>
              <strong>Make your first deposit to activate your live account</strong>
              <span>Fund your account today and unlock live OTC market execution.</span>
            </div>
          </div>
          <button className="db-cta" type="button" onClick={onDeposit}>
            Deposit Now <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="dash-tabs">
        <button
          type="button"
          className={activeTab === 'chart' ? 'dash-tab active' : 'dash-tab'}
          onClick={() => setActiveTab('chart')}
        >
          Trade
        </button>
        <button
          type="button"
          className={activeTab === 'markets' ? 'dash-tab active' : 'dash-tab'}
          onClick={() => setActiveTab('markets')}
        >
          Live Markets ({otcAssets.length})
        </button>
        <button
          type="button"
          className={activeTab === 'positions' ? 'dash-tab active' : 'dash-tab'}
          onClick={() => setActiveTab('positions')}
        >
          Open Trades ({positions.length})
        </button>
      </div>

      {activeTab === 'chart' && (
        <div className="trading-body">
          <div className="trading-main">
            <div className="chart-header">
              <div>
                <h2 className="chart-asset-name">{selectedAsset.name}</h2>
                <span className="chart-symbol">{selectedAsset.symbol}</span>
              </div>
              <div className="chart-price-area">
                <span className="chart-price">
                  ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={
                    selectedAsset.change >= 0
                      ? 'chart-change positive'
                      : 'chart-change negative'
                  }
                >
                  {selectedAsset.change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(selectedAsset.change)}%
                </span>
              </div>
            </div>

            <InteractiveChart asset={selectedAsset} />

            <div className="trade-tools">
              <div className="tool-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div className="tool-type-toggle">
                  <button
                    type="button"
                    className={orderType === 'market' ? 'tt-btn active' : 'tt-btn'}
                    onClick={() => setOrderType('market')}
                  >
                    Market Order
                  </button>
                  <button
                    type="button"
                    className={orderType === 'limit' ? 'tt-btn active' : 'tt-btn'}
                    onClick={() => setOrderType('limit')}
                  >
                    Limit Order
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                  <Clock size={15} color="var(--accent)" />
                  <span>Execution: <strong>Ultra-Fast Instant Fill</strong></span>
                </div>
              </div>

              {/* High Leverage Selector */}
              <div style={{ margin: '14px 0 12px', background: 'var(--card)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame size={15} color="#f59e0b" /> High Leverage Suite
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>
                    Active 1:{leverage} {LEVERAGE_OPTIONS.find((o) => o.value === leverage)?.tier || 'High'} · Margin: {LEVERAGE_OPTIONS.find((o) => o.value === leverage)?.marginPct}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEVERAGE_OPTIONS.map((levOpt) => (
                    <button
                      key={levOpt.value}
                      type="button"
                      onClick={() => {
                        playTradeSound('click');
                        setLeverage(levOpt.value);
                      }}
                      style={{
                        flex: 1,
                        minWidth: 54,
                        padding: '7px 8px',
                        borderRadius: 8,
                        border: `1px solid ${leverage === levOpt.value ? 'var(--accent)' : 'var(--border)'}`,
                        background: leverage === levOpt.value ? 'var(--accent-light)' : 'var(--bg2)',
                        color: leverage === levOpt.value ? 'var(--accent)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {levOpt.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                  <span>
                    Est. Required Margin:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      ${((selectedAsset.price * getContractMultiplier(selectedAsset.symbol) * (parseFloat(lotSize) || 0.1)) / leverage).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </strong>
                  </span>
                  <span>
                    Max Purchasing Power:{' '}
                    <strong style={{ color: 'var(--accent)' }}>
                      ${(bookedBalance * leverage).toLocaleString()} USD
                    </strong>
                  </span>
                  <span>
                    Free Margin:{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </strong>
                  </span>
                </div>
              </div>

              <div className="tool-row tool-inputs">
                <div className="tool-field">
                  <label>Trade Duration</label>
                  <select
                    value={tradeDuration}
                    onChange={(e) => setTradeDuration(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  >
                    <option value="1 Day (24h)">1 Day (24 Hours)</option>
                    <option value="2 Days (48h)">2 Days (48 Hours)</option>
                    <option value="1 Week">1 Week (7 Days)</option>
                  </select>
                </div>

                <div className="tool-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}>Lot Size / Volume</label>
                  </div>
                  <div className="lot-control" style={{ marginTop: 4 }}>
                    <button type="button" onClick={() => handleLotAdjust(-0.05)}>
                      <Minus size={14} />
                    </button>
                    <input
                      type="text"
                      value={lotSize}
                      onChange={(e) => setLotSize(e.target.value)}
                    />
                    <button type="button" onClick={() => handleLotAdjust(0.05)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  {/* Quick Lot Selector Chips */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {QUICK_LOTS.map((qLot) => (
                      <button
                        key={qLot}
                        type="button"
                        onClick={() => {
                          playTradeSound('click');
                          setLotSize(qLot);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 32,
                          padding: '3px 4px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          border: `1px solid ${lotSize === qLot ? 'var(--accent)' : 'var(--border)'}`,
                          background: lotSize === qLot ? 'var(--accent-light)' : 'var(--bg2)',
                          color: lotSize === qLot ? 'var(--accent)' : 'var(--text2)',
                          cursor: 'pointer',
                        }}
                      >
                        {qLot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tool-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Target size={12} color="#10b981" /> Take Profit (TP)
                    </label>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0.5, 1, 2, 5, 10].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            playTradeSound('click');
                            setTp((selectedAsset.price * (1 + pct / 100)).toFixed(selectedAsset.price < 10 ? 4 : 2));
                          }}
                          style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', color: '#10b981', fontWeight: 600 }}
                        >
                          +{pct}%
                        </button>
                      ))}
                      {tp && (
                        <button
                          type="button"
                          onClick={() => setTp('')}
                          style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text3)' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    placeholder={`e.g. ${(selectedAsset.price * 1.02).toFixed(selectedAsset.price < 10 ? 4 : 2)}`}
                    className="tool-input"
                  />
                </div>

                <div className="tool-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={12} color="#ef4444" /> Stop Loss (SL)
                    </label>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0.5, 1, 2, 5, 10].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            playTradeSound('click');
                            setSl((selectedAsset.price * (1 - pct / 100)).toFixed(selectedAsset.price < 10 ? 4 : 2));
                          }}
                          style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}
                        >
                          -{pct}%
                        </button>
                      ))}
                      {sl && (
                        <button
                          type="button"
                          onClick={() => setSl('')}
                          style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text3)' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    placeholder={`e.g. ${(selectedAsset.price * 0.98).toFixed(selectedAsset.price < 10 ? 4 : 2)}`}
                    className="tool-input"
                  />
                </div>
              </div>

              {/* Real-Time Live Projected Target Profit & Loss Preview */}
              {(tp || sl) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                >
                  {tp && (
                    <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Target size={13} />
                      Target Profit if TP Touched: +${Math.abs(((parseFloat(tp) || selectedAsset.price) - selectedAsset.price) * getContractMultiplier(selectedAsset.symbol) * (parseFloat(lotSize) || 0.1)).toFixed(2)} USD
                    </span>
                  )}
                  {sl && (
                    <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldAlert size={13} />
                      Stop Risk if SL Touched: -${Math.abs((selectedAsset.price - (parseFloat(sl) || selectedAsset.price)) * getContractMultiplier(selectedAsset.symbol) * (parseFloat(lotSize) || 0.1)).toFixed(2)} USD
                    </span>
                  )}
                </div>
              )}

              <div className="trade-actions" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="trade-btn buy"
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleExecuteTrade('buy')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    cursor: isExecuting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800 }}>
                    <ArrowUp size={18} /> BUY {selectedAsset.symbol}
                  </div>
                  <span style={{ fontSize: 11, opacity: 0.9 }}>
                    {parseFloat(lotSize) || 0.1} Lot @ ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 10 ? 4 : 2 })} · 1:{leverage}
                  </span>
                </button>

                <button
                  className="trade-btn sell"
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleExecuteTrade('sell')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    cursor: isExecuting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800 }}>
                    <ArrowDown size={18} /> SELL {selectedAsset.symbol}
                  </div>
                  <span style={{ fontSize: 11, opacity: 0.9 }}>
                    {parseFloat(lotSize) || 0.1} Lot @ ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 10 ? 4 : 2 })} · 1:{leverage}
                  </span>
                </button>
              </div>

              {/* Active Positions on this specific instrument */}
              {positions.filter((p) => p.symbol === selectedAsset.symbol).length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                      Active Trades on {selectedAsset.symbol} ({positions.filter((p) => p.symbol === selectedAsset.symbol).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('positions')}
                      style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      View All in Positions Tab →
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {positions
                      .filter((p) => p.symbol === selectedAsset.symbol)
                      .map((pos) => {
                        const isProfitable = pos.pnl >= 0;
                        return (
                          <div
                            key={pos.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg2)',
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              fontSize: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  fontSize: 10,
                                  background: pos.side === 'buy' ? '#16a34a20' : '#dc262620',
                                  color: pos.side === 'buy' ? '#16a34a' : '#dc2626',
                                }}
                              >
                                {pos.side.toUpperCase()}
                              </span>
                              <span style={{ fontWeight: 600 }}>{pos.lotSize} Lots</span>
                              <span style={{ color: 'var(--text3)' }}>@ ${pos.entryPrice.toLocaleString()}</span>
                              {pos.tp && <span style={{ color: '#10b981', fontSize: 11 }}>TP: ${pos.tp}</span>}
                              {pos.sl && <span style={{ color: '#ef4444', fontSize: 11 }}>SL: ${pos.sl}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 700, color: isProfitable ? '#16a34a' : '#dc2626' }}>
                                {isProfitable ? '+' : ''}${pos.pnl.toFixed(2)} USD
                              </span>
                              <button
                                type="button"
                                onClick={() => handleClosePosition(pos.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Close &amp; Settle
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="trading-sidebar">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Live Market Assets</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{otcAssets.length} Instruments</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text3)' }} />
                <input
                  type="text"
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder="Search assets (BTC, Gold, EUR...)"
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div className="asset-list">
              {otcAssets
                .filter((asset) => {
                  if (!marketSearch.trim()) return true;
                  const query = marketSearch.toLowerCase();
                  return (
                    asset.name.toLowerCase().includes(query) ||
                    asset.symbol.toLowerCase().includes(query) ||
                    asset.category.toLowerCase().includes(query)
                  );
                })
                .map((asset) => (
                  <button
                    type="button"
                    key={asset.symbol}
                    className={
                      selectedAsset.symbol === asset.symbol
                        ? 'asset-row selected'
                        : 'asset-row'
                    }
                    onClick={() => {
                      setSelectedAsset(asset);
                      setActiveTab('chart');
                    }}
                  >
                    <div className="asset-info">
                      <span className="asset-name">{asset.name}</span>
                      <span className="asset-symbol">{asset.symbol}</span>
                    </div>
                    <SparklineChart positive={asset.change >= 0} />
                    <div className="asset-price-col">
                      <span className="asset-price">
                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.price < 10 ? 4 : 2 })}
                      </span>
                      <span
                        className={
                          asset.change >= 0
                            ? 'asset-change positive'
                            : 'asset-change negative'
                        }
                      >
                        {asset.change >= 0 ? '+' : ''}
                        {asset.change}%
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'markets' && (
        <div className="markets-view">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Live Global Markets</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>
                  Institutional real-time liquidity across Crypto, Forex, Commodities, Indices, and Stocks.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: 'min(100%, 280px)' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text3)' }} />
                <input
                  type="text"
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder="Search 100+ live assets..."
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 14px 0 36px',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {MARKET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMarketCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1px solid ${marketCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                    background: marketCategory === cat ? 'var(--accent)' : 'var(--card)',
                    color: marketCategory === cat ? '#fff' : 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="markets-header-row">
            <span className="mh-col mh-asset">Asset / Market</span>
            <span className="mh-col mh-price">Live Price</span>
            <span className="mh-col mh-change">24h Change</span>
            <span className="mh-col mh-chart">Trend</span>
            <span className="mh-col mh-action">Action</span>
          </div>

          <div className="markets-list">
            {otcAssets
              .filter((asset) => {
                if (marketCategory !== 'All Markets' && asset.category !== marketCategory) {
                  return false;
                }
                if (!marketSearch.trim()) return true;
                const query = marketSearch.toLowerCase();
                return (
                  asset.name.toLowerCase().includes(query) ||
                  asset.symbol.toLowerCase().includes(query) ||
                  asset.category.toLowerCase().includes(query)
                );
              })
              .map((asset) => (
                <div className="market-row" key={asset.symbol}>
                  <div className="mh-col mh-asset">
                    <span className="m-name">{asset.name}</span>
                    <span className="m-symbol">
                      {asset.symbol} · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{asset.category}</span>
                    </span>
                  </div>
                  <span className="mh-col mh-price m-price">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.price < 10 ? 4 : 2 })}
                  </span>
                  <span
                    className={`mh-col mh-change m-change ${
                      asset.change >= 0 ? 'positive' : 'negative'
                    }`}
                  >
                    {asset.change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(asset.change)}%
                  </span>
                  <div className="mh-col mh-chart">
                    <SparklineChart positive={asset.change >= 0} />
                  </div>
                  <div className="mh-col mh-action">
                    <button
                      className="m-trade-btn"
                      type="button"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setActiveTab('chart');
                      }}
                    >
                      Trade 1:{leverage} <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
          {/* Institutional Real Market Feed Banner & Account Metrics */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                <Activity size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 15, color: 'var(--text)' }}>
                    Real-Market ECN Live Execution Feed
                  </strong>
                  <span
                    style={{
                      background: '#10b98120',
                      color: '#10b981',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    Live Quotes
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Interbank Spread • Standard Lot Sizing &amp; Transparent P&amp;L
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Floating Equity
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Margin Level
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
                  {marginLevel}%
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Total Floating P&amp;L
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: totalUnrealizedPnl >= 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Sub-navigation bar between Open Trades and Trade History */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setTradesSubTab('open')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: tradesSubTab === 'open' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: tradesSubTab === 'open' ? 'var(--accent)' : 'var(--card)',
                  color: tradesSubTab === 'open' ? '#fff' : 'var(--text2)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Activity size={15} />
                Open Trades ({positions.length})
              </button>

              <button
                type="button"
                onClick={() => setTradesSubTab('history')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: tradesSubTab === 'history' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: tradesSubTab === 'history' ? 'var(--accent)' : 'var(--card)',
                  color: tradesSubTab === 'history' ? '#fff' : 'var(--text2)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <History size={15} />
                Trade History ({tradeHistory.length})
              </button>
            </div>

            <button
              type="button"
              onClick={fetchUserTrades}
              disabled={isLoadingTrades}
              title="Refresh trades from Firestore"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--text2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={isLoadingTrades ? 'animate-spin' : ''} />
              {isLoadingTrades ? 'Syncing...' : 'Sync with Database'}
            </button>
          </div>

          {/* VIEW 1: OPEN TRADES */}
          {tradesSubTab === 'open' && (
            <>
              {positions.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    background: 'var(--card)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <Wallet size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--text2)', margin: 0 }}>
                    No active trades. Select an OTC asset on the Trade tab to place an order.
                  </p>
                </div>
              ) : (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px' }}>Order ID</th>
                        <th style={{ padding: '12px 16px' }}>Instrument</th>
                        <th style={{ padding: '12px 16px' }}>Type</th>
                        <th style={{ padding: '12px 16px' }}>Volume</th>
                        <th style={{ padding: '12px 16px' }}>Entry Price</th>
                        <th style={{ padding: '12px 16px' }}>Market Price</th>
                        <th style={{ padding: '12px 16px' }}>Duration</th>
                        <th style={{ padding: '12px 16px' }}>TP / SL</th>
                        <th style={{ padding: '12px 16px' }}>Unrealized P&amp;L</th>
                        <th style={{ padding: '12px 16px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => {
                        const isProfitable = pos.pnl >= 0;
                        return (
                          <tr key={pos.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{pos.id}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{pos.symbol}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  fontSize: 11,
                                  background: pos.side === 'buy' ? '#16a34a20' : '#dc262620',
                                  color: pos.side === 'buy' ? '#16a34a' : '#dc2626',
                                }}
                              >
                                {pos.side.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>{pos.lotSize} Lots</td>
                            <td style={{ padding: '12px 16px' }}>${pos.entryPrice.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                ${pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: pos.entryPrice < 10 ? 4 : 2 })}
                                {isProfitable ? (
                                  <ArrowUp size={12} style={{ color: '#10b981' }} />
                                ) : (
                                  <ArrowDown size={12} style={{ color: '#ef4444' }} />
                                )}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--accent)', fontWeight: 600 }}>
                              {pos.duration || '1 Day (24h)'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 12 }}>
                              {pos.tp || pos.sl ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {pos.tp && <span style={{ color: '#10b981', fontWeight: 600 }}>TP: ${pos.tp}</span>}
                                  {pos.sl && <span style={{ color: '#ef4444', fontWeight: 600 }}>SL: ${pos.sl}</span>}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text3)' }}>Market</span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: '12px 16px',
                                fontWeight: 700,
                                color: isProfitable ? '#16a34a' : '#dc2626',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: isProfitable ? '#16a34a15' : '#dc262615',
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: isProfitable ? '#16a34a' : '#dc2626',
                                  }}
                                />
                                {isProfitable ? '+' : ''}${pos.pnl.toFixed(2)} USD
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <button
                                type="button"
                                onClick={() => handleClosePosition(pos.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                Close &amp; Settle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* VIEW 2: TRADE HISTORY (READ from Firestore 'trades' collection) */}
          {tradesSubTab === 'history' && (
            <>
              {tradeHistory.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    background: 'var(--card)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                >
                  <History size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--text2)', margin: 0 }}>
                    No closed trades in Firestore history yet. Close an active position to see it recorded here.
                  </p>
                </div>
              ) : (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px' }}>Order ID</th>
                        <th style={{ padding: '12px 16px' }}>Instrument</th>
                        <th style={{ padding: '12px 16px' }}>Type</th>
                        <th style={{ padding: '12px 16px' }}>Volume</th>
                        <th style={{ padding: '12px 16px' }}>Entry Price</th>
                        <th style={{ padding: '12px 16px' }}>Exit Price</th>
                        <th style={{ padding: '12px 16px' }}>Open Time</th>
                        <th style={{ padding: '12px 16px' }}>Close Time</th>
                        <th style={{ padding: '12px 16px' }}>Realized P&amp;L</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((tr) => {
                        const finalPnl = tr.finalPnl !== undefined ? tr.finalPnl : tr.pnl;
                        const isProfitable = finalPnl >= 0;
                        return (
                          <tr key={tr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{tr.id}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{tr.symbol}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  fontSize: 11,
                                  background: tr.side === 'buy' ? '#16a34a20' : '#dc262620',
                                  color: tr.side === 'buy' ? '#16a34a' : '#dc2626',
                                }}
                              >
                                {tr.side.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>{tr.lotSize} Lots</td>
                            <td style={{ padding: '12px 16px' }}>${tr.entryPrice.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                              ${(tr.closePrice || tr.currentPrice).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text3)' }}>{tr.openTime}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text3)' }}>{tr.closeTime || '—'}</td>
                            <td
                              style={{
                                padding: '12px 16px',
                                fontWeight: 700,
                                color: isProfitable ? '#16a34a' : '#dc2626',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: isProfitable ? '#16a34a15' : '#dc262615',
                                }}
                              >
                                {isProfitable ? '+' : ''}${finalPnl.toFixed(2)} USD
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: 'var(--bg2)',
                                  color: 'var(--text2)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                Settled
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteTradeRecord(tr.id)}
                                title="Delete trade record from Firestore"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  background: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid #ef444440',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Bottom Navigation Bar / Dock */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 16px calc(8px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1000,
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('chart')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'chart' ? 'var(--accent)' : 'var(--text3)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <BarChart2 size={18} />
          <span>Trade</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('markets')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'markets' ? 'var(--accent)' : 'var(--text3)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <TrendingUp size={18} />
          <span>OTC Assets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('positions')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: activeTab === 'positions' ? 'var(--accent)' : 'var(--text3)',
            fontSize: 11,
            fontWeight: 600,
            position: 'relative',
          }}
        >
          <FileText size={18} />
          <span>Orders ({positions.length})</span>
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <User size={13} />
          </div>
          <span>Full Profile</span>
        </button>
      </nav>
    </div>
  );
}
