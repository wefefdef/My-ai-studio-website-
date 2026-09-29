import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface LicenseModalProps {
  open: boolean;
  onClose: () => void;
}

export function LicenseModal({ open, onClose }: LicenseModalProps) {
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

  if (!open) return null;

  return (
    <div className="license-modal-overlay" onClick={onClose}>
      <div className="license-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-header">
          <h2>License &amp; Regulation</h2>
          <button type="button" className="lm-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="lm-body">
          <div className="lm-intro">
            <ShieldCheck size={22} />
            <p>
              Immediate Payments Ltd is a fully licensed and regulated multi-asset trading platform,
              authorized by the following regulatory bodies:
            </p>
          </div>

          <div className="lm-cert">
            <div className="lm-cert-border">
              <div className="lm-cert-top">
                <div className="lm-cert-seal">CERTIFIED</div>
                <h3>Certificate of Regulatory Compliance</h3>
                <p className="lm-cert-entity">Immediate Payments Ltd</p>
              </div>

              <div className="lm-authorities">
                <div className="lm-auth">
                  <div className="lm-badge sec">SEC</div>
                  <div>
                    <strong>Securities and Exchange Commission</strong>
                    <span>Capital markets regulation and investor protection</span>
                  </div>
                </div>

                <div className="lm-auth">
                  <div className="lm-badge cbn">CBN</div>
                  <div>
                    <strong>Central Bank of Nigeria</strong>
                    <span>Monetary policy and financial system stability</span>
                  </div>
                </div>

                <div className="lm-auth">
                  <div className="lm-badge cac">CAC</div>
                  <div>
                    <strong>Corporate Affairs Commission</strong>
                    <span>Business registration and corporate governance</span>
                  </div>
                </div>

                <div className="lm-auth">
                  <div className="lm-badge fca">FCA</div>
                  <div>
                    <strong>Financial Conduct Authority</strong>
                    <span>International financial services regulation (UK)</span>
                  </div>
                </div>
              </div>

              <div className="lm-cert-footer">
                <div className="lm-stamps">
                  {['SEC', 'CBN', 'CAC', 'FCA'].map((item) => (
                    <div className="lm-round-stamp" key={item}>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="lm-cert-date">Issued: January 2024 · Valid: Ongoing</p>
                <p className="lm-cert-ref">Ref: IMP/LIC/2024/SEC-CBN-CAC-FCA</p>
              </div>
            </div>
          </div>

          <div className="lm-reg-details">
            <h3>Regulatory Bodies — Full Details</h3>

            <div className="lm-reg-card">
              <div className="lm-reg-card-head">
                <div className="lm-badge cbn">CBN</div>
                <strong>Central Bank of Nigeria</strong>
              </div>
              <p>
                The CBN is the apex monetary authority of Nigeria, established by the CBN Act of
                1958 and reconstituted under the CBN Act of 2007. The bank is charged with the overall
                management and control of monetary policy, regulation of banking, and supervision of
                all financial institutions in Nigeria.
              </p>
              <div className="lm-reg-meta">
                <div>
                  <span>Headquarters</span>
                  <strong>Abuja, Nigeria</strong>
                </div>
                <div>
                  <span>Established</span>
                  <strong>1 July 1959</strong>
                </div>
                <div>
                  <span>Governor</span>
                  <strong>Dr. Olayemi Cardoso</strong>
                </div>
                <div>
                  <span>Website</span>
                  <strong>www.cbn.gov.ng</strong>
                </div>
              </div>
              <p className="lm-reg-scope">
                Scope of oversight: foreign exchange regulation, payment systems, deposit money
                banks, microfinance banks, bureau de change operations, and anti-money laundering
                enforcement.
              </p>
            </div>

            <div className="lm-reg-card">
              <div className="lm-reg-card-head">
                <div className="lm-badge sec">SEC</div>
                <strong>Securities and Exchange Commission</strong>
              </div>
              <p>
                The SEC is the apex regulatory body for the Nigerian capital market. Established by the
                Investments and Securities Act (ISA) 2007, it is mandated to regulate and develop the
                Nigerian capital market, protect investors, and maintain fair, efficient, and
                transparent markets.
              </p>
              <div className="lm-reg-meta">
                <div>
                  <span>Headquarters</span>
                  <strong>Abuja, Nigeria</strong>
                </div>
                <div>
                  <span>Established</span>
                  <strong>1979</strong>
                </div>
                <div>
                  <span>Director General</span>
                  <strong>Dr. Emomotimi Agama</strong>
                </div>
                <div>
                  <span>Website</span>
                  <strong>www.sec.gov.ng</strong>
                </div>
              </div>
              <p className="lm-reg-scope">
                Scope of oversight: securities exchanges, broker-dealers, fund managers, investment
                advisers, registrars, and digital asset offerings.
              </p>
            </div>

            <div className="lm-reg-card">
              <div className="lm-reg-card-head">
                <div className="lm-badge cac">CAC</div>
                <strong>Corporate Affairs Commission</strong>
              </div>
              <p>
                The CAC is the body responsible for the regulation and management of companies in
                Nigeria. It was established by the Companies and Allied Matters Act (CAMA) 1990 (now
                CAMA 2020) and operates under the supervision of the Federal Ministry of Industry,
                Trade and Investment.
              </p>
              <div className="lm-reg-meta">
                <div>
                  <span>Headquarters</span>
                  <strong>Abuja, Nigeria</strong>
                </div>
                <div>
                  <span>Established</span>
                  <strong>1990</strong>
                </div>
                <div>
                  <span>Registrar General</span>
                  <strong>Hussaini Ishaq Magaji (SAN)</strong>
                </div>
                <div>
                  <span>Website</span>
                  <strong>www.cac.gov.ng</strong>
                </div>
              </div>
              <p className="lm-reg-scope">
                Scope of oversight: company registration, business name registration, incorporated
                trustees, corporate governance compliance, and annual returns filing.
              </p>
            </div>

            <div className="lm-reg-card">
              <div className="lm-reg-card-head">
                <div className="lm-badge fca">FCA</div>
                <strong>Financial Conduct Authority (UK)</strong>
              </div>
              <p>
                The FCA is the financial regulatory body in the United Kingdom that operates
                independently of the UK government. It regulates financial firms providing services to
                consumers to ensure honest, fair, and effective markets. The FCA has rule-making,
                investigative, and enforcement powers.
              </p>
              <div className="lm-reg-meta">
                <div>
                  <span>Headquarters</span>
                  <strong>London, United Kingdom</strong>
                </div>
                <div>
                  <span>Established</span>
                  <strong>2013</strong>
                </div>
                <div>
                  <span>Chief Executive</span>
                  <strong>Nikhil Rathi</strong>
                </div>
                <div>
                  <span>Website</span>
                  <strong>www.fca.org.uk</strong>
                </div>
              </div>
              <p className="lm-reg-scope">
                Scope of oversight: conduct regulation of financial services firms, wholesale
                markets, prudential supervision of non-PRA firms, consumer credit, and anti-money
                laundering compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
