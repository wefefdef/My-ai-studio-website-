import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  TrendingUp,
  Globe,
  ChartLine,
  Banknote,
  ChartColumn,
  Zap,
  Scale,
  ShieldCheck,
  Headphones,
  BookOpen,
  Lock,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { Footer } from './Footer';
import { STATS_ITEMS } from '../data/markets';

interface LandingPageProps {
  onLogin: () => void;
  onStartTrading: () => void;
}

const TRADING_INSTRUMENTS = [
  {
    icon: Globe,
    label: 'Forex',
    desc: 'Trade major, minor and exotic currency pairs with tight spreads.',
  },
  {
    icon: ChartLine,
    label: 'Indices',
    desc: "Access the world's top indices including S&P 500, NASDAQ and more.",
  },
  {
    icon: Banknote,
    label: 'Commodities',
    desc: 'Trade gold, oil, silver and other commodities in real time.',
  },
  {
    icon: ChartColumn,
    label: 'Stocks',
    desc: 'Invest in shares of leading global companies.',
  },
  {
    icon: Zap,
    label: 'Crypto',
    desc: 'Trade Bitcoin, Ethereum and other popular cryptocurrencies.',
  },
  {
    icon: Scale,
    label: 'CFDs',
    desc: 'Contract for difference trading across multiple asset classes.',
  },
];

const ADVANTAGES = [
  {
    icon: ShieldCheck,
    title: 'Secured & Regulated',
    desc: 'Your funds are protected with industry-leading security protocols and regulatory compliance.',
  },
  {
    icon: Zap,
    title: 'Fast Execution',
    desc: 'Lightning-fast order execution with minimal slippage, even in volatile market conditions.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    desc: 'Our dedicated support team is available around the clock to assist you with any queries.',
  },
  {
    icon: ChartLine,
    title: 'Advanced Tools',
    desc: 'Professional-grade charting, technical indicators, and analysis tools at your fingertips.',
  },
  {
    icon: BookOpen,
    title: 'Education Center',
    desc: 'Comprehensive learning resources, webinars, and tutorials to sharpen your trading skills.',
  },
  {
    icon: Lock,
    title: 'Data Protection',
    desc: 'Bank-level encryption and strict privacy measures to keep your personal data safe.',
  },
];

