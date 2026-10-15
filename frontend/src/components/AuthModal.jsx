import React, { useState } from 'react';
import { api } from '../services/api';
import { Lock, Mail, User, Sparkles, AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      let data;
      if (isRegister) {
        data = await api.register(email, password, name || 'Hossain Jewellers Shopkeeper');
      } else {
        data = await api.login(email, password);
      }
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('shopkeeper@hossainjewellers.com');
    setPassword('password123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: 'clamp(0.75rem, 2vw, 1.5rem)',
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative Gold Header Top Accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #966F17, #D4AF37, #F8E59E, #D4AF37, #966F17)',
        }} />

        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}>
          <div style={{
            width: 'clamp(46px, 5.5vw, 56px)',
            height: 'clamp(46px, 5.5vw, 56px)',
            margin: '0 auto 1rem',
            borderRadius: '16px',
            background: 'radial-gradient(circle at 30% 30%, #F8E59E 0%, #D4AF37 55%, #966F17 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(184, 142, 40, 0.28)',
            border: '1.5px solid #F5DE88',
          }}>
            <Sparkles size={26} strokeWidth={2.4} />
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.35rem, 4vw, 1.65rem)',
            fontWeight: 700,
            color: 'var(--text-main)',
            letterSpacing: '0.03em',
            marginBottom: '0.35rem',
          }}>
            HOSSAIN JEWELLERS
          </h2>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.02em',
          }}>
            Gold Purchase Billing & CRM System
          </p>
        </div>

        {/* Tabs toggle */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-elevated)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.75rem',
          border: '1px solid var(--border-color)',
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); setShowPassword(false); }}
            style={{
              padding: '0.6rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: !isRegister ? '#FFFFFF' : 'transparent',
              color: !isRegister ? '#0F172A' : '#64748B',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: !isRegister ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); setShowPassword(false); }}
            style={{
              padding: '0.6rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: isRegister ? '#FFFFFF' : 'transparent',
              color: isRegister ? '#0F172A' : '#64748B',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isRegister ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: '#DC2626',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">Shopkeeper Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. Hossain Jewellers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.2rem' }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }} />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.6rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                id="btn-toggle-password-visibility"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
              Minimum 6 characters
            </p>
          </div>

          <button
            type="submit"
            className="btn-gold"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isRegister ? 'Create Shop Account' : 'Sign In to CRM'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo button */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={fillDemoCredentials}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gold-primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <CheckCircle2 size={14} />
            Auto-fill demo credentials
          </button>
        </div>
      </div>
    </div>
  );
}
