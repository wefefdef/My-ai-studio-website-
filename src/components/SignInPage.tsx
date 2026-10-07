import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { LanguageButton } from './LanguageButton';
import { StorageService } from '../services/storage';
import { UserAccount } from '../types';

interface SignInPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onGoToRegister: () => void;
  onBack: () => void;
  initialEmail?: string;
  registrationSuccessMessage?: string | null;
}

export function SignInPage({
  onLoginSuccess,
  onGoToRegister,
  onBack,
  initialEmail = '',
  registrationSuccessMessage = null,
}: SignInPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(registrationSuccessMessage);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (registrationSuccessMessage) {
      setSuccessMsg(registrationSuccessMessage);
    }
  }, [registrationSuccessMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await StorageService.loginUser(email.trim(), password);

      if (!result.success) {
        setError(result.error || 'Failed to sign in.');
        return;
      }

      if (result.user) {
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate.');
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

      <section className="sign-in-card">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in</h1>
        <p className="subheading">Your next move starts here.</p>

        {successMsg && (
          <div
            className="fade-in"
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #6ee7b7',
              padding: '12px 14px',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 500,
            }}
          >
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div
            className="fade-in"
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              padding: '12px 14px',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontWeight: 500,
            }}
          >
            <AlertCircle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p>{error}</p>
              {error.includes('No account exists') && (
                <button
                  type="button"
                  onClick={onGoToRegister}
                  style={{
                    marginTop: 6,
                    color: 'var(--accent)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  Create an account now →
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-wrap">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="input-wrap password-input">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
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

          <a href="#forgot" className="forgot-password" onClick={(e) => e.preventDefault()}>
            Forgot password?
          </a>

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Verifying with Database...' : (
              <>
                Sign in <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="auth-bottom-text">
          Don't have an account?{' '}
          <button type="button" className="auth-link" onClick={onGoToRegister}>
            Open account first
          </button>
        </p>
      </section>
    </main>
  );
}
