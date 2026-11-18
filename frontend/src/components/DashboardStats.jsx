import React, { useState } from 'react';
import { FileText, Coins, Weight, Scale, Users, Calendar, RotateCcw, ArrowRight } from 'lucide-react';
import { isGoldItem, isSilverItem } from '../utils/metalUtils';
import { DATE_PRESETS, getDateRangeForPreset, formatDateInput } from '../utils/dateFilterUtils';

export default function DashboardStats({
  invoices = [],
  datePreset = 'all',
  onPresetChange,
  customStart = '',
  customEnd = '',
  onCustomDateChange,
  loading = false,
}) {
  const [showCustomDrawer, setShowCustomDrawer] = useState(datePreset === 'custom');
  const [tempStart, setTempStart] = useState(customStart || formatDateInput(new Date()));
  const [tempEnd, setTempEnd] = useState(customEnd || formatDateInput(new Date()));

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

  // Kolkata bullion conversion standard: 1 Vori (Bhori) = 11.664 grams
  const totalGoldVori = totalGoldGrams / 11.664;
  const totalSilverVori = totalSilverGrams / 11.664;

  const uniqueCustomers = new Set(
    invoices.map((inv) => (inv.buyer?.name || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  // Active range summary text
  const currentRange = getDateRangeForPreset(datePreset, customStart, customEnd);
  const activeSummary = currentRange.summary || 'All-time cumulative turnover & weight';

  const handleSelectPreset = (presetId) => {
    if (presetId === 'custom') {
      setShowCustomDrawer(true);
      if (onPresetChange) onPresetChange('custom', tempStart, tempEnd);
    } else {
      setShowCustomDrawer(false);
      if (onPresetChange) onPresetChange(presetId);
    }
  };

  const handleApplyCustomDates = () => {
    if (!tempStart || !tempEnd) return;
    if (onCustomDateChange) {
      onCustomDateChange({ start: tempStart, end: tempEnd });
    } else if (onPresetChange) {
      onPresetChange('custom', tempStart, tempEnd);
    }
  };

  const handleResetToAllTime = () => {
    setShowCustomDrawer(false);
    if (onPresetChange) onPresetChange('all');
  };

  const getPeriodDesc = (metricType) => {
    switch (datePreset) {
      case 'today':
        if (metricType === 'invoices') return 'Created today';
        if (metricType === 'billing') return 'Turnover recorded today';
        if (metricType === 'gold') return 'Gold billed today';
        if (metricType === 'silver') return 'Silver billed today';
        if (metricType === 'customers') return 'Buyers today';
        break;
      case 'week':
        if (metricType === 'invoices') return 'Past 7 days';
        if (metricType === 'billing') return 'Turnover past 7 days';
        if (metricType === 'gold') return 'Gold past 7 days';
        if (metricType === 'silver') return 'Silver past 7 days';
        if (metricType === 'customers') return 'Buyers past 7 days';
        break;
      case 'thisMonth':
        if (metricType === 'invoices') return 'This month';
        if (metricType === 'billing') return 'Turnover this month';
        if (metricType === 'gold') return 'Gold this month';
        if (metricType === 'silver') return 'Silver this month';
        if (metricType === 'customers') return 'Buyers this month';
        break;
      case 'prevMonth':
        if (metricType === 'invoices') return 'Previous month';
        if (metricType === 'billing') return 'Turnover last month';
        if (metricType === 'gold') return 'Gold last month';
        if (metricType === 'silver') return 'Silver last month';
        if (metricType === 'customers') return 'Buyers last month';
        break;
      case 'custom':
        if (metricType === 'invoices') return 'In selected period';
        if (metricType === 'billing') return 'Turnover in range';
        if (metricType === 'gold') return 'Gold in range';
        if (metricType === 'silver') return 'Silver in range';
        if (metricType === 'customers') return 'Buyers in range';
        break;
      case 'all':
      default:
        if (metricType === 'invoices') return 'All-time created invoices';
        if (metricType === 'billing') return 'Cumulative invoiced turnover';
        if (metricType === 'gold') return '1 vori = 11.664 grams';
        if (metricType === 'silver') return '1 vori = 11.664 grams';
        if (metricType === 'customers') return 'Unique buyers served';
        break;
    }
  };

  const stats = [
    {
      id: 'stat-total-billing',
      label: 'Total Billing Value',
      value: `₹${totalAmount.toLocaleString('en-IN')}`,
      icon: Coins,
      color: '#B88E28',
      bg: 'rgba(184, 142, 40, 0.12)',
      desc: getPeriodDesc('billing'),
      isHero: true,
    },
    {
      id: 'stat-gold-quantity',
      label: 'Gold Quantity Billed',
      primaryValue: `${totalGoldGrams.toFixed(3)} gms`,
      voriValue: `${totalGoldVori.toFixed(3)} vori`,
      icon: Weight,
      color: '#047857',
      bg: 'rgba(4, 120, 87, 0.08)',
      isDualWeight: true,
      metalType: 'gold',
      desc: getPeriodDesc('gold'),
    },
    {
      id: 'stat-silver-quantity',
      label: 'Silver Quantity Billed',
      primaryValue: `${totalSilverGrams.toFixed(3)} gms`,
      voriValue: `${totalSilverVori.toFixed(3)} vori`,
      icon: Scale,
      color: '#475569',
      bg: 'rgba(71, 85, 105, 0.1)',
      isDualWeight: true,
      metalType: 'silver',
      desc: getPeriodDesc('silver'),
    },
    {
      id: 'stat-total-invoices',
      label: 'Total Invoices',
      value: totalInvoices,
      icon: FileText,
      color: '#1D4ED8',
      bg: 'rgba(29, 78, 216, 0.08)',
      desc: getPeriodDesc('invoices'),
    },
    {
      id: 'stat-customer-base',
      label: 'Customer Base',
      value: uniqueCustomers,
      icon: Users,
      color: '#6D28D9',
      bg: 'rgba(109, 40, 217, 0.08)',
      desc: getPeriodDesc('customers'),
    },
  ];

  return (
    <div className="crm-analytics-section no-print" style={{ marginBottom: 'clamp(1.25rem, 2.5vw, 2rem)' }}>
      {/* Date Filter Master Control Bar */}
      <div className="stats-date-filter-bar">
        <div className="stats-filter-title-group">
          <div className="stats-filter-header-left">
            <div className="stats-filter-icon-box">
              <Calendar size={17} />
            </div>
            <div>
              <span className="stats-filter-main-title">Performance Analytics</span>
              <div className="stats-filter-active-badge">
                <span className="stats-pulse-dot" />
                <span>{activeSummary}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Filter Buttons */}
        <div className="stats-filter-pills-group">
          {DATE_PRESETS.map((preset) => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`stats-filter-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset.id)}
                title={preset.label}
              >
                <span className="preset-full-label">{preset.label}</span>
                <span className="preset-short-label">{preset.shortLabel || preset.label}</span>
              </button>
            );
          })}

          {datePreset !== 'all' && (
            <button
              type="button"
              className="stats-reset-pill-btn"
              onClick={handleResetToAllTime}
              title="Reset to All Time"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Inline Drawer */}
      {showCustomDrawer && (
        <div className="stats-custom-range-drawer">
          <div className="stats-custom-inputs-wrapper">
            <div className="stats-date-input-group">
              <label htmlFor="custom-from-date">From Date</label>
              <input
                type="date"
                id="custom-from-date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="stats-date-input"
              />
            </div>
            <div className="stats-date-separator">
              <ArrowRight size={14} />
            </div>
            <div className="stats-date-input-group">
              <label htmlFor="custom-to-date">To Date</label>
              <input
                type="date"
                id="custom-to-date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="stats-date-input"
              />
            </div>
          </div>
          <div className="stats-custom-actions">
            <button
              type="button"
              className="btn-apply-custom-dates"
              onClick={handleApplyCustomDates}
            >
              Apply Filter
            </button>
            <button
              type="button"
              className="btn-cancel-custom-dates"
              onClick={handleResetToAllTime}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 5 KPI Stat Cards Grid */}
      <div className={`dashboard-stats ${loading ? 'stats-loading' : ''}`} style={{ marginBottom: 0 }}>
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

                {stat.isDualWeight ? (
                  <div className="dashboard-stat-value-group">
                    <span className="dashboard-stat-value">
                      {stat.primaryValue}
                    </span>
                    <span
                      className={`dashboard-stat-vori-pill ${stat.metalType}`}
                      title={`1 Vori = 11.664 grams (Kolkata Jeweller Standard)`}
                    >
                      <span className="vori-glyph">ভ</span>
                      <span>{stat.voriValue}</span>
                    </span>
                  </div>
                ) : (
                  <div className="dashboard-stat-value">
                    {stat.value}
                  </div>
                )}

                <div className="dashboard-stat-desc">
                  {stat.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
