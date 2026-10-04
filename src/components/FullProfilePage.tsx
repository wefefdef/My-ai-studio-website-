import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Briefcase,
  TrendingUp,
  DollarSign,
  Wallet,
  Sun,
  Moon,
  Lock,
  Shield,
  Headphones,
  LogOut,
  Sparkles,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { UserAccount } from '../types';
import { BrandMark } from './BrandMark';
import { PasswordModal } from './PasswordModal';
import { GoogleDriveModal } from './GoogleDriveModal';
import { Footer } from './Footer';

interface FullProfilePageProps {
  currentUser: UserAccount | null;
  onBack: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onSwitchAccountType: (type: 'live' | 'demo') => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export function FullProfilePage({
  currentUser,
  onBack,
  onLogout,
  theme,
  onThemeChange,
  onSwitchAccountType,
  onUserUpdated,
}: FullProfilePageProps) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);

  const isLive = currentUser?.accountType === 'live';
  const displayName = currentUser?.fullName || 'Trader Account';
  const displayEmail = currentUser?.email || 'user@immediate.com';
  const accountId = currentUser?.id || 'IMP-782914';

  return (
    <div className="trading-page" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top Navigation */}
      <header
        className="trading-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={onBack}
            className="back-button visible"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> Back to Trading
          </button>
          <BrandMark onClick={onBack} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #ef444450',
              background: '#ef444415',
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px', width: '100%' }}>
        {/* Profile Hero Header */}
        <section
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '28px 24px',
            marginBottom: 24,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a6dd4, #10b981)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 28,
                  fontWeight: 800,
                  boxShadow: '0 8px 20px rgba(26, 109, 212, 0.25)',
                }}
              >
                <User size={36} />
              </div>

              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
                  {displayName}
                </h1>
                <p style={{ margin: '0 0 10px 0', color: 'var(--text2)', fontSize: 14 }}>
                  {displayEmail}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      background: 'var(--bg2)',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    ID: {accountId}
                  </span>
                  <span
                    style={{
                      background: '#10b98118',
                      color: '#10b981',
                      border: '1px solid #10b98140',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={13} /> KYC Verified
                  </span>
                  <span
                    style={{
                      background: isLive ? '#1a6dd418' : 'var(--bg2)',
                      color: isLive ? '#1a6dd4' : 'var(--text2)',
                      border: isLive ? '1px solid #1a6dd440' : '1px solid var(--border)',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {isLive ? 'Live OTC Account' : 'Demo Account'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Mode Switcher */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--bg2)',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)' }}>
                Active Account Switcher
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onSwitchAccountType('live')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid var(--accent)',
                    background: isLive ? 'var(--accent)' : 'transparent',
                    color: isLive ? '#fff' : 'var(--text)',
                    transition: 'all 0.2s',
                  }}
                >
                  Live OTC (${(currentUser?.liveEquity ?? 250).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchAccountType('demo')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: !isLive ? 'var(--accent)' : 'transparent',
                    color: !isLive ? '#fff' : 'var(--text)',
                    transition: 'all 0.2s',
                  }}
                >
                  Demo (${(currentUser?.demoEquity ?? 10000).toLocaleString()})
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Card 1: Personal Credentials & Address */}
          <section
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h2
              style={{
                margin: '0 0 18px 0',
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <User size={18} color="var(--accent)" /> Personal &amp; Residential Data
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Full Legal Name</span>
                <strong style={{ fontSize: 14 }}>{displayName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Email Address</span>
                <strong style={{ fontSize: 14 }}>{displayEmail}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Phone Number</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.phone || '+234 800 000 0000'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Country of Residence</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.personalDetails?.residence || currentUser?.country || 'Nigeria'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Residential Address</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.personalDetails?.address || '12 Financial Way'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>City &amp; Postal Code</span>
                <strong style={{ fontSize: 14 }}>
                  {currentUser?.personalDetails?.city || 'Victoria'}, {currentUser?.personalDetails?.zipCode || '10001'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Date of Birth</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.personalDetails?.dob || '15 / 08 / 1994'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Nationality</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.personalDetails?.nationality || currentUser?.country || 'Nigeria'}</strong>
              </div>
            </div>
          </section>

          {/* Card 2: Identity & Regulatory Clearance */}
          <section
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h2
              style={{
                margin: '0 0 18px 0',
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ShieldCheck size={18} color="#10b981" /> Identity &amp; Verification
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Document Type</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.personalDetails?.idType || 'National ID'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Document Reference</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.personalDetails?.idNumber || 'Verified & Archived'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Tax Identification (TIN)</span>
                <strong style={{ fontSize: 14 }}>
                  {currentUser?.questionnaire?.notUsCitizen
                    ? 'Exempt (Non-US Citizen)'
                    : currentUser?.questionnaire?.tin || 'Verified'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Regulatory Clearance</span>
                <strong style={{ fontSize: 14, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} /> AOFA / SEC Compliant
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Account Protection</span>
                <strong style={{ fontSize: 14 }}>Segregated Client Funds</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Member Since</span>
                <strong style={{ fontSize: 14 }}>
                  {currentUser?.createdAt
                    ? new Date(currentUser.createdAt).toLocaleDateString()
                    : 'Recent'}
                </strong>
              </div>
            </div>
          </section>

          {/* Card 3: Investor Suitability (KYC Questionnaire) */}
          <section
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h2
              style={{
                margin: '0 0 18px 0',
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <TrendingUp size={18} color="var(--accent)" /> Investor Suitability Profile
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Age Bracket</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.questionnaire?.age || '25-34'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Profession / Occupation</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.questionnaire?.profession || 'Business & Enterprise'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Trading Experience</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.questionnaire?.experience || 'Active Trader'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Investment Objective</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.questionnaire?.reason || 'Capital Growth & Income'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Trading Method</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.questionnaire?.method || 'Self Trading'}</strong>
              </div>
            </div>
          </section>

          {/* Card 4: Financial Balances & Funding */}
          <section
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h2
              style={{
                margin: '0 0 18px 0',
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Wallet size={18} color="var(--accent)" /> Balances &amp; Deposit History
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Live OTC Equity</span>
                <strong style={{ fontSize: 16, color: '#10b981' }}>
                  ${(currentUser?.liveEquity ?? 250).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Demo Virtual Equity</span>
                <strong style={{ fontSize: 16 }}>
                  ${(currentUser?.demoEquity ?? 10000).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Latest Deposit Record</span>
                <strong style={{ fontSize: 14 }}>
                  {currentUser?.deposit ? `$${currentUser.deposit.amount} via ${currentUser.deposit.method}` : 'Deposit verified'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>Active Open Trades</span>
                <strong style={{ fontSize: 14 }}>{currentUser?.positions?.length || 0} Open Position(s)</strong>
              </div>
            </div>
          </section>
        </div>

        {/* Security, Settings & Preferences */}
        <section
          style={{
            marginTop: 24,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 24,
          }}
        >
          <h2
            style={{
              margin: '0 0 18px 0',
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={18} color="var(--accent)" /> App Preferences &amp; Security Controls
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* Theme switcher */}
            <div
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', display: 'block', marginBottom: 10 }}>
                Display Theme
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: theme === 'light' ? 'var(--accent)' : 'transparent',
                    color: theme === 'light' ? '#fff' : 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: theme === 'dark' ? 'var(--accent)' : 'transparent',
                    color: theme === 'dark' ? '#fff' : 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                  Password Management
                </span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Update your permanent credentials</span>
              </div>
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Lock size={14} /> Change Password
              </button>
            </div>

            {/* Google Drive Cloud Integration */}
            <div
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                  Cloud Storage &amp; Sync
                </span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Google Drive Statements &amp; Dossiers</span>
              </div>
              <button
                type="button"
                onClick={() => setDriveOpen(true)}
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #4285F4',
                  background: 'rgba(66, 133, 244, 0.08)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <HardDrive size={14} style={{ color: '#4285F4' }} /> Open Google Drive
              </button>
            </div>

            {/* 24/7 Support */}
            <div
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', display: 'block', marginBottom: 4 }}>
                  Dedicated Assistance
                </span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>support@immediate.com (24/7 Active)</span>
              </div>
              <button
                type="button"
                onClick={() => alert('Support line open 24/7. Email support@immediate.com or contact your account manager.')}
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Headphones size={14} /> Contact Support
              </button>
            </div>
          </div>
        </section>

        {/* Back to trading CTA */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            className="primary-button"
            style={{ maxWidth: 280, margin: '0 auto', display: 'inline-flex' }}
          >
            Return to Trading Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </main>

      <PasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={(updated) => {
          if (onUserUpdated) onUserUpdated(updated);
        }}
      />
      <GoogleDriveModal
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        currentUser={currentUser}
      />
      <Footer />
    </div>
  );
}
