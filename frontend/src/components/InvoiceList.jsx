import React, { useState } from 'react';
import { Search, Eye, Edit3, Trash2, Printer, Plus, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { api } from '../services/api';

export default function InvoiceList({
  invoices,
  loading,
  searchTerm,
  setSearchTerm,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onCreateNew,
  isDebouncing,
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadPdf = async (inv) => {
    try {
      setDownloadingId(inv._id);
      await api.downloadInvoicePDF(inv._id, inv.invoiceNumber);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert(err.message || 'Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="crm-invoice-list no-print" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header and Search Filters */}
      <div className="crm-filter-header">
        <div className="crm-filter-title-group">
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.05rem, 2.2vw, 1.2rem)',
            fontWeight: 700,
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}>
            <span>Invoices & Customer Records</span>
            <span style={{
              fontSize: 'var(--text-xs)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              padding: '0.15rem 0.6rem',
              borderRadius: '999px',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
            }}>
              {invoices.length} {invoices.length === 1 ? 'record' : 'records'}
            </span>
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Instant debounced search by customer name
          </p>
        </div>

        {/* Search controls */}
        <div className="crm-search-controls-wrapper">
          {/* Customer Name Debounced Search */}
          <div className="search-container" style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
            }} />
            <input
              type="text"
              id="search-customer-name"
              className="form-input"
              style={{ paddingLeft: '2.4rem', paddingRight: isDebouncing ? '2.4rem' : '1rem' }}
              placeholder="Search customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isDebouncing && (
              <RefreshCw size={14} className="animate-spin" style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gold-primary)',
              }} />
            )}
          </div>
        </div>
      </div>

      <div className="mobile-table-hint" style={{ margin: '0.65rem 0.85rem 0 0.85rem' }}>
        <span>↔ Swipe table horizontally to view all invoice columns</span>
      </div>

      {/* Table Content with Responsive Scrolling */}
      <div className="crm-table-container">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Date</th>
              <th>Customer / Buyer</th>
              <th>Items & Gold Purity</th>
              <th>Weight (Gms)</th>
              <th>Total Amount</th>
              <th>Payment</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--gold-primary)' }} />
                    <span>Loading invoices...</span>
                  </div>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{ maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(184, 142, 40, 0.12)',
                      color: 'var(--gold-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                    }}>
                      <Search size={22} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      No invoices found
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      {searchTerm
                        ? 'Try clearing your customer name search query.'
                        : 'Get started by creating your first gold purchase invoice.'}
                    </p>
                    <button onClick={onCreateNew} className="btn-gold" style={{ fontSize: '0.875rem' }}>
                      <Plus size={16} />
                      <span>Create New Invoice</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const totalGrams = (inv.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                const itemsSummary = (inv.items || []).map((i) => i.description).join(', ');

                return (
                  <tr key={inv._id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'var(--gold-primary)',
                        background: 'rgba(184, 142, 40, 0.08)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(184, 142, 40, 0.22)',
                      }}>
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {formatDate(inv.invoiceDate)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {inv.buyer?.name || 'Walk-in Customer'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {inv.buyer?.phone ? `+91 ${inv.buyer.phone} • ` : ''}
                        {inv.buyer?.state || 'West Bengal'}
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={itemsSummary}>
                        {itemsSummary || 'GOLD ORNAMENTS (916%)'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent-green)', fontSize: '0.9rem' }}>
                        {totalGrams.toFixed(3)} gms
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        fontWeight: 600,
                        background: 'var(--accent-blue-bg)',
                        color: 'var(--accent-blue)',
                        border: '1px solid rgba(29, 78, 216, 0.2)',
                      }}>
                        {inv.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {/* View & Print */}
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="btn-icon"
                          title="View & Print Official Tax Invoice"
                          style={{ color: 'var(--gold-primary)' }}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Download PDF via Blob ObjectURL Dynamic Anchor */}
                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={downloadingId === inv._id}
                          className="btn-icon"
                          title="Download PDF"
                          style={{ color: '#059669' }}
                        >
                          {downloadingId === inv._id ? (
                            <RefreshCw size={15} className="animate-spin" />
                          ) : (
                            <Download size={16} />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="btn-icon"
                          title="Edit Invoice"
                          style={{ color: '#2563EB' }}
                        >
                          <Edit3 size={16} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirmId(inv._id)}
                          className="btn-icon"
                          title="Delete Invoice"
                          style={{ color: '#DC2626' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px', padding: '1.75rem', textAlign: 'center' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--accent-red-bg)',
              color: 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              border: '1px solid #FECACA',
            }}>
              <AlertCircle size={26} />
            </div>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 750,
              color: 'var(--text-main)',
              marginBottom: '0.5rem',
            }}>
              Delete Invoice?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this invoice? This action will permanently remove it from the database.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  onDeleteInvoice(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
