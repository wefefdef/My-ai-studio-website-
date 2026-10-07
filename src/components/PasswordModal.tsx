import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Check, ArrowRight, AlertCircle, Lock } from 'lucide-react';
import { UserAccount } from '../types';
import { StorageService } from '../services/storage';

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onPasswordChanged?: (updatedUser: UserAccount) => void;
}

export function PasswordModal({
  open,
  onClose,
  currentUser,
  onPasswordChanged,
}: PasswordModalProps) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setSuccess(false);
    } else {
      document.body.style.overflow = '';
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setError(null);
      setSuccess(false);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentUser?.email) {
      setError('No active user account found.');
      return;
    }

    if (!currentPw || !newPw || !confirmPw) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPw !== confirmPw) {
      setError('New passwords do not match.');
      return;
    }

    if (newPw.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    const result = StorageService.changePassword(
      currentUser.email,
      currentPw,
      newPw
    );

    if (!result.success || !result.user) {
      setError(result.error || 'Failed to update password.');
      return;
    }

    setSuccess(true);
    if (onPasswordChanged) {
      onPasswordChanged(result.user);
    }

    setTimeout(() => {
      onClose();
    }, 2200);
  }

  const isMismatch = Boolean(newPw && confirmPw && newPw !== confirmPw);

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className="app-modal pw-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="lm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, margin: 0 }}>Change Account Password</h2>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                {currentUser?.email || 'Logged in account'}
              </span>
            </div>
          </div>
          <button type="button" className="lm-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="lm-body">
          {success ? (
            <div className="pw-success-state fade-in" style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div
                className="pw-ok-icon"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#10b98120',
                  color: '#10b981',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Check size={32} />
              </div>
              <h3 style={{ fontSize: 18, margin: '0 0 8px 0', color: 'var(--text)' }}>
                Password Updated Successfully!
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                Your permanent login credentials have been updated. Use this new password when signing in next time.
              </p>
            </div>
          ) : (
            <form className="pw-modal-form" onSubmit={handleSubmit}>
              {error && (
                <div
                  className="fade-in"
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #f87171',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <div className="pw-field">
                <label>Current Password *</label>
                <div className="pw-input-row">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pw-field">
                <label>New Password * (Min. 6 chars)</label>
                <div className="pw-input-row">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Create a new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label="Toggle password visibility"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pw-field">
                <label>Confirm New Password *</label>
                <div className="pw-input-row">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isMismatch && (
                <p className="pw-mismatch-msg" style={{ color: '#ef4444', fontSize: 12, margin: '-6px 0 12px 0' }}>
                  Passwords do not match
                </p>
              )}

              <button
                className="primary-button"
                type="submit"
                style={{ width: '100%', marginTop: 12 }}
                disabled={!currentPw || !newPw || !confirmPw || isMismatch}
              >
                Update Password <ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
