import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { convertNumberToWords } from '../utils/numberToWords';
import { X, Plus, Trash2, Calculator, UserCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function InvoiceFormModal({ isOpen, onClose, onSave, editingInvoice, user }) {
  if (!isOpen) return null;

  // Seller Details default from User profile
  const defaultSeller = {
    shopName: user?.shopDetails?.shopName || 'HOSSAIN JEWELLERS',
    address: user?.shopDetails?.address || 'Machibhanga, Kashipur, 24 Pgs (S), Kolkata- 700135',
    gstin: user?.shopDetails?.gstin || '19EEFPM2064M1Z2',
    pan: user?.shopDetails?.pan || 'EEFPM2064M',
    state: user?.shopDetails?.state || 'West Bengal',
    bankName: user?.shopDetails?.bankName || 'Branch Lauhati',
    accountNo: user?.shopDetails?.accountNo || '36540395042',
    ifscCode: user?.shopDetails?.ifscCode || 'SBIN0006208',
  };

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [subTitle, setSubTitle] = useState('(ORIGINAL FOR RECIPIENT)');

  // References & Logistics
  const [deliveryNote, setDeliveryNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [supplierRef, setSupplierRef] = useState('');
  const [otherReferences, setOtherReferences] = useState('');
  const [buyerOrderNo, setBuyerOrderNo] = useState('');
  const [buyerOrderDate, setBuyerOrderDate] = useState('');
  const [despatchDocNo, setDespatchDocNo] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [despatchedThrough, setDespatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');
  const [showLogistics, setShowLogistics] = useState(false);

  // Buyer Info
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerPan, setBuyerPan] = useState('');
  const [buyerState, setBuyerState] = useState('West Bengal');

  // Customer Autocomplete Search
  const debouncedCustomerQuery = useDebounce(buyerName, 300);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Items
  const [items, setItems] = useState([
    {
      slNo: 1,
      description: 'GOLD ORNAMENTS (916%)',
      hsnSac: '7113',
      quantity: '',
      rate: '',
      per: 'gms',
      amount: 0,
    },
  ]);

  const [cgstRate, setCgstRate] = useState(1.5);
  const [sgstRate, setSgstRate] = useState(1.5);
  const [makingCharges, setMakingCharges] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prefill when editing
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber || '');
      setInvoiceDate(
        editingInvoice.invoiceDate
          ? new Date(editingInvoice.invoiceDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setSubTitle(editingInvoice.subTitle || '(ORIGINAL FOR RECIPIENT)');
      setDeliveryNote(editingInvoice.deliveryNote || '');
      setPaymentMode(editingInvoice.paymentMode || 'Cash');
      setSupplierRef(editingInvoice.supplierRef || '');
      setOtherReferences(editingInvoice.otherReferences || '');
      setBuyerOrderNo(editingInvoice.buyerOrderNo || '');
      setBuyerOrderDate(editingInvoice.buyerOrderDate || '');
      setDespatchDocNo(editingInvoice.despatchDocNo || '');
      setDeliveryNoteDate(editingInvoice.deliveryNoteDate || '');
      setDespatchedThrough(editingInvoice.despatchedThrough || '');
      setDestination(editingInvoice.destination || '');
      setTermsOfDelivery(editingInvoice.termsOfDelivery || '');

      if (editingInvoice.buyer) {
        setBuyerName(editingInvoice.buyer.name || '');
        setBuyerPhone(editingInvoice.buyer.phone || '');
        setBuyerAddress(editingInvoice.buyer.address || '');
        setBuyerGstin(editingInvoice.buyer.gstin || '');
        setBuyerPan(editingInvoice.buyer.pan || '');
        setBuyerState(editingInvoice.buyer.state || 'West Bengal');
      }

      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setItems(
          editingInvoice.items.map((it, idx) => ({
            slNo: it.slNo || idx + 1,
            description: it.description || 'GOLD ORNAMENTS (916%)',
            hsnSac: it.hsnSac || '7113',
            quantity: it.quantity,
            rate: it.rate,
            per: it.per || 'gms',
            amount: it.amount || 0,
          }))
        );
      }
      setCgstRate(editingInvoice.cgstRate ?? 1.5);
      setSgstRate(editingInvoice.sgstRate ?? 1.5);
      setMakingCharges(editingInvoice.makingCharges ?? 0);
    } else {
      // New invoice reset
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setBuyerName('');
      setBuyerPhone('');
      setBuyerAddress('');
      setBuyerGstin('');
      setBuyerPan('');
      setBuyerState('West Bengal');
      setPaymentMode('Cash');
      setItems([
        {
          slNo: 1,
          description: 'GOLD ORNAMENTS (916%)',
          hsnSac: '7113',
          quantity: '',
          rate: '',
          per: 'gms',
          amount: 0,
        },
      ]);
      setCgstRate(1.5);
      setSgstRate(1.5);
      setMakingCharges(0);
    }
  }, [editingInvoice]);

  // Debounced search customer suggestions
  useEffect(() => {
    let active = true;
    if (!editingInvoice && debouncedCustomerQuery && debouncedCustomerQuery.trim().length >= 2) {
      setIsSearchingCustomer(true);
      api
        .searchCustomers(debouncedCustomerQuery.trim())
        .then((res) => {
          if (active && res.customers) {
            setCustomerSuggestions(res.customers);
            setShowSuggestions(res.customers.length > 0);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsSearchingCustomer(false);
        });
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      active = false;
    };
  }, [debouncedCustomerQuery, editingInvoice]);

  const selectCustomer = (cust) => {
    setBuyerName(cust.name || '');
    if (cust.phone) setBuyerPhone(cust.phone);
    if (cust.address) setBuyerAddress(cust.address);
    if (cust.gstin) setBuyerGstin(cust.gstin);
    if (cust.pan) setBuyerPan(cust.pan);
    if (cust.state) setBuyerState(cust.state);
    setShowSuggestions(false);
  };

  // Item row operations
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'quantity' || field === 'rate') {
      const q = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 0;
      const r = parseFloat(field === 'rate' ? value : updated[index].rate) || 0;
      updated[index].amount = Math.round(q * r * 100) / 100;
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        slNo: items.length + 1,
        description: 'GOLD ORNAMENTS (916%)',
        hsnSac: '7113',
        quantity: '',
        rate: '',
        per: 'gms',
        amount: 0,
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    const filtered = items.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      slNo: idx + 1,
    }));
    setItems(filtered);
  };

  // Live calculations: tax is NOT calculated on making charges
  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const taxableAmount = Math.round(itemsTotal * 100) / 100;
  const cgstAmount = Math.round(taxableAmount * (cgstRate / 100) * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * (sgstRate / 100) * 100) / 100;
  const totalTaxAmount = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  const makingChargesVal = Math.max(0, parseFloat(makingCharges) || 0);
  const rawTotal = taxableAmount + totalTaxAmount + makingChargesVal;
  const totalAmount = Math.round(rawTotal);
  const roundOff = Math.round((totalAmount - rawTotal) * 100) / 100;
  const amountInWords = convertNumberToWords(totalAmount);
  const taxAmountInWords = convertNumberToWords(totalTaxAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!buyerName.trim()) {
      setError('Please provide the Customer / Buyer Name.');
      return;
    }

    const validItems = items.filter((it) => (parseFloat(it.quantity) || 0) > 0 && (parseFloat(it.rate) || 0) > 0);
    if (validItems.length === 0) {
      setError('Please enter at least one valid gold item with Quantity and Rate.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        invoiceNumber,
        invoiceDate,
        subTitle,
        deliveryNote,
        paymentMode,
        supplierRef,
        otherReferences,
        buyerOrderNo,
        buyerOrderDate,
        despatchDocNo,
        deliveryNoteDate,
        despatchedThrough,
        destination,
        termsOfDelivery,
        buyer: {
          name: buyerName.trim(),
          phone: buyerPhone.trim(),
          address: buyerAddress.trim(),
          gstin: buyerGstin.trim(),
          pan: buyerPan.trim(),
          state: buyerState.trim(),
        },
        items: validItems.map((it, idx) => ({
          slNo: idx + 1,
          description: it.description,
          hsnSac: it.hsnSac || '7113',
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          per: it.per || 'gms',
          amount: parseFloat(it.amount),
        })),
        makingCharges: makingChargesVal,
        cgstRate,
        sgstRate,
        seller: defaultSeller,
      };

      await onSave(payload, editingInvoice ? editingInvoice._id : null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop no-print">
      <div className="modal-card">
        {/* Modal Header */}
        <div style={{
          padding: 'clamp(0.85rem, 2vw, 1.25rem) clamp(1rem, 2.5vw, 1.75rem)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.25rem)', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
              {editingInvoice ? 'Edit Gold Purchase Invoice' : 'Create Gold Purchase Invoice'}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Generates official GST Tax Invoice compliant with jewellery standards
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body */}
        <div style={{ padding: 'clamp(0.85rem, 2vw, 1.5rem)', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: 'var(--accent-red-bg)',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--accent-red)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Basic Invoice Information */}
            <div className="modal-section-grid-3">
              <div>
                <label className="form-label">Invoice No. (Auto or Custom)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Auto-generated e.g. HJ/2026/0001"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Invoice Date *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Payment Mode</label>
                <select
                  className="form-select"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* Section 2: Buyer / Customer with Debounced Auto-complete */}
            <div style={{
              background: 'var(--bg-elevated)',
              padding: 'clamp(0.75rem, 1.5vw, 1.25rem)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 650, color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-heading)' }}>
                  Customer / Buyer Details
                </h3>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Debounced auto-complete enabled
                </span>
              </div>

              <div className="modal-section-grid-2">
                {/* Customer Name with suggestion dropdown */}
                <div style={{ position: 'relative' }}>
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    required
                    id="input-buyer-name"
                    className="form-input"
                    placeholder="Type to search or enter customer..."
                    value={buyerName}
                    onChange={(e) => {
                      setBuyerName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (customerSuggestions.length > 0) setShowSuggestions(true);
                    }}
                  />
                  {/* Suggestions Popover */}
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--gold-primary)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 50,
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}>
                      <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg-elevated)' }}>
                        Select existing customer to auto-fill:
                      </div>
                      {customerSuggestions.map((cust, i) => (
                        <div
                          key={i}
                          onClick={() => selectCustomer(cust)}
                          style={{
                            padding: '0.6rem 0.85rem',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            {cust.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {cust.phone ? `Ph: ${cust.phone} • ` : ''}
                            {cust.address ? `${cust.address} • ` : ''}
                            {cust.state}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Customer Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Machibhanga, Kashipur"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">PAN / IT No.</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ABCDE1234F"
                    value={buyerPan}
                    onChange={(e) => setBuyerPan(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">GSTIN / UIN</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 19EEFPM2064M1Z2"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">State Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. West Bengal"
                    value={buyerState}
                    onChange={(e) => setBuyerState(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Optional Logistics / Delivery references collapsible */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowLogistics(!showLogistics)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {showLogistics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>Logistics & Despatch References (Delivery Note, Supplier Ref, Destination etc.)</span>
              </button>

              {showLogistics && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginTop: '0.85rem',
                  padding: '1rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div>
                    <label className="form-label">Delivery Note</label>
                    <input
                      type="text"
                      className="form-input"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Supplier's Ref</label>
                    <input
                      type="text"
                      className="form-input"
                      value={supplierRef}
                      onChange={(e) => setSupplierRef(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Other Reference(s)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={otherReferences}
                      onChange={(e) => setOtherReferences(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Buyer's Order No.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={buyerOrderNo}
                      onChange={(e) => setBuyerOrderNo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Despatch Document No.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={despatchDocNo}
                      onChange={(e) => setDespatchDocNo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Destination</label>
                    <input
                      type="text"
                      className="form-input"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Goods / Items Table */}
            <div style={{
              background: 'var(--bg-elevated)',
              padding: 'clamp(0.75rem, 1.5vw, 1.25rem)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 650, color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-heading)' }}>
                  Description of Gold Goods & Quantities
                </h3>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="btn-outline"
                  style={{ padding: '0.4rem 0.8rem', fontSize: 'var(--text-xs)' }}
                >
                  <Plus size={14} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="mobile-table-hint">
                <span>↔ Swipe table horizontally to edit quantity & rate</span>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>#</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '220px' }}>Description of Goods</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '90px' }}>HSN/SAC</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '110px' }}>Quantity (Gms)</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '120px' }}>Rate (₹/gm)</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '70px' }}>Per</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '120px' }}>Amount (₹)</th>
                      <th style={{ padding: '0.5rem', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {item.slNo}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="text"
                            required
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            placeholder="e.g. GOLD ORNAMENTS (916%)"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            value={item.hsnSac}
                            onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            required
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            placeholder="0.000"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            placeholder="₹ Rate"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            value={item.per}
                            onChange={(e) => handleItemChange(idx, 'per', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Live Tax Summary & Calculations */}
            <div className="modal-calc-grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-primary)', marginBottom: '0.5rem' }}>
                  <Calculator size={18} />
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>Amount in Words</span>
                </div>
                <div style={{
                  background: '#FFFFFF',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  fontStyle: 'italic',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  minHeight: '52px',
                }}>
                  {amountInWords}
                </div>

                <div style={{ marginTop: '0.65rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <strong>Tax in Words:</strong> {taxAmountInWords}
                </div>
              </div>

              {/* Tax totals list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: 'var(--text-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Taxable Value:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>OUTPUT CGST @ {cgstRate}%:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>OUTPUT SGST @ {sgstRate}%:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem' }}>
                  <span>Making Charges (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    style={{ width: '120px', padding: '0.25rem 0.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}
                    value={makingCharges}
                    onChange={(e) => setMakingCharges(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Round Off:</span>
                  <span style={{ color: roundOff >= 0 ? '#047857' : '#B91C1C', fontWeight: 600 }}>
                    {roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.65rem',
                  marginTop: '0.35rem',
                  fontSize: 'clamp(1.1rem, 2.4vw, 1.35rem)',
                  fontWeight: 800,
                  color: '#8A6413',
                  fontFamily: 'var(--font-heading)',
                }}>
                  <span>Net Payable Total:</span>
                  <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="invoice-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline"
                disabled={saving}
                style={{ padding: '0.6rem 1.15rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-gold"
                disabled={saving}
                id="btn-save-invoice"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                {saving ? 'Saving Invoice...' : editingInvoice ? 'Update Invoice' : 'Create & Generate Tax Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
