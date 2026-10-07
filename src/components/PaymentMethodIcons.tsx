import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export function VisaLogo({ height = 18, className = '' }: { height?: number; className?: string }) {
  const width = Math.round(height * 3.1);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Visa"
    >
      <path
        d="M24.58 0.72L16.14 19.28H10.6L6.46 4.48C6.2 3.48 5.96 3.12 5.14 2.66C3.86 1.94 1.8 1.28 0 0.88L0.1 0.44H9.28C10.46 0.44 11.5 1.24 11.76 2.58L13.98 13.96L19.46 0.72H24.58ZM46.16 13.3C46.18 8.42 39.14 8.14 39.18 5.92C39.2 5.24 39.88 4.52 41.34 4.34C42.06 4.24 44.06 4.18 46.22 5.16L47.08 1.24C45.9 0.82 44.38 0.44 42.48 0.44C37.38 0.44 33.78 3.06 33.74 6.84C33.7 9.62 36.26 11.16 38.22 12.08C40.24 13.02 40.92 13.64 40.9 14.5C40.88 15.82 39.26 16.4 37.76 16.42C35.18 16.44 33.68 15.74 32.48 15.2L31.58 19.28C32.88 19.86 35.26 20.34 37.74 20.36C43.14 20.36 46.14 17.76 46.16 13.3ZM59.78 19.28H64L60.34 0.72H56.46C55.54 0.72 54.76 1.24 54.42 2.06L46.52 19.28H51.9L52.98 16.38H59.56L59.78 19.28ZM54.44 12.54L57.18 5.34L58.74 12.54H54.44ZM32.32 0.72L28.18 19.28H23.08L27.22 0.72H32.32Z"
        fill="#1434CB"
      />
    </svg>
  );
}

export function MastercardLogo({ height = 20, className = '' }: { height?: number; className?: string }) {
  const width = Math.round(height * 1.55);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mastercard"
    >
      <circle cx="10" cy="10" r="10" fill="#EB001B" />
      <circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.9" />
      <path
        d="M16 3.66A9.97 9.97 0 0012.3 10c0 2.5 0.9 4.8 2.4 6.55A9.97 9.97 0 0018.4 10a9.9 9.9 0 00-2.4-6.34z"
        fill="#FF5F00"
      />
    </svg>
  );
}

/**
 * High-visibility dual badge showing Visa & Mastercard together
 */
export function VisaMastercardBadge({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const containerPadding = isSm ? '4px 8px' : isLg ? '8px 14px' : '6px 10px';
  const visaHeight = isSm ? 12 : isLg ? 18 : 14;
  const mastercardHeight = isSm ? 14 : isLg ? 20 : 16;
  const gap = isSm ? 6 : 8;

  return (
    <div
      className={`inline-flex items-center rounded-lg ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        padding: containerPadding,
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        verticalAlign: 'middle',
      }}
      aria-label="Visa and Mastercard accepted"
    >
      <VisaLogo height={visaHeight} />
      <div
        style={{
          width: 1,
          height: visaHeight + 2,
          background: '#e2e8f0',
        }}
      />
      <MastercardLogo height={mastercardHeight} />
    </div>
  );
}

/**
 * Authentic Bank Institution Logo / Sticker Badge
 */
export function BankTransferSticker({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconSize = isSm ? 15 : isLg ? 22 : 18;
  const padding = isSm ? '3px 8px' : isLg ? '7px 14px' : '5px 11px';
  const fontSize = isSm ? 11 : isLg ? 13 : 12;

  return (
    <div
      className={`bank-transfer-sticker ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? 6 : 8,
        padding,
        background: 'linear-gradient(135deg, #09478a 0%, #0369a1 100%)',
        color: '#ffffff',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 2px 6px rgba(3, 105, 161, 0.25)',
        fontWeight: 700,
        fontSize,
        letterSpacing: '0.4px',
        userSelect: 'none',
      }}
      aria-label="Official Bank Transfer"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 21h18M3 10h18M5 10v7M9 10v7M15 10v7M19 10v7M12 3L2 8h20L12 3z"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="6.2" r="1.2" fill="#38bdf8" />
      </svg>
      <span>BANK TRANSFER</span>
    </div>
  );
}

