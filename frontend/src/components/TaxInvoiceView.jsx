import React, { useState, useEffect } from 'react';
import { Printer, X, Edit3, ArrowLeft, Download } from 'lucide-react';
import { api } from '../services/api';
import { convertNumberToWords } from '../utils/numberToWords';

export default function TaxInvoiceView({ invoice, onClose, onEdit }) {
  if (!invoice) return null;

  const [isDownloading, setIsDownloading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const seller = invoice.seller || {
    shopName: 'HOSSAIN JEWELLERS',
    address: 'Machibhanga, Kashipur, 24 Pgs (S), Kolkata- 700135',
    gstin: '19EEFPM2064M1Z2',
    pan: 'EEFPM2064M',
    state: 'West Bengal',
    bankName: 'Branch Lauhati',
    accountNo: '36540395042',
    ifscCode: 'SBIN0006208',
  };

  const buyer = invoice.buyer || {};
  const items = invoice.items || [];

  let hallmarkAmount = Number(invoice.hallmarkAmount) || 0;
  let otherProductsList = (invoice.otherProducts || []).filter(op => (op.name && op.name.trim()) || Number(op.amount) > 0);

  // Fallback to extract from metadata if older backend omitted hallmarkAmount or otherProducts
  if (hallmarkAmount === 0 && otherProductsList.length === 0 && invoice.otherReferences && invoice.otherReferences.includes('[META:')) {
    try {
      const metaStr = invoice.otherReferences.match(/\[META:(.*?)\]/)?.[1];
      if (metaStr) {
        const parsed = JSON.parse(metaStr);
        if (parsed.hm) hallmarkAmount = Number(parsed.hm);
        if (parsed.ops && Array.isArray(parsed.ops)) otherProductsList = parsed.ops;
      }
    } catch (e) {}
  }

  const otherProductsTotal = Number(invoice.otherProductsTotal) || otherProductsList.reduce((sum, op) => sum + (Number(op.amount) || 0), 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    const hasSpecialCharges = hallmarkAmount > 0 || otherProductsList.length > 0;

    // Direct native server PDF download only if no hallmark/other products were added
    // When hallmark or other products are present, use client-side capture to guarantee they appear in the PDF
    if (!hasSpecialCharges && invoice?._id) {
      try {
        await api.downloadInvoicePDF(invoice._id, invoice.invoiceNumber);
        setIsDownloading(false);
        return;
      } catch (backendErr) {
        console.warn('Backend PDF endpoint error, falling back to client-side capture:', backendErr);
      }
    }

    const original = document.getElementById('printable-tax-invoice');
    if (!original) {
      setIsDownloading(false);
      return;
    }

    const scrollParent = original.closest('.invoice-preview-container');
    const prevScrollTop = scrollParent ? scrollParent.scrollTop : 0;
    const prevScrollLeft = scrollParent ? scrollParent.scrollLeft : 0;

    try {
      // Temporarily scroll to top-left so html2canvas captures from pixel 0, 0
      if (scrollParent) {
        scrollParent.scrollTop = 0;
        scrollParent.scrollLeft = 0;
      }

      // Add temporary export class to force standard A4 proportions during capture
      original.classList.add('exporting-pdf');

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      // Wait a frame for browser reflow with exporting-pdf class
      await new Promise((r) => setTimeout(r, 80));

      const canvas = await html2canvas(original, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const a4Ratio = pageHeight / pageWidth; // 297 / 210 ≈ 1.4142857
      const canvasRatio = canvas.height / canvas.width;

      // When the canvas matches A4 proportion, fill the exact A4 page (0, 0, 210, 297)
      // The invoice wrapper already has internal padding (8mm top, 10mm sides, 6mm bottom)
      // so content stays safely inset from paper boundaries with zero clipping.
      if (Math.abs(canvasRatio - a4Ratio) < 0.08) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      } else {
        let pdfW = pageWidth;
        let pdfH = pdfW * canvasRatio;
        if (pdfH > pageHeight) {
          pdfH = pageHeight;
          pdfW = pdfH / canvasRatio;
        }
        const x = (pageWidth - pdfW) / 2;
        const y = (pageHeight - pdfH) / 2;
        pdf.addImage(imgData, 'JPEG', x, y, pdfW, pdfH, undefined, 'FAST');
      }

      const invoiceNum = (invoice.invoiceNumber || 'TAX').replace(/[/\\?%*:|"<>]/g, '_');
      pdf.save(`Invoice_${invoiceNum}.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
      window.print();
    } finally {
      original.classList.remove('exporting-pdf');
      if (scrollParent) {
        scrollParent.scrollTop = prevScrollTop;
        scrollParent.scrollLeft = prevScrollLeft;
      }
      setIsDownloading(false);
    }
  };

  const totalQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const makingCharges = Number(invoice.makingCharges) || 0;

  const extraRowsCount = otherProductsList.length + (hallmarkAmount > 0 ? 1 : 0);
  // Adjusted spacer to ensure bottom box never overflows or clips A4 page
  const goodsSpacerHeight = Math.max(10, 110 - (items.length - 1) * 20 - extraRowsCount * 20);

  // Derived totals ensuring tax is strictly on gold/silver items, never on making charges, hallmark, or other products
  const itemsGoldTotal = items.reduce((acc, it) => acc + (Number(it.amount !== undefined ? it.amount : (Number(it.quantity) * Number(it.rate))) || 0), 0);
  const taxableValue = itemsGoldTotal > 0 ? itemsGoldTotal : (Number(invoice.taxableAmount) || 0);
  const cgstRate = Number(invoice.cgstRate) >= 0 ? Number(invoice.cgstRate) : 1.5;
  const sgstRate = Number(invoice.sgstRate) >= 0 ? Number(invoice.sgstRate) : 1.5;
  const cgstAmount = invoice.cgstAmount !== undefined && invoice.cgstAmount !== null
    ? Number(invoice.cgstAmount)
    : Math.round(taxableValue * (cgstRate / 100) * 100) / 100;
  const sgstAmount = invoice.sgstAmount !== undefined && invoice.sgstAmount !== null
    ? Number(invoice.sgstAmount)
    : Math.round(taxableValue * (sgstRate / 100) * 100) / 100;
  const totalTaxAmount = Math.round((cgstAmount + sgstAmount) * 100) / 100;

  // Final Payable Amount = Taxable Product Value + CGST + SGST + Making Charges + Hallmark Charges + Other Non-Taxable Products + Round Off
  const rawTotal = taxableValue + totalTaxAmount + makingCharges + hallmarkAmount + otherProductsTotal;
  const totalAmount = invoice.totalAmount !== undefined && invoice.totalAmount !== null && Number(invoice.totalAmount) > 0
    ? Number(invoice.totalAmount)
    : Math.round(rawTotal);
  const roundOff = invoice.roundOff !== undefined && invoice.roundOff !== null
    ? Number(invoice.roundOff)
    : Math.round((totalAmount - rawTotal) * 100) / 100;
  const amountInWords = invoice.amountInWords || convertNumberToWords(totalAmount);
  const taxAmountInWords = invoice.taxAmountInWords || convertNumberToWords(totalTaxAmount);

  return (
    <div className="modal-backdrop">
      <div className="modal-card invoice-view-modal-card">
        {/* Modal Top Actions Header (hidden during print) */}
        <div className="modal-actions-header no-print">
          <div className="modal-actions-top-row">
            <button onClick={onClose} className="btn-outline" style={{ fontSize: 'var(--text-sm)', padding: '0.45rem 0.85rem' }}>
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
            <button onClick={onClose} className="btn-icon" title="Close" style={{ width: '36px', height: '36px' }}>
              <X size={18} />
            </button>
          </div>

          {/* Big Screen Actions */}
          <div className="modal-actions-buttons-row desktop-actions-row">
            {onEdit && (
              <button
                onClick={() => onEdit(invoice)}
                className="btn-outline"
                style={{ fontSize: 'var(--text-sm)', padding: '0.45rem 0.85rem' }}
              >
                <Edit3 size={15} />
                <span>Edit Invoice</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="btn-outline"
              id="btn-print-tax-invoice"
              style={{ fontSize: 'var(--text-sm)', padding: '0.45rem 0.95rem' }}
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn-gold"
              id="btn-download-tax-invoice"
              style={{ fontSize: 'var(--text-sm)', padding: '0.45rem 0.95rem' }}
            >
              {isDownloading ? (
                <span className="mobile-download-spinner" />
              ) : (
                <Download size={16} />
              )}
              <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
          </div>

          {/* Mobile Dimension Devices Actions: 1. Edit Invoice, 2. Print, 3. Download (visible on screens <= 768px via CSS) */}
          <div className="modal-actions-buttons-row mobile-actions-row">
            {onEdit && (
              <button
                onClick={() => onEdit(invoice)}
                className="btn-outline mobile-action-btn"
                id="btn-mobile-edit-invoice"
              >
                <Edit3 size={15} />
                <span>Edit Invoice</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="btn-outline mobile-action-btn"
              id="btn-mobile-print-invoice"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn-gold mobile-action-btn"
              id="btn-mobile-download-invoice"
            >
              {isDownloading ? (
                <span className="mobile-download-spinner" />
              ) : (
                <Download size={15} />
              )}
              <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
            </button>
          </div>
        </div>

        {/* Invoice Desk Container with Responsive Scrolling */}
        <div className="invoice-preview-container">
          {/* EXACT PHYSICAL TAX INVOICE PAPER */}
          <div id="printable-tax-invoice" className="invoice-paper-wrapper">
            {/* Top Title Banner */}
            <div className="invoice-title-banner" style={{ position: 'relative', textAlign: 'center', marginBottom: '3px' }}>
              <h2 style={{
                fontSize: '15pt',
                fontWeight: 'bold',
                margin: 0,
                letterSpacing: '0.5px',
                color: '#000000',
              }}>
                Tax Invoice
              </h2>
              <span className="invoice-recipient-tag" style={{
                position: 'absolute',
                right: '8px',
                top: '2px',
                fontSize: '8.5pt',
                color: '#000000',
                whiteSpace: 'nowrap',
              }}>
                {invoice.subTitle || '(ORIGINAL FOR RECIPIENT)'}
              </span>
            </div>

            {/* Master Grid Table */}
            <table className="invoice-box-grid" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
              <tbody>
                {/* Row 1: Seller Details (Left) + Logistics 2-column Grid (Right) */}
                <tr>
                  {/* Left Column: Seller Details */}
                  <td style={{ width: '50%', verticalAlign: 'top', borderRight: '1px solid #000', padding: '6px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>
                      {seller.shopName || 'HOSSAIN JEWELLERS'}
                    </div>
                    <div style={{ fontSize: '9pt', marginTop: '2px', lineHeight: 1.25 }}>
                      {seller.address || 'Machibhanga, Kashipur, 24 Pgs (S), Kolkata- 700135'}
                    </div>
                    <div style={{ fontSize: '9pt', marginTop: '3px' }}>
                      <strong>GSTIN/UIN :</strong> {seller.gstin || '19EEFPM2064M1Z2'}
                    </div>
                    <div style={{ fontSize: '9pt' }}>
                      <strong>PAN/IT No :</strong> {seller.pan || 'EEFPM2064M'}
                    </div>
                    <div style={{ fontSize: '9pt' }}>
                      <strong>State Name :</strong> {seller.state || 'West Bengal'}
                    </div>
                  </td>

                  {/* Right Column: References Grid */}
                  <td style={{ width: '50%', padding: 0, verticalAlign: 'top' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', height: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '50%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Invoice No.</div>
                            <strong>{invoice.invoiceNumber || '—'}</strong>
                          </td>
                          <td style={{ width: '50%', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Dated</div>
                            <strong>{formatDate(invoice.invoiceDate)}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Delivery Note</div>
                            <div>{invoice.deliveryNote || ''}&nbsp;</div>
                          </td>
                          <td style={{ borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Mode/Terms of Payment</div>
                            <strong>{invoice.paymentMode || 'Cash'}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Supplier's Ref</div>
                            <div>{invoice.supplierRef || ''}&nbsp;</div>
                          </td>
                          <td style={{ borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Other Reference (S)</div>
                            <div>{(invoice.otherReferences || '').replace(/\[META:.*?\]/g, '').trim() || ''}&nbsp;</div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Buyer's Order No.</div>
                            <div>{invoice.buyerOrderNo || ''}&nbsp;</div>
                          </td>
                          <td style={{ borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Dated</div>
                            <div>{invoice.buyerOrderDate || ''}&nbsp;</div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Despatch Document No.</div>
                            <div>{invoice.despatchDocNo || ''}&nbsp;</div>
                          </td>
                          <td style={{ borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Delivery Note Date</div>
                            <div>{invoice.deliveryNoteDate || ''}&nbsp;</div>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Despatched through</div>
                            <div>{invoice.despatchedThrough || ''}&nbsp;</div>
                          </td>
                          <td style={{ borderBottom: '1px solid #000', padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Destination</div>
                            <div>{invoice.destination || ''}&nbsp;</div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2" style={{ padding: '3px 5px', fontSize: '8.5pt' }}>
                            <div style={{ color: '#222' }}>Terms of Delivery</div>
                            <div>{invoice.termsOfDelivery || ''}&nbsp;</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Row 2: Buyer Information Section */}
                <tr>
                  <td colSpan="2" style={{ padding: '6px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '9.5pt', marginBottom: '2px' }}>Buyer</div>
                    <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                      {buyer.name || 'Walk-in Customer'}
                    </div>
                    {buyer.address && (
                      <div style={{ fontSize: '9pt', lineHeight: 1.25 }}>{buyer.address}</div>
                    )}
                    {buyer.phone && (
                      <div style={{ fontSize: '8.5pt' }}>Phone: {buyer.phone}</div>
                    )}
                    <table style={{ marginTop: '4px', borderCollapse: 'collapse', width: '100%', maxWidth: '380px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '1px 0', border: 'none', width: '120px', fontSize: '9pt' }}>GSTIN/UIN</td>
                          <td style={{ padding: '1px 0', border: 'none', fontSize: '9pt' }}>: {buyer.gstin || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0', border: 'none', fontSize: '9pt' }}>PAN/IT No</td>
                          <td style={{ padding: '1px 0', border: 'none', fontSize: '9pt' }}>: {buyer.pan || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '1px 0', border: 'none', fontSize: '9pt' }}>State Name</td>
                          <td style={{ padding: '1px 0', border: 'none', fontSize: '9pt' }}>: {buyer.state || 'West Bengal'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Row 3: Description of Goods Table */}
                <tr>
                  <td colSpan="2" style={{ padding: 0, border: 'none' }}>
                    <table className="invoice-goods-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #000' }}>
                          <th style={{ width: '5%', textAlign: 'center' }}>Sl<br />No</th>
                          <th style={{ width: '43%', textAlign: 'center' }}>Description of Goods</th>
                          <th style={{ width: '10%', textAlign: 'center' }}>HSN/SAC</th>
                          <th style={{ width: '11%', textAlign: 'center' }}>Quantity</th>
                          <th style={{ width: '11%', textAlign: 'center' }}>Rate</th>
                          <th style={{ width: '6%', textAlign: 'center' }}>per</th>
                          <th style={{ width: '14%', textAlign: 'center' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} style={{ height: '22px' }}>
                            <td style={{ textAlign: 'center' }}>
                              {item.slNo || index + 1}
                            </td>
                            <td style={{ fontWeight: 'bold' }}>
                              {item.description || 'GOLD ORNAMENTS (916%)'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.hsnSac || '7113'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {Number(item.quantity).toFixed(3)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {formatCurrency(item.rate)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.per || 'gms'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                              {formatCurrency(item.amount !== undefined && item.amount !== null ? item.amount : (Number(item.quantity) * Number(item.rate)))}
                            </td>
                          </tr>
                        ))}

                        {/* Spacer between line items and output tax calculations */}
                        <tr className="goods-table-spacer" style={{ height: `${goodsSpacerHeight}px` }}>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>

                        {/* CGST Line Row */}
                        <tr style={{ height: '20px' }}>
                          <td></td>
                          <td style={{ textAlign: 'left', padding: '2px 5px', fontWeight: 'bold', fontSize: '9pt' }}>
                            OUTPUT CGST @ {cgstRate}%
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                            {formatCurrency(cgstAmount)}
                          </td>
                        </tr>

                        {/* SGST Line Row */}
                        <tr style={{ height: '20px' }}>
                          <td></td>
                          <td style={{ textAlign: 'left', padding: '2px 5px', fontWeight: 'bold', fontSize: '9pt' }}>
                            OUTPUT SGST @ {sgstRate}%
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                            {formatCurrency(sgstAmount)}
                          </td>
                        </tr>

                        {/* Making Charges Row (bottom of OUTPUT CGST & OUTPUT SGST) */}
                        <tr style={{ height: '20px' }}>
                          <td></td>
                          <td style={{ textAlign: 'left', padding: '2px 5px', fontWeight: 'bold', fontSize: '9pt' }}>
                            MAKING CHARGES
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                            {formatCurrency(makingCharges)}
                          </td>
                        </tr>

                        {/* Hallmark Charges Row (Non-Taxable, direct addition) */}
                        {hallmarkAmount > 0 && (
                          <tr style={{ height: '20px' }}>
                            <td></td>
                            <td style={{ textAlign: 'left', padding: '2px 5px', fontWeight: 'bold', fontSize: '9pt', color: '#111827' }}>
                              HALLMARK CHARGES
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                              {formatCurrency(hallmarkAmount)}
                            </td>
                          </tr>
                        )}

                        {/* Other Products Rows (Non-Taxable, direct addition) */}
                        {otherProductsList.map((op, idx) => (
                          <tr key={`other-prod-${idx}`} style={{ height: '20px' }}>
                            <td></td>
                            <td style={{ textAlign: 'left', padding: '2px 5px', fontWeight: 'bold', fontSize: '9pt', color: '#111827' }}>
                              {(op.name || 'OTHER PRODUCT').toUpperCase()}
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                              {formatCurrency(op.amount)}
                            </td>
                          </tr>
                        ))}

                        {/* ROUND OFF Line Row */}
                        <tr style={{ height: '20px' }}>
                          <td></td>
                          <td style={{ textAlign: 'left', padding: '2px 5px', fontWeight: 'bold', fontSize: '9pt' }}>
                            ROUND OFF
                          </td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                            {roundOff >= 0 ? formatCurrency(roundOff) : `-${formatCurrency(Math.abs(roundOff))}`}
                          </td>
                        </tr>

                        {/* Goods Table Total Row */}
                        <tr className="goods-total-row" style={{ fontWeight: 'bold' }}>
                          <td></td>
                          <td style={{ textAlign: 'left', padding: '3px 5px', fontWeight: 'bold', fontSize: '9.5pt' }}>
                            Total
                          </td>
                          <td></td>
                          <td style={{ textAlign: 'right' }}>
                            {totalQuantity.toFixed(3)}
                          </td>
                          <td></td>
                          <td style={{ textAlign: 'center' }}>
                            {items[0]?.per || 'gms'}
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '10.5pt' }}>
                            {formatCurrency(totalAmount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Row 4: Amount Chargeable in Words */}
                <tr>
                  <td colSpan="2" style={{ padding: '4px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <span style={{ fontSize: '8.5pt' }}>Amount Chargeable (in Words)</span>
                        <div style={{ fontWeight: 'bold', fontSize: '9pt', marginTop: '1px' }}>
                          {amountInWords}
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '8.5pt' }}>E. & O. E</div>
                    </div>
                  </td>
                </tr>

                {/* Row 5: Tax Breakdown Table */}
                <tr>
                  <td colSpan="2" style={{ padding: 0, border: 'none' }}>
                    <table className="invoice-inner-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', borderTop: 'none' }}>
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '15%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: '#f8f8f8' }}>
                          <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: 'none', borderLeft: 'none', textAlign: 'center', padding: '4px 2px', verticalAlign: 'middle', fontSize: '8.5pt' }}>
                            HSN/SAC
                          </th>
                          <th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: '4px 2px', verticalAlign: 'middle', fontSize: '8.5pt' }}>
                            Taxable Value
                          </th>
                          <th colSpan={2} className="invoice-compound-header" style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: 0, verticalAlign: 'top' }}>
                            <div style={{ borderBottom: '1px solid #000', padding: '2px 0', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'center' }}>
                              Central Tax
                            </div>
                            <div style={{ display: 'flex', width: '100%', margin: 0, padding: 0 }}>
                              <div style={{ width: '38.4615%', textAlign: 'center', borderRight: '1px solid #000', padding: '2px 0', fontSize: '8pt', boxSizing: 'border-box' }}>
                                Rate
                              </div>
                              <div style={{ width: '61.5385%', textAlign: 'center', padding: '2px 0', fontSize: '8pt', boxSizing: 'border-box' }}>
                                Amount
                              </div>
                            </div>
                          </th>
                          <th colSpan={2} className="invoice-compound-header" style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: 0, verticalAlign: 'top' }}>
                            <div style={{ borderBottom: '1px solid #000', padding: '2px 0', fontWeight: 'bold', fontSize: '8.5pt', textAlign: 'center' }}>
                              State Tax
                            </div>
                            <div style={{ display: 'flex', width: '100%', margin: 0, padding: 0 }}>
                              <div style={{ width: '38.4615%', textAlign: 'center', borderRight: '1px solid #000', padding: '2px 0', fontSize: '8pt', boxSizing: 'border-box' }}>
                                Rate
                              </div>
                              <div style={{ width: '61.5385%', textAlign: 'center', padding: '2px 0', fontSize: '8pt', boxSizing: 'border-box' }}>
                                Amount
                              </div>
                            </div>
                          </th>
                          <th style={{ borderBottom: '1px solid #000', borderTop: 'none', borderRight: 'none', textAlign: 'center', padding: '4px 2px', verticalAlign: 'middle', fontSize: '8.5pt' }}>
                            Total Tax Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ borderRight: '1px solid #000', borderLeft: 'none', textAlign: 'center', width: '15%', padding: '3px 4px' }}>
                            {items[0]?.hsnSac || '7113'}
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'right', width: '18%', padding: '3px 6px' }}>
                            {formatCurrency(taxableValue)}
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'center', width: '10%', padding: '3px 2px' }}>
                            {cgstRate}%
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'right', width: '16%', padding: '3px 6px' }}>
                            {formatCurrency(cgstAmount)}
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'center', width: '10%', padding: '3px 2px' }}>
                            {sgstRate}%
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'right', width: '16%', padding: '3px 6px' }}>
                            {formatCurrency(sgstAmount)}
                          </td>
                          <td style={{ borderRight: 'none', textAlign: 'right', width: '15%', padding: '3px 6px' }}>
                            {formatCurrency(totalTaxAmount)}
                          </td>
                        </tr>
                        {/* Total Row */}
                        <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 'bold', background: '#fafafa' }}>
                          <td style={{ borderRight: '1px solid #000', borderLeft: 'none', textAlign: 'left', paddingLeft: '8px' }}>
                            Total
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'right', padding: '3px 6px' }}>
                            {formatCurrency(taxableValue)}
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'center', color: '#666' }}>—</td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'right', padding: '3px 6px' }}>
                            {formatCurrency(cgstAmount)}
                          </td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'center', color: '#666' }}>—</td>
                          <td style={{ borderRight: '1px solid #000', textAlign: 'right', padding: '3px 6px' }}>
                            {formatCurrency(sgstAmount)}
                          </td>
                          <td style={{ borderRight: 'none', textAlign: 'right', padding: '3px 6px' }}>
                            {formatCurrency(totalTaxAmount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Row 6: Tax Amount in Words */}
                <tr>
                  <td colSpan="2" style={{ padding: '3px 8px', borderTop: '1px solid #000', borderBottom: '1px solid #000', fontSize: '8.5pt' }}>
                    <strong>Tax Amount (in words) : </strong>
                    <span>{taxAmountInWords}</span>
                  </td>
                </tr>

                {/* Row 7: Declaration & Bank Details */}
                <tr>
                  {/* Left: Declaration */}
                  <td style={{ width: '55%', borderRight: '1px solid #000', padding: '5px 8px', verticalAlign: 'top' }}>
                    <div style={{ textDecoration: 'underline', fontWeight: 'bold', fontSize: '8.5pt' }}>
                      Declaration
                    </div>
                    <div style={{ fontSize: '8pt', lineHeight: 1.25, marginTop: '2px' }}>
                      We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct
                    </div>
                    <div style={{ marginTop: '16px', fontWeight: 'bold', fontSize: '8.5pt' }}>
                      Customer's Seal and Signature
                    </div>
                  </td>

                  {/* Right: Bank Details & Authorised Signatory */}
                  <td style={{ width: '45%', padding: '5px 8px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '8.5pt', marginBottom: '2px' }}>
                      Company's Bank Details
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ border: 'none', padding: '1px 0', width: '80px' }}>Bank Name</td>
                          <td style={{ border: 'none', padding: '1px 0' }}>: {seller.bankName || 'Branch Lauhati'}</td>
                        </tr>
                        <tr>
                          <td style={{ border: 'none', padding: '1px 0' }}>A/c No.</td>
                          <td style={{ border: 'none', padding: '1px 0', fontWeight: 'bold' }}>: {seller.accountNo || '36540395042'}</td>
                        </tr>
                        <tr>
                          <td style={{ border: 'none', padding: '1px 0' }}>IFSC Code</td>
                          <td style={{ border: 'none', padding: '1px 0', fontWeight: 'bold' }}>: {seller.ifscCode || 'SBIN0006208'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ textAlign: 'right', marginTop: '6px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>
                        For. {seller.shopName || 'HOSSAIN JEWELLERS'}
                      </div>
                      <div style={{ height: '16px' }}></div>
                      <div style={{ fontWeight: 'bold', fontSize: '8.5pt' }}>
                        Authorised Signatory
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Centered Footer */}
            <div className="invoice-computer-footer">
              This is a Computer Generated Invoice
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
