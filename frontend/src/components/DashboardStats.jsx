import React from 'react';
import { FileText, Coins, Weight, Scale, Users } from 'lucide-react';
import { isGoldItem, isSilverItem } from '../utils/metalUtils';

export default function DashboardStats({ invoices = [] }) {
  const totalInvoices = invoices.length;

  const totalAmount = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);

  // Strictly separate Gold weight from Silver weight
  const totalGoldGrams = invoices.reduce((acc, inv) => {
    const goldGrams = (inv.items || []).reduce((sum, item) => {
      return isGoldItem(item) ? sum + (Number(item.quantity) || 0) : sum;
    }, 0);
    return acc + goldGrams;
  }, 0);

  const totalSilverGrams = invoices.reduce((acc, inv) => {
    const silverGrams = (inv.items || []).reduce((sum, item) => {
      return isSilverItem(item) ? sum + (Number(item.quantity) || 0) : sum;
    }, 0);
    return acc + silverGrams;
  }, 0);

  const uniqueCustomers = new Set(
    invoices.map((inv) => (inv.buyer?.name || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  const stats = [
    {
      id: 'stat-total-invoices',
      label: 'Total Invoices',
      value: totalInvoices,
      icon: FileText,
      color: '#1D4ED8',
      bg: 'rgba(29, 78, 216, 0.08)',
      desc: 'All-time created invoices',
    },
    {
      id: 'stat-total-billing',
      label: 'Total Billing Value',
      value: `₹${totalAmount.toLocaleString('en-IN')}`,
      icon: Coins,
      color: '#B88E28',
      bg: 'rgba(184, 142, 40, 0.12)',
      desc: 'Cumulative invoiced turnover',
    },
    {
      id: 'stat-gold-quantity',
      label: 'Gold Quantity Billed',
      value: `${totalGoldGrams.toFixed(3)} gms`,
      icon: Weight,
      color: '#047857',
      bg: 'rgba(4, 120, 87, 0.08)',
      desc: 'Total gold weight recorded',
    },
    {
      id: 'stat-silver-quantity',
      label: 'Silver Quantity Billed',
      value: `${totalSilverGrams.toFixed(3)} gms`,
      icon: Scale,
      color: '#475569',
      bg: 'rgba(71, 85, 105, 0.1)',
      desc: 'Total silver weight recorded',
    },
    {
      id: 'stat-customer-base',
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
            key={stat.id || idx}
            id={stat.id}
            className="dashboard-stat-card"
          >
            <div
              className="dashboard-stat-icon-wrapper"
              style={{
                background: stat.bg,
                color: stat.color,
              }}
            >
              <Icon size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="dashboard-stat-label">
                {stat.label}
              </div>
              <div className="dashboard-stat-value">
                {stat.value}
              </div>
              <div className="dashboard-stat-desc">
                {stat.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