/**
 * Bank Institution Crest / Sticker Icon for method cards
 */
export function BankInstitutionIcon({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: 8,
        background: 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
      }}
      aria-label="Bank Transfer Logo"
    >
      <svg
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18M3 10h18M5 10v7M9 10v7M15 10v7M19 10v7M12 3L2 8h20L12 3z" />
      </svg>
    </div>
  );
}

/**
 * Paga Bank Logo / Sticker
 */
export function PagaBankLogo({ height = 20 }: { height?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#fff7ed',
        border: '1px solid #fdba74',
        padding: '3px 8px',
        borderRadius: 6,
        boxShadow: '0 1px 3px rgba(249, 115, 22, 0.12)',
      }}
      aria-label="Paga Bank"
    >
      <div
        style={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: '#f97316',
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff',
          fontSize: 9,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        P
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#c2410c', letterSpacing: '-0.3px' }}>
        paga
      </span>
    </div>
  );
}

/**
 * Authentic Bitcoin (BTC) Icon
 */
export function BitcoinIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bitcoin"
    >
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M23.18 13.43c.31-2.07-1.27-3.18-3.43-3.92l.7-2.81-1.71-.43-.68 2.74a44.6 44.6 0 00-1.37-.32l.69-2.76-1.71-.43-.7 2.82c-.37-.08-.74-.17-1.1-.25l-2.36-.59-.46 1.83s1.27.29 1.24.31c.69.17.82.63.8.99l-.8 3.23c.05.01.11.03.18.06l-.18-.04-1.13 4.52c-.08.21-.3.52-.78.4.02.03-1.24-.31-1.24-.31l-.85 1.97 2.23.56c.41.1.82.21 1.23.31l-.71 2.85 1.71.43.7-2.82c.47.13.92.24 1.37.36l-.7 2.8 1.71.43.71-2.85c2.93.55 5.13.33 6.06-2.32.75-2.14-.04-3.37-1.58-4.17 1.13-.26 1.97-1 2.2-2.53zm-3.93 5.53c-.53 2.14-4.12.98-5.28.69l.94-3.78c1.16.29 4.89.87 4.34 3.09zm.53-5.56c-.49 1.94-3.48.96-4.45.72l.86-3.43c.97.24 4.09.7 3.59 2.71z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Authentic Tether (USDT) Icon
 */
export function TetherIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tether USDT"
    >
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.92 14.54v-2.07h5.18V9.75H8.9v2.72h5.18v2.07c-4.17.2-7.3 1.1-7.3 2.18 0 1.09 3.13 1.98 7.3 2.19v6.34h3.84v-6.34c4.16-.21 7.28-1.1 7.28-2.19 0-1.08-3.12-1.98-7.28-2.18zm0 3.32v-.01c-.13.01-.26.02-.4.02h-3.04c-.14 0-.28-.01-.41-.02v.01c-3.56-.17-6.22-.84-6.22-1.65 0-.8 2.66-1.47 6.22-1.64v2.29h3.85v-2.29c3.54.17 6.2 1.48 6.2 1.64 0 .81-2.66 1.48-6.2 1.65z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Authentic Ethereum (ETH) Icon
 */
export function EthereumIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ethereum"
    >
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <g fill="#FFFFFF">
        <path d="M16 5.5l-6.38 10.63L16 19.92l6.38-3.79L16 5.5z" fillOpacity="0.85" />
        <path d="M16 5.5v14.42l6.38-3.79L16 5.5z" />
        <path d="M16 21.05l-6.38-3.79L16 26.5l6.38-9.24L16 21.05z" fillOpacity="0.85" />
        <path d="M16 21.05v5.45l6.38-9.24L16 21.05z" />
        <path d="M9.62 16.13l6.38 3.79v-7.22l-6.38 3.43z" fillOpacity="0.6" />
        <path d="M16 19.92l6.38-3.79-6.38-3.43v7.22z" fillOpacity="0.75" />
      </g>
    </svg>
  );
}

/**
 * Authentic USD Coin (USDC) Icon
 */
