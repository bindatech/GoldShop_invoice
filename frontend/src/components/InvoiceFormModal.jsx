import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { convertNumberToWords } from '../utils/numberToWords';
import { isGoldItem, isSilverItem } from '../utils/metalUtils';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  UserCheck,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit3,
  Check,
  TrendingUp,
  Sparkles,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import {
  getStoredMetalRates,
  fetchLiveMetalRates,
  saveCustomMetalRates,
  getRateForMetal,
} from '../services/metalPriceService';

export default function InvoiceFormModal({ isOpen, onClose, onSave, editingInvoice, user }) {
  if (!isOpen) return null;

  // Seller Details default from User profile
  const defaultSeller = {
    shopName: user?.shopDetails?.shopName || 'BINDA JEWELLERS',
    address: user?.shopDetails?.address || 'Maheshganj, Nabadwip, Nadia, Pin- 741315',
    gstin: user?.shopDetails?.gstin || '19EEFPM2064M1Z2',
    pan: user?.shopDetails?.pan || 'EEFPM2064M',
    state: user?.shopDetails?.state || 'West Bengal',
    bankName: user?.shopDetails?.bankName || 'Branch Nabadwip',
    accountNo: user?.shopDetails?.accountNo || '36540395000',
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

  // Metal Live & Shop Board Rates (Kolkata Market)
  const [metalRates, setMetalRates] = useState(getStoredMetalRates());
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [ratesSuccessMsg, setRatesSuccessMsg] = useState('');
  const [customRateInputs, setCustomRateInputs] = useState({
    gold22k: metalRates.gold22k || 13610,
    gold24k: metalRates.gold24k || 14315,
    silver: metalRates.silver || 191,
  });

  // Listen for metal rate updates & fetch on modal open
  useEffect(() => {
    const handleRatesUpdate = (e) => {
      if (e.detail) {
        setMetalRates(e.detail);
        setCustomRateInputs({
          gold22k: e.detail.gold22k || 13610,
          gold24k: e.detail.gold24k || 14315,
          silver: e.detail.silver || 191,
        });
      }
    };
    window.addEventListener('metal-rates-updated', handleRatesUpdate);

    if (isOpen) {
      fetchLiveMetalRates()
        .then((latest) => {
          if (latest) {
            setMetalRates(latest);
            setCustomRateInputs({
              gold22k: latest.gold22k || 13610,
              gold24k: latest.gold24k || 14315,
              silver: latest.silver || 191,
            });

            // Automatically update today's live rate in the initial item row for new invoices
            if (!editingInvoice) {
              setItems((prevItems) => {
                if (prevItems.length === 1 && (!prevItems[0].quantity || prevItems[0].quantity === '')) {
                  return [
                    {
                      ...prevItems[0],
                      rate: latest.gold22k || 13610,
                    },
                  ];
                }
                return prevItems;
              });
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('metal-rates-updated', handleRatesUpdate);
    };
  }, [isOpen]);

  // Items
  const [items, setItems] = useState([
    {
      slNo: 1,
      description: 'GOLD ORNAMENTS (916%)',
      metal: 'gold',
      hsnSac: '7113',
      quantity: '',
      rate: metalRates.gold22k || 13610,
      per: 'gms',
      amount: 0,
    },
  ]);

  const [cgstRate, setCgstRate] = useState(1.5);
  const [sgstRate, setSgstRate] = useState(1.5);
  const [makingCharges, setMakingCharges] = useState(0);
  const [hallmarkAmount, setHallmarkAmount] = useState('');

  // Other Products (Non-taxable items)
  const [otherProducts, setOtherProducts] = useState([]);

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
      let rawOtherRef = editingInvoice.otherReferences || '';
      let restoredHallmark = editingInvoice.hallmarkAmount;
      let restoredOtherProducts = editingInvoice.otherProducts;
      if (rawOtherRef.includes('[META:')) {
        try {
          const metaStr = rawOtherRef.match(/\[META:(.*?)\]/)?.[1];
          if (metaStr) {
            const parsed = JSON.parse(metaStr);
            if ((restoredHallmark === undefined || restoredHallmark === null || Number(restoredHallmark) === 0) && parsed.hm !== undefined) {
              restoredHallmark = parsed.hm;
            }
            if ((!restoredOtherProducts || restoredOtherProducts.length === 0) && parsed.ops && Array.isArray(parsed.ops)) {
              restoredOtherProducts = parsed.ops;
            }
          }
        } catch (e) {}
        rawOtherRef = rawOtherRef.replace(/\[META:.*?\]/g, '').trim();
      }
      setOtherReferences(rawOtherRef);
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
            metal: it.metal || (isSilverItem(it) ? 'silver' : (isGoldItem(it) ? 'gold' : 'other')),
            hsnSac: it.hsnSac || '7113',
            quantity: it.quantity,
            rate: it.rate,
            per: it.per || 'gms',
            amount: it.amount || 0,
          }))
        );
      }
      if (restoredOtherProducts && Array.isArray(restoredOtherProducts) && restoredOtherProducts.length > 0) {
        setOtherProducts(
          restoredOtherProducts.map((op, idx) => ({
            slNo: op.slNo || idx + 1,
            name: op.name || op.description || '',
            amount: op.amount !== undefined ? op.amount : '',
          }))
        );
      } else {
        setOtherProducts([]);
      }
      setCgstRate(editingInvoice.cgstRate ?? 1.5);
      setSgstRate(editingInvoice.sgstRate ?? 1.5);
      setMakingCharges(editingInvoice.makingCharges ?? 0);
      setHallmarkAmount(
        restoredHallmark !== undefined && restoredHallmark !== null && Number(restoredHallmark) > 0
          ? String(restoredHallmark)
          : ''
      );
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
          metal: 'gold',
          hsnSac: '7113',
          quantity: '',
          rate: metalRates.gold22k || 13610,
          per: 'gms',
          amount: 0,
        },
      ]);
      setOtherProducts([]);
      setCgstRate(1.5);
      setSgstRate(1.5);
      setMakingCharges(0);
      setHallmarkAmount('');
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

    if (field === 'description') {
      const isSilv = isSilverItem({ description: value });
      const isGld = isGoldItem({ description: value });
      if (isSilv) {
        updated[index].metal = 'silver';
        if (!updated[index].rate || updated[index].rate === metalRates.gold22k || updated[index].rate === metalRates.gold24k) {
          updated[index].rate = metalRates.silver || 191;
        }
      } else if (isGld) {
        updated[index].metal = 'gold';
        const expectedRate = getRateForMetal('gold', value, metalRates);
        if (!updated[index].rate || updated[index].rate === metalRates.silver) {
          updated[index].rate = expectedRate;
        }
      }
    }

    if (field === 'quantity' || field === 'rate' || field === 'description') {
      const q = parseFloat(field === 'quantity' ? value : updated[index].quantity) || 0;
      const r = parseFloat(field === 'rate' ? value : updated[index].rate) || 0;
      updated[index].amount = Math.round(q * r * 100) / 100;
    }
    setItems(updated);
  };

  const addItemRow = (metalType = 'gold') => {
    const isSilver = metalType === 'silver';
    const rateToUse = isSilver
      ? (metalRates.silver || 191)
      : (metalRates.gold22k || 13610);

    setItems([
      ...items,
      {
        slNo: items.length + 1,
        description: isSilver ? 'SILVER ORNAMENTS (92.5%)' : 'GOLD ORNAMENTS (916%)',
        metal: isSilver ? 'silver' : 'gold',
        hsnSac: '7113',
        quantity: '',
        rate: rateToUse,
        per: 'gms',
        amount: 0,
      },
    ]);
  };

  // Apply current metal rates across all existing rows
  const applyRatesToAllItems = () => {
    const updated = items.map((item) => {
      const isSilv = item.metal === 'silver' || isSilverItem(item);
      const targetRate = isSilv
        ? (metalRates.silver || 191)
        : getRateForMetal(item.metal, item.description, metalRates);
      const q = parseFloat(item.quantity) || 0;
      return {
        ...item,
        rate: targetRate,
        amount: Math.round(q * targetRate * 100) / 100,
      };
    });
    setItems(updated);
    setRatesSuccessMsg('Rates applied to all items!');
    setTimeout(() => setRatesSuccessMsg(''), 2500);
  };

  const handleRefreshRates = async () => {
    setIsFetchingRates(true);
    setRatesSuccessMsg('');
    try {
      const latest = await fetchLiveMetalRates();
      if (latest) {
        setMetalRates(latest);
        setCustomRateInputs({
          gold22k: latest.gold22k || 13610,
          gold24k: latest.gold24k || 14315,
          silver: latest.silver || 191,
        });
        setRatesSuccessMsg('Anandabazar Kolkata benchmark rates updated!');
        setTimeout(() => setRatesSuccessMsg(''), 2500);
      }
    } catch (e) {
      console.warn('Failed to refresh rates:', e);
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleSaveCustomRates = () => {
    const g22 = parseFloat(customRateInputs.gold22k) || metalRates.gold22k;
    const g24 = parseFloat(customRateInputs.gold24k) || metalRates.gold24k;
    const silv = parseFloat(customRateInputs.silver) || metalRates.silver;

    const saved = saveCustomMetalRates({
      gold22k: g22,
      gold24k: g24,
      silver: silv,
    });
    setMetalRates(saved);
    setIsEditingRates(false);
    setRatesSuccessMsg('Today’s shop rates saved!');
    setTimeout(() => setRatesSuccessMsg(''), 2500);
  };

  const handleResetToLive = async () => {
    setIsFetchingRates(true);
    setRatesSuccessMsg('');
    try {
      localStorage.removeItem('gold_crm_metal_rates_kolkata_anandabazar_v5');
      const latest = await fetchLiveMetalRates();
      if (latest) {
        setMetalRates(latest);
        setCustomRateInputs({
          gold22k: latest.gold22k || 13610,
          gold24k: latest.gold24k || 14315,
          silver: latest.silver || 191,
        });
        setIsEditingRates(false);
        setRatesSuccessMsg('Reset to Anandabazar Kolkata benchmark!');
        setTimeout(() => setRatesSuccessMsg(''), 2500);
      }
    } catch (e) {
      console.warn('Failed to reset to live rates:', e);
    } finally {
      setIsFetchingRates(false);
    }
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    const filtered = items.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      slNo: idx + 1,
    }));
    setItems(filtered);
  };

  // Other Products row operations
  const handleOtherProductChange = (index, field, value) => {
    const updated = [...otherProducts];
    updated[index][field] = value;
    setOtherProducts(updated);
  };

  const addOtherProductRow = () => {
    setOtherProducts([
      ...otherProducts,
      {
        slNo: otherProducts.length + 1,
        name: '',
        amount: '',
      },
    ]);
  };

  const removeOtherProductRow = (index) => {
    const filtered = otherProducts
      .filter((_, i) => i !== index)
      .map((item, idx) => ({
        ...item,
        slNo: idx + 1,
      }));
    setOtherProducts(filtered);
  };

  // Live calculations: tax is NOT applied to other products, making charges, or hallmark amount
  const otherProductsTotal = otherProducts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const otherProductsVal = Math.max(0, Math.round(otherProductsTotal * 100) / 100);

  const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const taxableAmount = Math.round(itemsTotal * 100) / 100;
  const cgstAmount = Math.round(taxableAmount * (cgstRate / 100) * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * (sgstRate / 100) * 100) / 100;
  const totalTaxAmount = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  const makingChargesVal = Math.max(0, parseFloat(makingCharges) || 0);
  const hallmarkVal = Math.max(0, parseFloat(hallmarkAmount) || 0);

  // Directly add other products and hallmark amount without any tax
  const rawTotal = taxableAmount + totalTaxAmount + makingChargesVal + otherProductsVal + hallmarkVal;
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
      setError('Please enter at least one valid item with Quantity and Rate.');
      return;
    }

    setSaving(true);
    try {
      const sanitizedOtherProducts = otherProducts
        .map((op, idx) => ({
          slNo: idx + 1,
          name: (op.name || '').trim(),
          amount: parseFloat(op.amount) || 0,
        }))
        .filter((op) => op.name || op.amount > 0);

      const cleanOtherRef = otherReferences.replace(/\[META:.*?\]/g, '').trim();
      const metaTag = (hallmarkVal > 0 || sanitizedOtherProducts.length > 0)
        ? `[META:${JSON.stringify({ hm: hallmarkVal, ops: sanitizedOtherProducts })}]`
        : '';
      const encodedOtherReferences = cleanOtherRef
        ? (metaTag ? `${cleanOtherRef} ${metaTag}` : cleanOtherRef)
        : metaTag;

      const payload = {
        invoiceNumber,
        invoiceDate,
        subTitle,
        deliveryNote,
        paymentMode,
        supplierRef,
        otherReferences: encodedOtherReferences,
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
          metal: it.metal || (isSilverItem(it) ? 'silver' : (isGoldItem(it) ? 'gold' : 'other')),
          hsnSac: it.hsnSac || '7113',
          quantity: parseFloat(it.quantity),
          rate: parseFloat(it.rate),
          per: it.per || 'gms',
          amount: parseFloat(it.amount),
        })),
        otherProducts: sanitizedOtherProducts,
        otherProductsTotal: otherProductsVal,
        makingCharges: makingChargesVal,
        hallmarkAmount: hallmarkVal,
        taxableAmount,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        roundOff,
        totalAmount,
        amountInWords,
        taxAmountInWords,
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
              {/* Professional Bullion Market Rates & Shop Board Rate Widget */}
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #E6DEC9',
                borderRadius: '12px',
                boxShadow: '0 4px 18px rgba(184, 142, 40, 0.08)',
                overflow: 'hidden',
                marginBottom: '1.25rem',
              }}>
                {/* Top Gold Accent Bar */}
                <div style={{
                  height: '3px',
                  background: 'linear-gradient(90deg, #D4AF37 0%, #B88E28 50%, #966F17 100%)',
                  width: '100%',
                }} />

                <div style={{ padding: '0.85rem 1.15rem' }}>
                  {/* Header Row: Title & Action Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #ECE7DE',
                    marginBottom: '0.85rem',
                  }}>
                    {/* Title & Live Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(184, 142, 40, 0.1)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(184, 142, 40, 0.25)',
                      }}>
                        <Sparkles size={14} color="#B88E28" />
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          color: '#8A6413',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-heading)',
                        }}>
                          Kolkata Bullion Rates
                        </span>
                      </div>

                      {/* Live / Custom Indicator */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: metalRates.isCustom ? '#92400E' : '#047857',
                      }}>
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: metalRates.isCustom ? '#D97706' : '#10B981',
                          boxShadow: metalRates.isCustom ? '0 0 6px #F59E0B' : '0 0 8px #10B981',
                          display: 'inline-block',
                        }} />
                        <span>{metalRates.isCustom ? 'Shop Custom Board Rate' : 'Live Auto-Sync (Today)'}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleRefreshRates}
                        disabled={isFetchingRates}
                        className="btn-outline"
                        style={{
                          padding: '0.32rem 0.65rem',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          background: '#FAF8F5',
                          borderColor: '#E2DBD0',
                          color: 'var(--text-main)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                        }}
                        title="Fetch latest live market rates"
                      >
                        <RefreshCw size={12} className={isFetchingRates ? 'spin-anim' : ''} />
                        <span>{isFetchingRates ? 'Syncing...' : 'Sync Live'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditingRates(!isEditingRates)}
                        className="btn-outline"
                        style={{
                          padding: '0.32rem 0.65rem',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          background: isEditingRates ? 'rgba(184, 142, 40, 0.12)' : '#FAF8F5',
                          borderColor: isEditingRates ? 'var(--gold-primary)' : '#E2DBD0',
                          color: isEditingRates ? 'var(--gold-dark)' : 'var(--text-main)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                        }}
                        title="Set or tweak today's rate manually"
                      >
                        <Edit3 size={12} />
                        <span>{isEditingRates ? 'Close Editor' : 'Set Shop Rate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={applyRatesToAllItems}
                        style={{
                          padding: '0.32rem 0.75rem',
                          fontSize: '0.74rem',
                          fontWeight: 650,
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #047857 0%, #065F46 100%)',
                          border: 'none',
                          color: '#FFFFFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
                        }}
                        title="Apply current rates to all items in table"
                      >
                        <CheckCheck size={13} />
                        <span>Apply to Items</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Price Cards Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                  }}>
                    {/* Card 1: Gold 22K (916) Hallmark */}
                    <div style={{
                      background: 'linear-gradient(180deg, #FFFDF8 0%, #FAF5EA 100%)',
                      border: '1.5px solid #DFC068',
                      borderRadius: '10px',
                      padding: '0.75rem 0.9rem',
                      boxShadow: '0 2px 8px rgba(184, 142, 40, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.95rem' }}>🪙</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8A6413', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Gold 22K (916)
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          background: '#F5ECCE',
                          color: '#785A11',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          letterSpacing: '0.04em',
                        }}>
                          HALLMARK
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#047857', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
                          ₹{Number(metalRates.gold22k || 13610).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          / gram
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#785A11', marginTop: '0.25rem', opacity: 0.9 }}>
                        Standard Jewellery • Auto-applied
                      </div>
                    </div>

                    {/* Card 2: Gold 24K Pure */}
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5DFD4',
                      borderRadius: '10px',
                      padding: '0.75rem 0.9rem',
                      boxShadow: '0 1px 4px rgba(28, 25, 23, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.95rem' }}>✨</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Gold 24K Pure
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          background: '#F3EFE7',
                          color: '#57534E',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                        }}>
                          99.9% PURE
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
                          ₹{Number(metalRates.gold24k || 14315).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          / gram
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Bullion Bars & 24K Coins
                      </div>
                    </div>

                    {/* Card 3: Fine Silver */}
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5DFD4',
                      borderRadius: '10px',
                      padding: '0.75rem 0.9rem',
                      boxShadow: '0 1px 4px rgba(28, 25, 23, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.95rem' }}>⚪</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Fine Silver
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          background: '#F1F5F9',
                          color: '#475569',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                        }}>
                          92.5% / 999
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#334155', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
                          ₹{Number(metalRates.silver || 191).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          / gram
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Payal, Ornaments & Utensils
                      </div>
                    </div>
                  </div>

                  {/* Inline Board Rate Editor Drawer */}
                  {isEditingRates && (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.85rem 1rem',
                      background: '#FAF7F0',
                      borderRadius: '8px',
                      border: '1px dashed #DFC068',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8A6413', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ✏️ Set Today's Shop Board Rate
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          These custom rates will apply to today's invoices
                        </span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '0.75rem',
                        alignItems: 'end',
                      }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Gold 22K (916) (₹/gm)
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', fontWeight: 650 }}
                            value={customRateInputs.gold22k}
                            onChange={(e) => setCustomRateInputs({ ...customRateInputs, gold22k: e.target.value })}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Gold 24K Pure (₹/gm)
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', fontWeight: 650 }}
                            value={customRateInputs.gold24k}
                            onChange={(e) => setCustomRateInputs({ ...customRateInputs, gold24k: e.target.value })}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Silver (₹/gm)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', fontWeight: 650 }}
                            value={customRateInputs.silver}
                            onChange={(e) => setCustomRateInputs({ ...customRateInputs, silver: e.target.value })}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={handleSaveCustomRates}
                            className="btn-gold"
                            style={{
                              padding: '0.45rem 0.85rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              flex: 1,
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={14} />
                            <span>Save Rate</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetToLive}
                            className="btn-outline"
                            style={{
                              padding: '0.45rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: '#FFFFFF',
                            }}
                            title="Reset back to live automated market feed"
                          >
                            <RotateCcw size={12} />
                            <span>Live</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {ratesSuccessMsg && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.35rem 0.65rem',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      color: '#065F46',
                      fontWeight: 650,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}>
                      <Check size={13} />
                      <span>{ratesSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 650, color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-heading)' }}>
                  Description of Goods & Quantities (Gold / Silver)
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => addItemRow('gold')}
                    className="btn-outline"
                    style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)', borderColor: '#047857', color: '#047857' }}
                  >
                    <Plus size={14} />
                    <span>Add Gold Item</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addItemRow('silver')}
                    className="btn-outline"
                    style={{ padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)', borderColor: '#475569', color: '#475569' }}
                  >
                    <Plus size={14} />
                    <span>Add Silver Item</span>
                  </button>
                </div>
              </div>

              <div className="mobile-table-hint">
                <span>↔ Swipe table horizontally to edit quantity & rate</span>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '40px', textAlign: 'center', verticalAlign: 'middle' }}>#</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '220px', verticalAlign: 'middle' }}>Description of Goods</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '90px', verticalAlign: 'middle' }}>HSN/SAC</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '110px', verticalAlign: 'middle' }}>Quantity (Gms)</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '120px', verticalAlign: 'middle' }}>Rate (₹/gm)</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '70px', verticalAlign: 'middle' }}>Per</th>
                      <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '120px', verticalAlign: 'middle' }}>Amount (₹)</th>
                      <th style={{ padding: '0.5rem', width: '40px', verticalAlign: 'middle' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          {item.slNo}
                        </td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            required
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                         
                            value={item.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(idx, 'description', val);
                              if (isSilverItem({ description: val })) {
                                handleItemChange(idx, 'metal', 'silver');
                              } else if (isGoldItem({ description: val })) {
                                handleItemChange(idx, 'metal', 'gold');
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            value={item.hsnSac}
                            onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            required
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
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
                        <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '0.45rem 0.65rem' }}
                            value={item.per}
                            onChange={(e) => handleItemChange(idx, 'per', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
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

            {/* Section 4: Other Products (Non-Taxable, added directly to Total Amount) */}
            <div style={{
              background: 'var(--bg-elevated)',
              padding: 'clamp(0.75rem, 1.5vw, 1.25rem)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 650, color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-heading)' }}>
                    Other Products & Accessories (Non-Taxable)
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Tax does not apply to other products. Amount is added directly to total amount.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOtherProductRow}
                  className="btn-outline"
                  style={{ padding: '0.4rem 0.8rem', fontSize: 'var(--text-xs)', borderColor: 'var(--gold-primary)', color: 'var(--gold-primary)' }}
                >
                  <Plus size={14} />
                  <span>Add Other Product</span>
                </button>
              </div>

              {otherProducts.length === 0 ? (
                <div style={{
                  padding: '1.15rem',
                  textAlign: 'center',
                  background: '#FFFFFF',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-dim)',
                  fontSize: '0.82rem',
                }}>
                  No other products added. Click <strong>"+ Add Other Product"</strong> if selling non-taxable accessories (e.g. Jewellery Box, Silver Polish, etc.).
                </div>
              ) : (
                <>
                  <div className="mobile-table-hint">
                    <span>↔ Swipe table horizontally to edit product name & amount</span>
                  </div>

                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '40px', textAlign: 'center', verticalAlign: 'middle' }}>#</th>
                          <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', verticalAlign: 'middle' }}>Other Product Name</th>
                          <th style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', width: '180px', verticalAlign: 'middle' }}>Amount (₹)</th>
                          <th style={{ padding: '0.5rem', width: '40px', verticalAlign: 'middle' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherProducts.map((op, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '0.45rem 0.65rem' }}
                                placeholder="e.g. Jewellery Box, Cleaning Kit..."
                                value={op.name}
                                onChange={(e) => handleOtherProductChange(idx, 'name', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', verticalAlign: 'middle' }}>
                              <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="form-input"
                                  style={{ padding: '0.45rem 0.65rem 0.45rem 1.6rem', fontWeight: 600 }}
                                  placeholder="0.00"
                                  value={op.amount}
                                  onChange={(e) => handleOtherProductChange(idx, 'amount', e.target.value)}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => removeOtherProductRow(idx)}
                                style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                title="Remove product"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Section 5: Live Tax Summary & Calculations */}
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
                    id="input-making-charges"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Hallmark Charges (₹):</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: 'var(--bg-card-hover)', padding: '1px 5px', borderRadius: '3px' }}>Non-taxable</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    style={{ width: '120px', padding: '0.25rem 0.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}
                    value={hallmarkAmount}
                    onChange={(e) => setHallmarkAmount(e.target.value)}
                    placeholder="0.00"
                    id="input-hallmark-amount"
                  />
                </div>
                {otherProductsVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Other Products (Non-taxable):</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>+₹{otherProductsVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
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
