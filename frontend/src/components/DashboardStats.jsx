import React from 'react';
import { FileText, Coins, Weight, Users } from 'lucide-react';

export default function DashboardStats({ invoices = [] }) {
  const totalInvoices = invoices.length;

  const totalAmount = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);

  const totalGrams = invoices.reduce((acc, inv) => {
    const itemGrams = (inv.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    return acc + itemGrams;
  }, 0);

  const uniqueCustomers = new Set(invoices.map((inv) => (inv.buyer?.name || '').trim().toLowerCase())).size;

  const stats = [
    {
      label: 'Total Invoices',
      value: totalInvoices,
      icon: FileText,
      color: '#1D4ED8',
      bg: 'rgba(29, 78, 216, 0.08)',
      desc: 'All-time created invoices',
    },
    {
      label: 'Total Billing Value',
      value: `₹${totalAmount.toLocaleString('en-IN')}`,
      icon: Coins,
      color: '#B88E28',
      bg: 'rgba(184, 142, 40, 0.12)',
      desc: 'Cumulative invoiced turnover',
    },
    {
      label: 'Gold Quantity Billed',
      value: `${totalGrams.toFixed(3)} gms`,
      icon: Weight,
      color: '#047857',
      bg: 'rgba(4, 120, 87, 0.08)',
      desc: 'Total weight recorded',
    },
    {
      label: 'Customer Base',
      value: uniqueCustomers,
      icon: Users,
      color: '#6D28D9',
      bg: 'rgba(109, 40, 217, 0.08)',
      desc: 'Unique buyers served',
    },
  ];

  return (
    <div className="dashboard-stats no-print">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(0.85rem, 1.8vw, 1.25rem)',
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(0.75rem, 1.5vw, 1.25rem)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{
              width: 'clamp(38px, 4vw, 46px)',
              height: 'clamp(38px, 4vw, 46px)',
              borderRadius: '12px',
              background: stat.bg,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
              }}>
                {stat.label}
              </div>
              <div style={{
                fontSize: 'clamp(1.15rem, 2.6vw, 1.5rem)',
                fontWeight: 750,
                color: 'var(--text-main)',
                marginTop: '0.15rem',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 'clamp(0.68rem, 1.5vw, 0.72rem)',
                color: 'var(--text-dim)',
                marginTop: '0.1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {stat.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
