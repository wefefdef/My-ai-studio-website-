import React, { useState, useEffect } from 'react';
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
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { MarketAsset, UserAccount, TradePosition } from '../types';
import { MARKET_CATEGORIES, MARKET_ASSETS, OTC_ASSETS, NEWS_HEADLINES } from '../data/markets';
import { BrandMark } from './BrandMark';
import { InteractiveChart } from './InteractiveChart';
import { SparklineChart } from './SparklineChart';
import { StorageService } from '../services/storage';

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
  const [otcAssets, setOtcAssets] = useState<MarketAsset[]>(OTC_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset>(OTC_ASSETS[0]);
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

  const bookedBalance =
    accountMode === 'live'
      ? (currentUser?.liveEquity ?? 250)
      : (currentUser?.demoEquity ?? 10000);

  const positions = currentUser?.positions || [];

  // READ Operation: Fetch user's trade history and open positions from Firestore 'trades' collection on login/mount
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

  useEffect(() => {
    fetchUserTrades();
  }, [currentUser?.email]);

  // Contract sizing for authentic financial market PnL calculation
  const getContractMultiplier = (symbol: string): number => {
    if (symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('USD/JPY') || symbol.includes('AUD')) {
      return 100000; // 100,000 units standard Forex lot
    }
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') || symbol.includes('XRP')) {
      return 1; // 1 crypto unit
    }
    if (symbol.includes('XAU') || symbol.includes('Gold')) {
      return 100; // 100 oz Gold
    }
    if (symbol.includes('XAG') || symbol.includes('Silver')) {
      return 5000; // 5000 oz Silver
    }
    if (symbol.includes('BCO') || symbol.includes('Oil') || symbol.includes('NG')) {
      return 1000; // 1000 barrels Oil / MMBtu Gas
    }
    return 100; // 100 shares per lot for Stocks / Indices
  };

  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.pnl || 0), 0);
  const currentEquity = +(bookedBalance + totalUnrealizedPnl).toFixed(2);

  // Standard margin calculation with 1:100 leverage
  const marginUsed = positions.reduce((acc, pos) => {
    const notional = pos.entryPrice * getContractMultiplier(pos.symbol) * pos.lotSize;
    return acc + notional / 100;
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
  // P&L is calculated strictly according to live price vs entry price
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Tick live market quotes
      let updatedSelected: MarketAsset | null = null;
      let newAssetList: MarketAsset[] = [];

      setOtcAssets((prevAssets) => {
        newAssetList = prevAssets.map((asset) => {
          let volatility = 0.0002;
          if (asset.category === 'Crypto') volatility = 0.0006;
          else if (asset.category === 'Forex') volatility = 0.00008;
          else if (asset.category === 'Commodities') volatility = 0.00025;
          else if (asset.category === 'Stocks') volatility = 0.0003;

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
        return newAssetList;
      });

      if (updatedSelected) {
        setSelectedAsset(updatedSelected);
      }

      // 2. Revalue open positions against live market quotes
      if (!currentUser?.positions || currentUser.positions.length === 0 || !currentUser?.email) {
        return;
      }

      const email = currentUser.email;
      let hasChange = false;
      const currentPositions = currentUser.positions;

      const updatedPositions = currentPositions.map((pos) => {
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

        // Check TP Trigger (Take Profit)
        if (pos.tp) {
          const tpVal = parseFloat(pos.tp);
          if (!isNaN(tpVal)) {
            const hitTp =
              (pos.side === 'buy' && livePrice >= tpVal) ||
              (pos.side === 'sell' && livePrice <= tpVal);
            if (hitTp) {
              StorageService.closePosition(email, pos.id);
              setTradeNotification(
                `Take Profit triggered for ${pos.symbol}! Position settled with +$${livePnl.toFixed(2)} USD.`
              );
              setTimeout(() => setTradeNotification(null), 4000);
              return pos;
            }
          }
        }

        // Check SL Trigger (Stop Loss)
        if (pos.sl) {
          const slVal = parseFloat(pos.sl);
          if (!isNaN(slVal)) {
            const hitSl =
              (pos.side === 'buy' && livePrice <= slVal) ||
              (pos.side === 'sell' && livePrice >= slVal);
            if (hitSl) {
              StorageService.closePosition(email, pos.id);
              setTradeNotification(
                `Stop Loss executed for ${pos.symbol}. Position closed at market price ($${livePnl.toFixed(2)} USD).`
              );
              setTimeout(() => setTradeNotification(null), 4000);
              return pos;
            }
          }
        }

        if (livePrice !== pos.currentPrice || livePnl !== pos.pnl) {
          hasChange = true;
          return {
            ...pos,
            currentPrice: livePrice,
            pnl: livePnl,
          };
        }
        return pos;
      });

      if (hasChange) {
        const updatedUser = StorageService.updatePositions(email, updatedPositions);
        if (updatedUser && onUserUpdated) {
          onUserUpdated(updatedUser);
        }
      }
    }, 1400);

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
    setLotSize((prev) => {
      const current = parseFloat(prev) || 0.1;
      const next = Math.max(0.01, +(current + delta).toFixed(2));
      return String(next);
    });
  }

  // CREATE Operation: Save new trade directly to Firestore 'trades' collection and storage
  async function handleExecuteTrade(side: 'buy' | 'sell') {
    const parsedLot = parseFloat(lotSize) || 0.1;
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
      entryPrice: entry,
      currentPrice: entry,
      tp: tp.trim() || undefined,
      sl: sl.trim() || undefined,
      pnl: Math.min(-0.15, initialSpreadCost),
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

    // Save directly to Firestore 'trades' collection
    if (currentUser?.email) {
      try {
        const tradeRef = doc(db, 'trades', newPosition.id);
        await setDoc(tradeRef, {
          ...newPosition,
          accountType: currentUser.accountType || accountMode,
        });
      } catch (err) {
        console.error('Firestore save trade error:', err);
      }

      const updated = StorageService.addPosition(currentUser.email, newPosition);
      if (updated && onUserUpdated) onUserUpdated(updated);
    }

    const message = `Market Order Executed: ${side.toUpperCase()} ${parsedLot} Lot(s) ${selectedAsset.name} @ $${entry.toLocaleString(undefined, { minimumFractionDigits: isSmall ? 4 : 2 })}`;
    setTradeNotification(message);
    setTimeout(() => {
      setTradeNotification(null);
    }, 3500);
  }

  // UPDATE Operation: Update trade in Firestore 'trades' collection to 'closed'
  async function handleClosePosition(posId: string) {
    if (!currentUser?.email) return;

    const posToClose = positions.find((p) => p.id === posId);
    const now = new Date();
    const closeTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update in Firestore 'trades' collection
    try {
      const tradeRef = doc(db, 'trades', posId);
      await updateDoc(tradeRef, {
        status: 'closed',
        closeTime: closeTimeStr,
        closedAt: now.toISOString(),
        closePrice: posToClose?.currentPrice || selectedAsset.price,
        finalPnl: posToClose?.pnl || 0,
      });
    } catch (err) {
      console.warn('Firestore update trade close error:', err);
    }

    // Add to local trade history state immediately
    if (posToClose) {
      const closedRecord: TradePosition = {
        ...posToClose,
        status: 'closed',
        closeTime: closeTimeStr,
        closePrice: posToClose.currentPrice,
        finalPnl: posToClose.pnl,
        closedAt: now.toISOString(),
      };
      setTradeHistory((prev) => [closedRecord, ...prev.filter((t) => t.id !== posId)]);
    }

    const updated = StorageService.closePosition(currentUser.email, posId);
    if (updated && onUserUpdated) onUserUpdated(updated);
    setTradeNotification('Position closed at market price and recorded in trade history.');
    setTimeout(() => setTradeNotification(null), 2500);
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
              }}
            >
              LIVE OTC
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
              }}
            >
              DEMO
            </button>
          </div>

          <div className="equity-item">
            <span className="equity-label">
              {accountMode === 'live' ? 'Live Equity' : 'Demo Equity'}
            </span>
            <span className="equity-value">
              ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
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
            background: 'var(--accent)',
            color: '#fff',
            padding: '10px 20px',
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{tradeNotification}</span>
        </div>
      )}

      <div className="news-ticker">
        <TrendingUp size={14} />
        <span className="ticker-text" key={newsIndex}>
          {NEWS_HEADLINES[newsIndex]}
        </span>
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
              (6 OTC Assets Enabled · 24-Hour Trade Execution)
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
          OTC Markets (6 Assets)
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
              <div className="tool-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  <Clock size={15} />
                  <span>Trade Duration: <strong>1 Day (24h)</strong></span>
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
                  <label>Lot Size / Volume</label>
                  <div className="lot-control">
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
                </div>

                <div className="tool-field">
                  <label>Take Profit (TP)</label>
                  <input
                    type="text"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    placeholder="Auto / Price"
                    className="tool-input"
                  />
                </div>

                <div className="tool-field">
                  <label>Stop Loss (SL)</label>
                  <input
                    type="text"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    placeholder="Auto / Price"
                    className="tool-input"
                  />
                </div>
              </div>

              <div className="trade-actions">
                <button
                  className="trade-btn buy"
                  type="button"
                  onClick={() => handleExecuteTrade('buy')}
                >
                  Buy {selectedAsset.symbol} (1 Day)
                </button>
                <button
                  className="trade-btn sell"
                  type="button"
                  onClick={() => handleExecuteTrade('sell')}
                >
                  Sell {selectedAsset.symbol} (1 Day)
                </button>
              </div>
            </div>
          </div>

          <div className="trading-sidebar">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
              OTC Trading Instruments
            </div>

            <div className="asset-list">
              {otcAssets.map((asset) => (
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
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            <h3 style={{ margin: 0, fontSize: 16 }}>Available OTC Assets (6 High-Liquidity Contracts)</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>
              Trade Gold, Silver, Oil, GBP/USD, Bitcoin, and Apple on 1-day contract expirations.
            </p>
          </div>

          <div className="markets-header-row">
            <span className="mh-col mh-asset">Asset</span>
            <span className="mh-col mh-price">Current Price</span>
            <span className="mh-col mh-change">24h Change</span>
            <span className="mh-col mh-chart">Trend</span>
            <span className="mh-col mh-action">Action</span>
          </div>

          <div className="markets-list">
            {otcAssets.map((asset) => (
              <div className="market-row" key={asset.symbol}>
                <div className="mh-col mh-asset">
                  <span className="m-name">{asset.name}</span>
                  <span className="m-symbol">{asset.symbol}</span>
                </div>
                <span className="mh-col mh-price m-price">
                  ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    Trade 1-Day <ChevronRight size={14} />
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
