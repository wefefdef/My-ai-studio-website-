import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  CalendarDays,
  CircleHelp,
  ShieldCheck,
  X,
} from 'lucide-react';
import { COUNTRIES, DEFAULT_COUNTRY, ID_TYPES } from '../data/countries';
import { LanguageButton } from './LanguageButton';
import { Footer } from './Footer';
import { UserAccount } from '../types';
import { StorageService } from '../services/storage';
import { CircleBackButton, CircleForwardArrow } from './PaymentMethodIcons';

interface PersonalDetailsPageProps {
  currentUser?: UserAccount | null;
  onBack: () => void;
  onProceed: () => void;
}

interface CountrySelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

function CountrySelect({ label, value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selected = COUNTRIES.find((c) => c.name === value) ?? DEFAULT_COUNTRY;

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filteredCountries = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  return (
    <div className="select-wrap" ref={containerRef}>
      <label>{label}</label>
      <button
        type="button"
        className="select-field"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="country-icon">{selected.code}</span>
        {selected.name}
        <ChevronDown size={22} />
      </button>

      {open && (
        <div className="select-menu scrollable" style={{ maxHeight: 280 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search African or world country..."
              autoFocus
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredCountries.map((c) => (
            <button
              type="button"
              key={c.code}
              onClick={() => {
                onChange(c.name);
                setOpen(false);
              }}
            >
              <span className="country-icon small">{c.code}</span>
              {c.name}
            </button>
          ))}
          {filteredCountries.length === 0 && (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>
              No matching country found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface IdSelectProps {
  value: string;
  onChange: (val: string) => void;
}

function IdSelect({ value, onChange }: IdSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="select-wrap" ref={containerRef}>
      <label>ID type (optional)</label>
      <button
        type="button"
        className="select-field"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value || 'Select ID type'}
        <ChevronDown size={22} />
      </button>

      {open && (
        <div className="select-menu">
          {ID_TYPES.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => {
                onChange(type);
                setOpen(false);
              }}
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PersonalDetailsPage({
  currentUser,
  onBack,
  onProceed,
}: PersonalDetailsPageProps) {
  const initialCountry = currentUser?.country || DEFAULT_COUNTRY.name;
  const prevDetails = currentUser?.personalDetails;

  const [residence, setResidence] = useState(prevDetails?.residence || initialCountry);
  const [nationality, setNationality] = useState(prevDetails?.nationality || initialCountry);
  const [address, setAddress] = useState(prevDetails?.address || '');
  const [city, setCity] = useState(prevDetails?.city || '');
  const [zipCode, setZipCode] = useState(prevDetails?.zipCode || '');
  const [dob, setDob] = useState(prevDetails?.dob || '');
  const [idType, setIdType] = useState(prevDetails?.idType || '');
  const [idNumber, setIdNumber] = useState(prevDetails?.idNumber || '');
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If personal details were already filled once for this user, never ever show again
  useEffect(() => {
    if (
      prevDetails &&
      (prevDetails.address || prevDetails.dob || currentUser?.stage === 'trading' || currentUser?.isLiveAccount || currentUser?.isVerified)
    ) {
      onProceed();
    }
  }, [prevDetails, currentUser, onProceed]);

  // STRICT NUMERIC-ONLY ZIP CODE: Only allow numbers (0-9), reject all letters/symbols
  function handleZipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    setZipCode(digitsOnly);
  }

  function handleZipKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow navigation/control keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Block any non-digit character (alphabets, symbols, spaces)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  }

  // AUTO-SLASHED DATE OF BIRTH: format like 00/00/0000 (DD/MM/YYYY)
  function handleDobChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputVal = e.target.value;

    // Handle backspace when previous value had a slash at end
    if (dob.endsWith('/') && inputVal.length === dob.length - 1) {
      setDob(inputVal.slice(0, -1));
      return;
    }

    // Strip everything except numeric digits
    const digits = inputVal.replace(/\D/g, '').slice(0, 8);

    if (!digits) {
      setDob('');
      return;
    }

    const isAdding = inputVal.length > dob.length;
    let formatted = '';

    if (digits.length <= 2) {
      formatted = digits;
      // Auto-insert slash after 2 digits (Day) while typing forward
      if (digits.length === 2 && isAdding) {
        formatted += '/';
      }
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      // Auto-insert slash after 4 digits (Day + Month) while typing forward
      if (digits.length === 4 && isAdding) {
        formatted += '/';
      }
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }

    setDob(formatted);
  }

  function handleDobKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Allow user to manually type slash '/' if desired
    if (e.key === '/') {
      return;
    }
    // Block letters and other symbols
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  }

  function handleQuickFill() {
    setAddress('12 Financial Crescent');
    setCity('Victoria Island');
    setZipCode('101241');
    setDob('12/08/1991');
    setIdType('National ID');
    setIdNumber('NIN-84729103');
  }

  function handleSaveAndProceed() {
    setIsSubmitting(true);

    const finalAddress = address.trim() || '12 Financial Crescent';
    const finalCity = city.trim() || 'Victoria Island';
    const finalZip = zipCode.trim().replace(/\D/g, '') || '101241';
    const finalDob = dob.trim() || '12/08/1991';

    // Update state fields visually if empty
    if (!address.trim()) setAddress(finalAddress);
    if (!city.trim()) setCity(finalCity);
    if (!zipCode.trim()) setZipCode(finalZip);
    if (!dob.trim()) setDob(finalDob);

    const activeEmail = currentUser?.email || StorageService.getCurrentUser()?.email;
    if (activeEmail) {
      StorageService.savePersonalDetails(activeEmail, {
        address: finalAddress,
        city: finalCity,
        zipCode: finalZip,
        residence,
        nationality,
        dob: finalDob,
        idType: idType || 'National ID',
        idNumber: idNumber.trim() || 'NIN-84729103',
      });
    }

    setTimeout(() => {
      onProceed();
    }, 150);
  }

  return (
    <main className="details-page">
      <header className="details-header">
        <CircleBackButton onClick={onBack} ariaLabel="Go back" />
        <span className="step-title">Personal details</span>
        <LanguageButton />
      </header>

      <div className="progress">
        <span className="complete"></span>
        <span className="active"></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {!noticeDismissed && (
        <div className="notice">
          <ShieldCheck size={23} />
          <p>
            To secure your account and comply with regulatory obligations, we kindly ask you to
            complete the account verification process.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNoticeDismissed(true)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <section className="details-content">
        <p className="eyebrow">STEP 2 OF 5</p>
        <h1>We want to know you better</h1>
        <p className="intro">
          {currentUser ? `Welcome ${currentUser.fullName}, you are ` : 'You are '}
          a few steps away from your first financial move. The world of trading awaits.
        </p>

        <form onSubmit={(e) => e.preventDefault()}>
          <h2>Address</h2>
          <input
            className="field"
            placeholder="Address *"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <CountrySelect
            label="Country of residence"
            value={residence}
            onChange={setResidence}
          />

          <div className="two-columns">
            <input
              className="field"
              placeholder="City *"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            {/* NUMERIC-ONLY ZIP CODE FIELD */}
            <input
              className="field"
              placeholder="Zip or Postal code (numbers only) *"
              value={zipCode}
              onChange={handleZipChange}
              onKeyDown={handleZipKeyDown}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              title="Zip code must contain numbers only"
              required
            />
          </div>

          <h2>Nationality and Date of birth</h2>
          <CountrySelect
            label="Nationality"
            value={nationality}
            onChange={setNationality}
          />

          {/* AUTO-SLASHED DATE OF BIRTH FIELD (00/00/0000) */}
          <div className="input-wrap dob-field">
            <span>Date of birth *</span>
            <input
              value={dob}
              onChange={handleDobChange}
              onKeyDown={handleDobKeyDown}
              type="text"
              placeholder="00/00/0000"
              inputMode="numeric"
              maxLength={10}
              required
            />
            <CalendarDays size={21} />
          </div>

          <h2>ID</h2>
          <div className="two-columns">
            <IdSelect value={idType} onChange={setIdType} />
            <div className="input-wrap id-number-field">
              <span>ID number (optional)</span>
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                type="text"
                placeholder="Enter ID number"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              type="button"
              onClick={handleQuickFill}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Fill standard sample details
            </button>
          </div>

          <button
            className="primary-button proceed"
            type="button"
            onClick={handleSaveAndProceed}
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSubmitting ? (
              <>Proceeding...</>
            ) : (
              <>
                <span>Proceed</span>
                <CircleForwardArrow />
              </>
            )}
          </button>
        </form>
      </section>

      <button className="help-button" type="button" aria-label="Help">
        <CircleHelp size={24} />
      </button>

      <Footer />
    </main>
  );
}
