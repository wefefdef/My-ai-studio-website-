import { useState } from 'react';
import { BrandMark } from './BrandMark';
import { OneTimeInviteModal } from './OneTimeInviteModal';

export function Footer() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <>
      <footer className="company-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <BrandMark />
          </div>
          <p className="footer-about">
            Immediate is a multi-asset trading platform offering access to global financial markets. We
            provide secure, transparent, and efficient trading services to clients across Africa and
            beyond.
          </p>
          <div className="footer-links">
            <a href="#about">About us</a>
            <a href="#terms">Terms of use</a>
            <a href="#privacy">Privacy policy</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Immediate Payments Ltd. All rights reserved.</p>
          </div>
          {/* Small simple symbol at absolute bottom without heading or label */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text3, #8896a8)',
                fontSize: 13,
                cursor: 'pointer',
                padding: '6px 10px',
                opacity: 0.5,
                transition: 'opacity 0.2s',
                lineHeight: 1,
              }}
            >
              •
            </button>
          </div>
        </div>
      </footer>

      <OneTimeInviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </>
  );
}
