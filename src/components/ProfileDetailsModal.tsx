import React, { useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import { UserAccount } from '../types';

interface ProfileDetailsModalProps {
  open: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onSwitchAccountType?: (type: 'live' | 'demo') => void;
}

export function ProfileDetailsModal({
  open,
  onClose,
  user,
  onSwitchAccountType,
}: ProfileDetailsModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !user) return null;

  const isLive = user.accountType === 'live';

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className="app-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="lm-header" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>My Profile &amp; Account Details</h2>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                Account ID: <strong>{user.id}</strong>
              </span>
            </div>
          </div>
          <button type="button" className="lm-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="lm-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account status banner */}
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  color: '#16a34a',
                  background: '#16a34a18',
                  padding: 8,
                  borderRadius: '50%',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>
                  Verified Account ({isLive ? 'Live Trading' : 'Demo Practice'})
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  All KYC &amp; Regulatory checks completed
                </span>
              </div>
            </div>

            {onSwitchAccountType && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => onSwitchAccountType('live')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--accent)',
                    background: isLive ? 'var(--accent)' : 'transparent',
                    color: isLive ? '#fff' : 'var(--text)',
                  }}
                >
                  Live Account (${user.liveEquity.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchAccountType('demo')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: !isLive ? 'var(--accent)' : 'transparent',
                    color: !isLive ? '#fff' : 'var(--text)',
                  }}
                >
                  Demo Account (${user.demoEquity.toLocaleString()})
                </button>
              </div>
            )}
          </div>

          {/* Section 1: Registration info */}
          <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={15} /> Personal Credentials
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Full Name</span>
                <strong style={{ fontSize: 14 }}>{user.fullName}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Email Address</span>
                <strong style={{ fontSize: 14 }}>{user.email}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Phone Number</span>
                <strong style={{ fontSize: 14 }}>{user.phone}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Country</span>
                <strong style={{ fontSize: 14 }}>{user.country}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Address & ID */}
          <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} /> Address &amp; Verification Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Residential Address</span>
                <strong style={{ fontSize: 14 }}>{user.personalDetails?.address || '12 Financial Way'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>City &amp; Zip Code</span>
                <strong style={{ fontSize: 14 }}>
                  {user.personalDetails?.city || 'Victoria'}, {user.personalDetails?.zipCode || '10001'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Nationality</span>
                <strong style={{ fontSize: 14 }}>{user.personalDetails?.nationality || user.country}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Date of Birth</span>
                <strong style={{ fontSize: 14 }}>{user.personalDetails?.dob || '15 / 08 / 1994'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Identification Document</span>
                <strong style={{ fontSize: 14 }}>
                  {user.personalDetails?.idType || 'National ID'} {user.personalDetails?.idNumber ? `(${user.personalDetails.idNumber})` : ''}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Verification Status</span>
                <strong style={{ fontSize: 14, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} /> Passed Regulatory KYC
                </strong>
              </div>
            </div>
          </div>

          {/* Section 3: Investor Profile */}
          <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={15} /> Investor Suitability Profile
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Age Range</span>
                <strong style={{ fontSize: 14 }}>{user.questionnaire?.age || '25-34'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Profession / Occupation</span>
                <strong style={{ fontSize: 14 }}>{user.questionnaire?.profession || 'Business Owner'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Trading Experience</span>
                <strong style={{ fontSize: 14 }}>{user.questionnaire?.experience || 'Active Trader'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Primary Investment Objective</span>
                <strong style={{ fontSize: 14 }}>{user.questionnaire?.reason || 'Capital Growth & Income'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Trading Method</span>
                <strong style={{ fontSize: 14 }}>{user.questionnaire?.method || 'Self Trading'}</strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Tax Identification Status</span>
                <strong style={{ fontSize: 14 }}>
                  {user.questionnaire?.notUsCitizen
                    ? 'Exempt (Non-US Citizen)'
                    : user.questionnaire?.tin || 'Exempt / Not Applicable'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 4: Balances & Funding */}
          <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wallet size={15} /> Capital &amp; Balances
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Live Trading Equity</span>
                <strong style={{ fontSize: 16, color: 'var(--accent)' }}>
                  ${user.liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Demo Virtual Balance</span>
                <strong style={{ fontSize: 16 }}>
                  ${user.demoEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'block' }}>Deposit Records</span>
                <strong style={{ fontSize: 14 }}>
                  {user.deposit ? `$${user.deposit.amount} (${user.deposit.method})` : 'Live Account Ready'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
