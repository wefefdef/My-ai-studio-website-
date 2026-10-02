import React from 'react';
import { BrandMark } from './BrandMark';

interface FooterProps {
  onOpenOwnerAuth?: () => void;
}

export function Footer({ onOpenOwnerAuth }: FooterProps) {
  return (
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
        <div className="footer-license">
          <p>
            Immediate Payments Ltd is incorporated under the laws of the Union of Comoros and is
            licensed and regulated by the Anjouan Offshore Financial Services Authority (AOFA)
            under license number L15628/2024.
          </p>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Immediate Payments Ltd. All rights reserved.</p>
          <p>Union of Comoros · Anjouan · AOFA License L15628/2024</p>
        </div>
        {onOpenOwnerAuth && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <button
              type="button"
              onClick={onOpenOwnerAuth}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'currentColor',
                opacity: 0.18,
                transition: 'opacity 0.2s ease',
                lineHeight: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.45')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.18')}
              aria-label="System"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