export function LandingPage({ onLogin, onStartTrading }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="lp">
      <nav className={scrolled ? 'lp-nav scrolled' : 'lp-nav'}>
        <div className="lp-nav-inner">
          <BrandMark />
          <div className="lp-nav-links">
            <a href="#instruments">Markets</a>
            <a href="#advantages">Why Us</a>
            <a href="#potential">Learn</a>
          </div>
          <button className="lp-login-btn" type="button" onClick={onLogin}>
            Login <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-hero-inner">
          <p className="lp-hero-eyebrow">WORLD-CLASS TRADING PLATFORM</p>
          <h1 className="lp-hero-title">
            A World-Leading
            <br />
            <span>Trading Experience</span>
          </h1>
          <p className="lp-hero-sub">
            Trade commodities, currencies, stocks, indices, CFDs and crypto-currencies with a trusted,
            regulated platform. Enjoy low spreads, fast execution and powerful trading tools.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-cta-btn" type="button" onClick={onStartTrading}>
              Start Trading <ArrowRight size={20} />
            </button>
            <a href="#discover" className="lp-ghost-btn">
              Discover More <ArrowRight size={16} />
            </a>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-mock-dashboard">
              <div className="lp-mock-header">
                <span className="lp-mock-dot green"></span>
                <span className="lp-mock-dot yellow"></span>
                <span className="lp-mock-dot red"></span>
                <span className="lp-mock-title">Immediate Trading Platform</span>
              </div>
              <div className="lp-mock-body">
                <div className="lp-mock-chart">
                  <svg viewBox="0 0 400 120" className="lp-chart-svg">
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a6dd4" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#1a6dd4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,90 Q50,80 80,60 T160,50 T240,30 T320,45 T400,20"
                      fill="none"
                      stroke="#1a6dd4"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M0,90 Q50,80 80,60 T160,50 T240,30 T320,45 T400,20 L400,120 L0,120 Z"
                      fill="url(#cg)"
                    />
                  </svg>
                </div>
                <div className="lp-mock-stats">
                  <div className="lp-ms">
                    <span className="lp-ms-label">BTC/USD</span>
                    <span className="lp-ms-val pos">$67,432.50</span>
                  </div>
                  <div className="lp-ms">
                    <span className="lp-ms-label">ETH/USD</span>
                    <span className="lp-ms-val neg">$3,521.80</span>
                  </div>
                  <div className="lp-ms">
                    <span className="lp-ms-label">Gold</span>
                    <span className="lp-ms-val pos">$2,345.60</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-stats">
        <div className="lp-stats-inner">
          {STATS_ITEMS.map((item) => (
            <div className="lp-stat" key={item.label}>
              <span className="lp-stat-value">{item.value}</span>
              <span className="lp-stat-label">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-discover" id="discover">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">WHY CHOOSE IMMEDIATE</p>
          <h2 className="lp-section-title">Discover a Better Way to Trade</h2>
          <p className="lp-section-sub">
            Our platform combines cutting-edge technology with intuitive design, giving you
            everything you need to navigate the global financial markets with confidence. Whether
            you are a beginner or an experienced trader, Immediate provides the tools and support
            you need.
          </p>
          <div className="lp-discover-grid">
            <div className="lp-disc-card">
              <div className="lp-disc-icon">
                <Globe size={24} />
              </div>
              <h3>Global Access</h3>
              <p>
                Trade 150+ instruments across forex, stocks, indices, commodities, and crypto from a
                single platform.
              </p>
            </div>
            <div className="lp-disc-card">
              <div className="lp-disc-icon">
                <ShieldCheck size={24} />
              </div>
              <h3>Fully Regulated</h3>
              <p>
                Licensed and regulated to provide you with a secure and transparent trading
                environment.
              </p>
            </div>
            <div className="lp-disc-card">
              <div className="lp-disc-icon">
                <Zap size={24} />
              </div>
              <h3>Lightning Fast</h3>
              <p>
                Execute trades in milliseconds with our high-performance infrastructure and smart
                order routing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-gateway">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">YOUR GATEWAY</p>
          <h2 className="lp-section-title">Your Gateway to Global Markets</h2>
          <p className="lp-section-sub">
            Immediate gives you access to the world's most traded assets. From currency pairs and
            equities to precious metals and digital currencies, diversify your portfolio and seize
            opportunities across every market.
          </p>
          <button className="lp-cta-btn" type="button" onClick={onStartTrading}>
            Open an Account <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <section className="lp-instruments" id="instruments">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">TRADING INSTRUMENTS</p>
          <h2 className="lp-section-title">What You Can Trade</h2>
          <div className="lp-instr-grid">
            {TRADING_INSTRUMENTS.map((item) => {
              const Icon = item.icon;
              return (
                <div className="lp-instr-card" key={item.label}>
                  <div className="lp-instr-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{item.label}</h3>
                  <p>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lp-advantages" id="advantages">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">THE IMMEDIATE ADVANTAGE</p>
          <h2 className="lp-section-title">Discover the Immediate Advantage</h2>
          <div className="lp-adv-grid">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon;
              return (
                <div className="lp-adv-card" key={item.title}>
                  <div className="lp-adv-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lp-adv-cta">
            <button className="lp-cta-btn" type="button" onClick={onStartTrading}>
              Get Started Now <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      <section className="lp-potential" id="potential">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">LEVEL UP YOUR TRADING</p>
          <h2 className="lp-section-title">Unlock Your True Trading Potential</h2>
          <div className="lp-potential-grid">
            <div className="lp-pot-card">
              <div className="lp-pot-icon">
                <BookOpen size={28} />
              </div>
              <h3>Educational Articles</h3>
              <p>
                Learn the fundamentals of trading, market analysis, and risk management from
                expert-written articles and guides.
              </p>
              <button type="button" className="lp-pot-link" onClick={onStartTrading}>
                Explore <ArrowRight size={14} />
              </button>
            </div>
            <div className="lp-pot-card">
              <div className="lp-pot-icon">
                <TrendingUp size={28} />
              </div>
              <h3>Optimize Your Trades with Expert Tools</h3>
              <p>
                Leverage professional-grade charting tools, technical indicators, and real-time
                market data to make informed decisions.
              </p>
              <button type="button" className="lp-pot-link" onClick={onStartTrading}>
                Learn More <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-final-cta">
        <div className="lp-section-inner lp-final-inner">
          <h2>Trading Made Simple</h2>
          <p>
            Start an account in minutes. Access over 150 instruments across global markets with
            competitive spreads and fast execution.
          </p>
          <button className="lp-cta-btn lp-cta-white" type="button" onClick={onStartTrading}>
            Start Trading Now <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
