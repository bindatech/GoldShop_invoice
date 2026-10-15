import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { useDebounce } from './hooks/useDebounce';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import DashboardStats from './components/DashboardStats';
import InvoiceList from './components/InvoiceList';
import InvoiceFormModal from './components/InvoiceFormModal';
import TaxInvoiceView from './components/TaxInvoiceView';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Invoices list & filter state
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search term (350ms)
  const debouncedSearch = useDebounce(searchTerm, 350);
  const isDebouncing = searchTerm !== debouncedSearch;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check initial user authentication
  useEffect(() => {
    const token = localStorage.getItem('gold_crm_token');
    if (token) {
      api
        .getMe()
        .then((res) => {
          if (res.user) setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('gold_crm_token');
          setUser(null);
        })
        .finally(() => setAuthChecking(false));
    } else {
      setAuthChecking(false);
    }
  }, []);

  // Fetch invoices with debounced customer search
  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setLoadingInvoices(true);
    try {
      const data = await api.getInvoices({
        search: debouncedSearch,
      });
      setInvoices(data.invoices || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch invoices', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  }, [user, debouncedSearch]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, fetchInvoices]);

  // Handlers
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    showToast(`Welcome back, ${userData.name || 'Shopkeeper'}!`);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setInvoices([]);
    showToast('Signed out successfully');
  };

  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setIsFormOpen(true);
  };

  const handleOpenView = (inv) => {
    setViewingInvoice(inv);
  };

  const handleSaveInvoice = async (invoiceData, id) => {
    if (id) {
      const res = await api.updateInvoice(id, invoiceData);
      showToast('Invoice updated successfully!');
      if (viewingInvoice && viewingInvoice._id === id) {
        setViewingInvoice(res.invoice);
      }
    } else {
      const res = await api.createInvoice(invoiceData);
      showToast('New Tax Invoice created successfully!');
      // Prompt user to view the generated invoice right away
      setViewingInvoice(res.invoice);
    }
    fetchInvoices();
  };

  const handleDeleteInvoice = async (id) => {
    try {
      await api.deleteInvoice(id);
      showToast('Invoice deleted successfully');
      if (viewingInvoice && viewingInvoice._id === id) {
        setViewingInvoice(null);
      }
      fetchInvoices();
    } catch (err) {
      showToast(err.message || 'Failed to delete invoice', 'error');
    }
  };

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-muted)',
        gap: '0.75rem',
      }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--gold-primary)' }} />
        <span>Loading Hossain Jewellers CRM...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
          color: '#FFFFFF',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(28, 25, 23, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sticky Navigation */}
      <Navbar
        user={user}
        onNewInvoice={handleOpenCreate}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="crm-main-container">
        {/* CRM Overview Stats */}
        <DashboardStats invoices={invoices} />

        {/* Invoice Management Table & Debounced Search */}
        <InvoiceList
          invoices={invoices}
          loading={loadingInvoices}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onViewInvoice={handleOpenView}
          onEditInvoice={handleOpenEdit}
          onDeleteInvoice={handleDeleteInvoice}
          onCreateNew={handleOpenCreate}
          isDebouncing={isDebouncing}
        />
      </main>

      {/* Modal: Create or Edit Invoice */}
      <InvoiceFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingInvoice(null); }}
        onSave={handleSaveInvoice}
        editingInvoice={editingInvoice}
        user={user}
      />

      {/* Modal: Exact Official Tax Invoice View & Print */}
      {viewingInvoice && (
        <TaxInvoiceView
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onEdit={(inv) => {
            setViewingInvoice(null);
            handleOpenEdit(inv);
          }}
        />
      )}
    </div>
  );
}
