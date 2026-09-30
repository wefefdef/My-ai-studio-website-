import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ArrowRight, User, Mail, Phone, Lock, Globe } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { COUNTRIES, AFRICAN_COUNTRIES, WORLD_COUNTRIES, DEFAULT_COUNTRY } from '../data/countries';
import { StorageService } from '../services/storage';

interface RegisterPageProps {
  onRegistered: (email: string) => void;
  onGoToLogin: () => void;
  onBack: () => void;
}

export function RegisterPage({ onRegistered, onGoToLogin, onBack }: RegisterPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY.name);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await StorageService.registerUser({
        fullName,
        email,
        phone,
        country,
        password,
      });

      if (!result.success) {
        setError(result.error || 'Failed to register account.');
        return;
      }

      // Direct to login page with registered email
      onRegistered(email.trim());
    } catch (err: any) {
      setError(err?.message || 'Failed to create account in database.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <button className="back-button visible" type="button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <BrandMark onClick={onBack} />
        <LanguageButton />
      </header>

      <section className="sign-in-card" style={{ maxWidth: 480 }}>
        <p className="eyebrow">CREATE ACCOUNT</p>
        <h1>Open Live Account</h1>
        <p className="subheading">Start your multi-asset trading journey in minutes.</p>

        {error && (
          <div
            className="fade-in"
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #f87171',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-wrap">
            <span>Full Name *</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              type="text"
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="input-wrap">
            <span>Email Address *</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="input-wrap">
            <span>Phone Number *</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="+234 800 000 0000"
              required
            />
          </div>

          <div className="input-wrap">
            <span>Country of Residence *</span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontSize: 14,
                outline: 'none',
              }}
            >
              <optgroup label="🌍 African Countries (All Nations)">
                {AFRICAN_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌐 All Worldwide Countries">
                {WORLD_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="input-wrap password-input">
            <span>Create Password *</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a permanent password"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="input-wrap password-input">
            <span>Confirm Password *</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button className="primary-button" type="submit" disabled={isLoading} style={{ marginTop: 8 }}>
            {isLoading ? 'Creating Account in Database...' : (
              <>
                Create Account &amp; Continue <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="auth-bottom-text" style={{ marginTop: 20 }}>
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onGoToLogin}>
            Sign in here
          </button>
        </p>
      </section>
    </main>
  );
}
