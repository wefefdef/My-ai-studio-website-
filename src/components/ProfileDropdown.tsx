import { useState, useEffect, useRef } from 'react';
import {
  User,
  X,
  Sparkles,
  Sun,
  Moon,
  Headphones,
  Lock,
  Shield,
  ArrowRight,
  FileText,
  LogOut,
  HardDrive,
} from 'lucide-react';
import { PasswordModal } from './PasswordModal';
import { ProfileDetailsModal } from './ProfileDetailsModal';
import { GoogleDriveModal } from './GoogleDriveModal';
import { UserAccount } from '../types';

interface ProfileDropdownProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onSwitchAccountType?: (type: 'live' | 'demo') => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export function ProfileDropdown({
  theme,
  onThemeChange,
  currentUser,
  onLogout,
  onSwitchAccountType,
  onUserUpdated,
}: ProfileDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const displayName = currentUser?.fullName || 'Trader Account';
  const displayEmail = currentUser?.email || 'user@immediate.com';

  return (
    <>
      <div className="profile-dropdown-wrap" ref={menuRef}>
        <button
          className="profile-btn"
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="Profile"
        >
          <User size={20} />
        </button>

        {dropdownOpen && (
          <div className="profile-dropdown fade-in">
            <div className="pd-header">
              <div className="pd-avatar">
                <User size={20} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p className="pd-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {displayName}
                </p>
                <p className="pd-email" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {displayEmail}
                </p>
              </div>
              <button
                className="pd-close"
                type="button"
                onClick={() => setDropdownOpen(false)}
                aria-label="Close profile menu"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pd-section">
              <span className="pd-label">
                <Sparkles size={12} /> Theme
              </span>
              <div className="pd-theme-row">
                <button
                  type="button"
                  className={theme === 'light' ? 'pd-theme active' : 'pd-theme'}
                  onClick={() => onThemeChange('light')}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  type="button"
                  className={theme === 'dark' ? 'pd-theme active' : 'pd-theme'}
                  onClick={() => onThemeChange('dark')}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>

            <div className="pd-links">
              <button
                type="button"
                className="pd-link"
                onClick={() => {
                  setDropdownOpen(false);
                  setProfileModalOpen(true);
                }}
              >
                <FileText size={15} /> My Profile &amp; Details <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="pd-link"
                onClick={() => {
                  setDropdownOpen(false);
                  setPasswordOpen(true);
                }}
              >
                <Lock size={15} /> Password <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="pd-link"
                onClick={() => {
                  setDropdownOpen(false);
                  setDriveOpen(true);
                }}
              >
                <HardDrive size={15} style={{ color: '#4285F4' }} /> Google Drive <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="pd-link"
                onClick={() => {
                  alert('Customer support is available 24/7 at support@immediate.com');
                }}
              >
                <Headphones size={15} /> Support <ArrowRight size={14} />
              </button>

              {onLogout && (
                <button
                  type="button"
                  className="pd-link"
                  style={{ color: '#ef4444' }}
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={15} /> Sign Out <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ProfileDetailsModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={currentUser || null}
        onSwitchAccountType={onSwitchAccountType}
      />
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
    </>
  );
}