export function UsdcIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="USDC"
    >
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M16 5.5a10.5 10.5 0 00-6.73 18.57l1.58-1.58A8.25 8.25 0 1116 24.25v2.25a10.5 10.5 0 000-21zm-1.13 6.38v1.62c-1.84.28-3 1.4-3 2.88 0 1.7 1.33 2.5 3.38 2.84l.74.13c1.4.24 1.88.66 1.88 1.4 0 .9-.82 1.44-2.12 1.44-1.2 0-2.34-.44-3.14-1.12l-1.12 1.5c1.1 1 2.58 1.5 4.38 1.58v1.62h2.25V23.7c1.92-.3 3.12-1.46 3.12-3.02 0-1.74-1.32-2.58-3.46-2.92l-.7-.12c-1.3-.22-1.82-.6-1.82-1.3 0-.82.78-1.36 1.98-1.36 1.04 0 2.04.38 2.76.96l1.1-1.5a5.57 5.57 0 00-3.86-1.38v-1.68h-2.25z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Multi-token cluster showcasing top cryptos (Bitcoin, Tether, Ethereum)
 */
export function CryptoClusterIcon({ size = 32 }: { size?: number }) {
  const tokenSize = Math.round(size * 0.65);
  return (
    <div
      style={{
        position: 'relative',
        width: size + 6,
        height: size,
        display: 'inline-block',
      }}
      aria-label="Cryptocurrency Options"
    >
      <div style={{ position: 'absolute', left: 0, top: 2, zIndex: 1 }}>
        <BitcoinIcon size={tokenSize} />
      </div>
      <div style={{ position: 'absolute', right: 0, top: 0, zIndex: 3 }}>
        <TetherIcon size={tokenSize} />
      </div>
      <div style={{ position: 'absolute', left: Math.round(size * 0.28), bottom: 0, zIndex: 2 }}>
        <EthereumIcon size={tokenSize} />
      </div>
    </div>
  );
}

/**
 * Intelligent helper to pick the right crypto icon based on title, network, or currency
 */
export function getCryptoBadge(text?: string, size = 26): ReactNode {
  if (!text) return <CryptoClusterIcon size={size} />;
  const s = text.toLowerCase();

  if (s.includes('btc') || s.includes('bitcoin')) {
    return <BitcoinIcon size={size} />;
  }
  if (s.includes('usdt') || s.includes('tether') || s.includes('trc20')) {
    return <TetherIcon size={size} />;
  }
  if (s.includes('eth') || s.includes('ethereum') || s.includes('erc20')) {
    return <EthereumIcon size={size} />;
  }
  if (s.includes('usdc') || s.includes('usd coin')) {
    return <UsdcIcon size={size} />;
  }
  return <CryptoClusterIcon size={size} />;
}

/**
 * Standardized High-Visibility Circular Navigational Arrow Button
 */
export function CircleBackButton({
  onClick,
  ariaLabel = 'Go back',
  className = '',
  size = 44,
}: {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`circle-nav-button circle-nav-back ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border, #e2e8f0)',
        background: 'var(--card-bg, #ffffff)',
        color: 'var(--text, #111820)',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: 0,
        outline: 'none',
      }}
    >
      <ArrowLeft size={20} strokeWidth={2.2} />
    </button>
  );
}

/**
 * Standardized Circular Forward Action Arrow (for Continue, Proceed, Deposit, etc.)
 */
export function CircleForwardArrow({ size = 30 }: { size?: number }) {
  return (
    <span
      className="circle-nav-forward-badge"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.22)',
        color: 'currentColor',
        marginLeft: 10,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <ArrowRight size={Math.round(size * 0.58)} strokeWidth={2.4} />
    </span>
  );
}

/**
 * Standardized Circular Carousel / Scroll Arrow
 */
export function CircleScrollArrow({
  direction,
  onClick,
  ariaLabel,
  disabled = false,
  size = 40,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  ariaLabel?: string;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (direction === 'left' ? 'Scroll left' : 'Scroll right')}
      className={`circle-nav-button circle-scroll-arrow ${direction}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border, #e2e8f0)',
        background: 'var(--card-bg, #ffffff)',
        color: 'var(--text, #111820)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
        padding: 0,
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
      }}
    >
      {direction === 'left' ? (
        <ChevronLeft size={22} strokeWidth={2.4} />
      ) : (
        <ChevronRight size={22} strokeWidth={2.4} />
      )}
    </button>
  );
}
