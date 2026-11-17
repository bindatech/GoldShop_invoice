import React, { useState, useEffect } from 'react';
import { PlusCircle, LogOut, Sparkles, User as UserIcon } from 'lucide-react';
import { getStoredMetalRates, fetchLiveMetalRates } from '../services/metalPriceService';

export default function Navbar({ user, onNewInvoice, onLogout }) {
  const [metalRates, setMetalRates] = useState(getStoredMetalRates());

  useEffect(() => {
    const handleRatesUpdate = (e) => {
      if (e.detail) setMetalRates(e.detail);
    };
    window.addEventListener('metal-rates-updated', handleRatesUpdate);

    fetchLiveMetalRates()
      .then((latest) => {
        if (latest) setMetalRates(latest);
      })
      .catch(() => {});

    return () => window.removeEventListener('metal-rates-updated', handleRatesUpdate);
  }, []);

  const ratePerGram = metalRates.gold22k || 13610;
  const voriRate = Math.round(ratePerGram * 11.664);

  return (
    <header className="crm-navbar no-print">
      <div className="crm-navbar-inner">
        {/* Brand */}
        <div className="crm-navbar-brand">
          {/* Natural Gold Jewelry Emblem */}
          <div style={{
            width: 'clamp(36px, 5vw, 44px)',
            height: 'clamp(36px, 5vw, 44px)',
            borderRadius: '12px',
            background: 'radial-gradient(circle at 30% 30%, #F8E59E 0%, #D4AF37 55%, #966F17 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 3px 12px rgba(184, 142, 40, 0.28)',
            border: '1.5px solid #F5DE88',
            flexShrink: 0,
          }}>
            <Sparkles size={20} strokeWidth={2.4} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)',
                fontWeight: 750,
                letterSpacing: '0.02em',
                color: 'var(--text-main)',
                lineHeight: 1.2,
              }}>
                {user?.shopDetails?.shopName || 'BINDA JEWELLERS'}
              </h1>
              <span style={{
                background: 'rgba(184, 142, 40, 0.1)',
                color: '#8A6413',
                border: '1px solid rgba(184, 142, 40, 0.28)',
                fontSize: '0.625rem',
                padding: '0.12rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-heading)',
                whiteSpace: 'nowrap',
              }}>
                JEWELLERY CRM
              </span>
            </div>
            <p style={{
              fontSize: 'clamp(0.68rem, 1.8vw, 0.75rem)',
              color: 'var(--text-muted)',
              marginTop: '0.1rem',
              letterSpacing: '0.01em',
            }}>
              Gold Purchasing & Official Tax Invoicing Suite
            </p>
          </div>
        </div>

        {/* 1 Vori Hallmark Live Rate Ticker */}
        <div
          id="navbar-vori-ticker"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: 'linear-gradient(135deg, #FFFDF8 0%, #FAF5EA 100%)',
            border: '1.5px solid #DFC068',
            borderRadius: '10px',
            padding: '0.35rem 0.85rem',
            boxShadow: '0 2px 8px rgba(184, 142, 40, 0.1)',
            cursor: 'default',
            userSelect: 'none',
          }}
          title={`Today's Live Kolkata Hallmark Rate\n1 Vori (11.664g) = ₹${Number(voriRate).toLocaleString('en-IN')}\nPer Gram = ₹${Number(ratePerGram).toLocaleString('en-IN')}/g`}
        >
          {/* Gold Coin / Emblem */}
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #FDEEAA 0%, #D4AF37 55%, #8B6514 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(184, 142, 40, 0.28)',
            border: '1px solid #FFF2BF',
            flexShrink: 0,
            fontSize: '0.78rem',
            fontWeight: 800,
          }}>
            ভ
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', lineHeight: 1.1 }}>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 750,
                color: '#8A6413',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-heading)',
              }}>
                1 Vori Hallmark (22K)
              </span>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 6px #10B981',
                display: 'inline-block',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.1rem' }}>
              <span style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#047857',
                fontFamily: 'var(--font-heading)',
                lineHeight: 1.15,
              }}>
                ₹{Number(voriRate).toLocaleString('en-IN')}
              </span>
              <span style={{
                fontSize: '0.66rem',
                color: '#785A11',
                fontWeight: 600,
                opacity: 0.85,
              }}>
                / 11.664g
              </span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="crm-navbar-actions">
          {/* Create Invoice button */}
          <button
            onClick={onNewInvoice}
            className="btn-gold"
            id="btn-create-invoice"
            style={{
              padding: '0.55rem clamp(0.75rem, 1.8vw, 1.25rem)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <PlusCircle size={17} />
            <span>Create Invoice</span>
          </button>

          {/* User badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-elevated)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(184, 142, 40, 0.15)',
              color: 'var(--gold-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <UserIcon size={15} />
            </div>
            <div>
              <div style={{
                fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                fontWeight: 600,
                color: 'var(--text-main)',
                lineHeight: 1.15,
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.name || 'Shopkeeper'}
              </div>
              <div className="user-email-text" style={{
                fontSize: '0.68rem',
                color: 'var(--text-dim)',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="btn-icon"
            title="Log out"
            id="btn-logout"
            style={{ width: '36px', height: '36px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
