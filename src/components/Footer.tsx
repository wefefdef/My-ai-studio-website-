import React from 'react';
import { BrandMark } from './BrandMark';

export function Footer() {
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
      </div>
    </footer>
  );
}
