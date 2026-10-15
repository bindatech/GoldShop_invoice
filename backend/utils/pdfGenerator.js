const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Format currency in Indian numbering format
 */
function formatCurrency(num) {
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date to DD-Mon-YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Capitalize string (Title Case)
 */
function capitalizeWords(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Draw vector Indian Rupee symbol fallback (₹)
 */
function drawIndianRupee(doc, x, y, size = 8.5) {
  doc.save();
  const s = size / 10;
  const w = 7.5 * s;
  const h = 10 * s;
  const bar1Y = y + 0.5 * s;
  const bar2Y = y + 3.2 * s;
  const stemX = x + 1.2 * s;
  const midY = y + 5.8 * s;
  const botY = y + h;
  doc.lineWidth(1.1 * s);
  doc.lineCap('round');
  doc.lineJoin('round');
  doc.strokeColor('#000000');
  doc.moveTo(x, bar1Y).lineTo(x + w, bar1Y).stroke();
  doc.moveTo(x, bar2Y).lineTo(x + w * 0.88, bar2Y).stroke();
  doc.moveTo(stemX, bar1Y).lineTo(stemX, midY).bezierCurveTo(x + w * 1.05, bar1Y + 0.5 * s, x + w * 1.05, midY, stemX, midY).stroke();
  doc.moveTo(stemX + 1.2 * s, midY - 0.2 * s).lineTo(x + w * 0.95, botY).stroke();
  doc.restore();
}

/**
 * Generate GST Tax Invoice PDF filling full A4 page cleanly
 */
function buildInvoicePDF(invoice, stream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 20,
    bufferPages: true,
    info: {
      Title: `Invoice_${invoice.invoiceNumber || 'TAX'}`,
      Author: invoice.seller?.shopName || 'HOSSAIN JEWELLERS',
      Subject: 'Official Tax Invoice',
    },
  });

  // Attempt to register TrueType font containing official Unicode Indian Rupee symbol (₹)
  let rupeeFontAvailable = false;
  const candidateFonts = [
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ];
  for (const fontPath of candidateFonts) {
    if (fs.existsSync(fontPath)) {
      try {
        doc.registerFont('RupeeFont', fontPath);
        rupeeFontAvailable = true;
        break;
      } catch (e) {}
    }
  }

  doc.pipe(stream);

  const startX = 20;
  let currentY = 20;
  const contentWidth = 555; // 595 - 40 margin
  const rightX = startX + contentWidth; // 575

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

  // ==========================================
  // 1. TOP TITLE BANNER (height = 24)
  // ==========================================
  const bannerHeight = 24;
  doc.rect(startX, currentY, contentWidth, bannerHeight).lineWidth(1).stroke('#000000');
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000');
  doc.text('Tax Invoice', startX, currentY + 5, { width: contentWidth, align: 'center' });

  doc.font('Helvetica').fontSize(8).fillColor('#222222');
  doc.text(invoice.subTitle || '(ORIGINAL FOR RECIPIENT)', startX, currentY + 8, {
    width: contentWidth - 10,
    align: 'right',
  });

  currentY += bannerHeight;

  // ==========================================
  // 2. SELLER & LOGISTICS (2 COLUMNS, height = 126)
  // ==========================================
  const col1Width = 275;
  const col2Width = contentWidth - col1Width; // 280
  const sellerBoxHeight = 126;

  // Outer border & middle vertical divider
  doc.rect(startX, currentY, contentWidth, sellerBoxHeight).lineWidth(0.75).stroke('#000000');
  doc.moveTo(startX + col1Width, currentY).lineTo(startX + col1Width, currentY + sellerBoxHeight).lineWidth(0.75).stroke('#000000');

  // --- Left Column: Seller info ---
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#000000');
  doc.text(seller.shopName || 'HOSSAIN JEWELLERS', startX + 7, currentY + 7);

  doc.font('Helvetica').fontSize(7.5).fillColor('#222222');
  doc.text(seller.address || '', startX + 7, currentY + 22, { width: col1Width - 14, lineGap: 1.5 });

  // Clean, evenly-spaced tax details
  let sY = currentY + 68;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
  doc.text('GSTIN/UIN  : ', startX + 7, sY, { continued: true });
  doc.font('Helvetica').text(seller.gstin || '19EEFPM2064M1Z2');

  sY += 15;
  doc.font('Helvetica-Bold').text('PAN/IT No  : ', startX + 7, sY, { continued: true });
  doc.font('Helvetica').text(seller.pan || 'EEFPM2064M');

  sY += 15;
  doc.font('Helvetica-Bold').text('State Name : ', startX + 7, sY, { continued: true });
  doc.font('Helvetica').text(seller.state || 'West Bengal');

  // --- Right Column: Logistics 2-column grid rows ---
  const gridRows = [
    { label1: 'Invoice No.', val1: invoice.invoiceNumber || '—', label2: 'Dated', val2: formatDate(invoice.invoiceDate) },
    { label1: 'Delivery Note', val1: invoice.deliveryNote || '—', label2: 'Mode/Terms of Payment', val2: invoice.paymentMode || 'Cash' },
    { label1: "Supplier's Ref", val1: invoice.supplierRef || '—', label2: 'Other Reference (S)', val2: invoice.otherReferences || '—' },
    { label1: "Buyer's Order No.", val1: invoice.buyerOrderNo || '—', label2: 'Dated', val2: formatDate(invoice.buyerOrderDate) },
    { label1: 'Despatch Doc No.', val1: invoice.despatchDocNo || '—', label2: 'Delivery Note Date', val2: formatDate(invoice.deliveryNoteDate) },
    { label1: 'Despatched through', val1: invoice.despatchedThrough || '—', label2: 'Destination', val2: invoice.destination || '—' },
    { label1: 'Terms of Delivery', val1: invoice.termsOfDelivery || '—', spanFull: true },
  ];

  const rowH = sellerBoxHeight / gridRows.length; // 18 pt per row
  const midX = startX + col1Width + (col2Width / 2);

  gridRows.forEach((r, idx) => {
    const rY = currentY + (idx * rowH);
    if (idx > 0) {
      doc.moveTo(startX + col1Width, rY).lineTo(rightX, rY).lineWidth(0.5).stroke('#000000');
    }

    if (r.spanFull) {
      doc.font('Helvetica').fontSize(6.5).fillColor('#444444').text(r.label1, startX + col1Width + 6, rY + 2.5);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text(r.val1 || '', startX + col1Width + 85, rY + 2.5);
    } else {
      // vertical divider between left and right cell
      doc.moveTo(midX, rY).lineTo(midX, rY + rowH).lineWidth(0.5).stroke('#000000');

      // Left cell
      doc.font('Helvetica').fontSize(6.5).fillColor('#444444').text(r.label1, startX + col1Width + 6, rY + 2);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text(r.val1 || '', startX + col1Width + 6, rY + 9, {
        width: (col2Width / 2) - 10,
        ellipsis: true,
      });

      // Right cell
      doc.font('Helvetica').fontSize(6.5).fillColor('#444444').text(r.label2, midX + 6, rY + 2);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text(r.val2 || '', midX + 6, rY + 9, {
        width: (col2Width / 2) - 10,
        ellipsis: true,
      });
    }
  });

  currentY += sellerBoxHeight;

  // ==========================================
  // 3. BUYER DETAILS (height = 68)
  // ==========================================
  const buyerBoxHeight = 68;
  doc.rect(startX, currentY, contentWidth, buyerBoxHeight).lineWidth(0.75).stroke('#000000');

  const buyerName = capitalizeWords(buyer.name || 'Walk-in Customer');
  doc.font('Helvetica').fontSize(7).fillColor('#555555').text('Buyer', startX + 7, currentY + 5);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(buyerName, startX + 7, currentY + 16);

  if (buyer.address) {
    doc.font('Helvetica').fontSize(7.5).fillColor('#222222').text(buyer.address, startX + 7, currentY + 29, {
      width: 290,
      lineGap: 1.5,
    });
  }

  // Structured key-value columns for buyer tax & contact details (No hanging delimiters)
  const buyerCol1X = startX + 7;
  const buyerCol2X = startX + 165;
  const buyerCol3X = startX + 330;
  const buyerTaxY = currentY + 48;

  if (buyer.phone) {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text('Phone: ', buyerCol1X, buyerTaxY, { continued: true });
    doc.font('Helvetica').text(`+91 ${buyer.phone}`);
  }

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text('GSTIN/UIN: ', buyerCol2X, buyerTaxY, { continued: true });
  doc.font('Helvetica').text(buyer.gstin || '—');

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text('State: ', buyerCol3X, buyerTaxY, { continued: true });
  doc.font('Helvetica').text(buyer.state || 'West Bengal');

  currentY += buyerBoxHeight;

  // ==========================================
  // 4. ITEMS & DESCRIPTION OF GOODS TABLE
  // ==========================================
  // Column definitions (Sum = 555 exact)
  // 0: Sl No       (30)
  // 1: Description (245)
  // 2: HSN/SAC     (50)
  // 3: Quantity    (55)
  // 4: Rate        (60)
  // 5: per         (35)
  // 6: Amount      (80)
  const cols = [
    { x: startX, w: 30, align: 'center', label: 'Sl\nNo' },
    { x: startX + 30, w: 245, align: 'left', label: 'Description of Goods' },
    { x: startX + 30 + 245, w: 50, align: 'center', label: 'HSN/SAC' },
    { x: startX + 30 + 245 + 50, w: 55, align: 'right', label: 'Quantity' },
    { x: startX + 30 + 245 + 50 + 55, w: 60, align: 'right', label: 'Rate' },
    { x: startX + 30 + 245 + 50 + 55 + 60, w: 35, align: 'center', label: 'per' },
    { x: startX + 30 + 245 + 50 + 55 + 60 + 35, w: 80, align: 'right', label: 'Amount' },
  ];

  const theadHeight = 22;
  doc.rect(startX, currentY, contentWidth, theadHeight).fillAndStroke('#f3f3f3', '#000000');

  // Header vertical divider lines
  cols.slice(1).forEach((c) => {
    doc.moveTo(c.x, currentY).lineTo(c.x, currentY + theadHeight).lineWidth(0.5).stroke('#000000');
  });

  // Header labels with clean alignment
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
  cols.forEach((c) => {
    if (c.label.includes('\n')) {
      doc.text(c.label, c.x + 2, currentY + 3, { width: c.w - 4, align: c.align, lineGap: 0.5 });
    } else {
      doc.text(c.label, c.x + 4, currentY + 7, { width: c.w - 8, align: c.align });
    }
  });

  currentY += theadHeight;

  // Table body container: Generously expanded to 290pt so invoice fills A4 sheet
  const itemsSectionHeight = 290;
  doc.rect(startX, currentY, contentWidth, itemsSectionHeight).lineWidth(0.75).stroke('#000000');

  // Draw inner vertical dividers in solid black with consistent line width
  cols.slice(1).forEach((c) => {
    doc.moveTo(c.x, currentY).lineTo(c.x, currentY + itemsSectionHeight).lineWidth(0.5).stroke('#000000');
  });

  // Render line items
  let itemRowY = currentY + 6;
  let totalQty = 0;

  items.forEach((item, idx) => {
    const qty = Number(item.quantity) || 0;
    totalQty += qty;

    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    // Sl No
    doc.text(String(item.slNo || idx + 1), cols[0].x + 2, itemRowY, { width: cols[0].w - 4, align: 'center' });
    // Description
    doc.font('Helvetica-Bold').text(item.description || 'GOLD ORNAMENTS (916%)', cols[1].x + 6, itemRowY, {
      width: cols[1].w - 12,
      align: 'left',
    });
    // HSN
    doc.font('Helvetica').text(item.hsnSac || '7113', cols[2].x + 2, itemRowY, { width: cols[2].w - 4, align: 'center' });
    // Quantity
    doc.text(qty.toFixed(3), cols[3].x + 2, itemRowY, { width: cols[3].w - 8, align: 'right' });
    // Rate
    doc.text(formatCurrency(item.rate), cols[4].x + 2, itemRowY, { width: cols[4].w - 8, align: 'right' });
    // Per
    doc.text(item.per || 'gms', cols[5].x + 2, itemRowY, { width: cols[5].w - 4, align: 'center' });
    // Amount (with comfortable right padding so text never touches border)
    doc.font('Helvetica-Bold').text(formatCurrency(item.amount), cols[6].x + 2, itemRowY, {
      width: cols[6].w - 8,
      align: 'right',
    });

    itemRowY += 18;
  });

  // Position Output Tax section neatly at bottom of items body
  const taxY = currentY + itemsSectionHeight - 78;

  // Thin separator above making charges / tax section
  doc.moveTo(startX, taxY).lineTo(rightX, taxY).lineWidth(0.5).stroke('#000000');

  // OUTPUT CGST (no space in CGST)
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
  doc.text(`OUTPUT CGST @ ${invoice.cgstRate || 1.5}%`, cols[1].x + 6, taxY + 6);
  doc.text(formatCurrency(invoice.cgstAmount), cols[6].x + 2, taxY + 6, { width: cols[6].w - 8, align: 'right' });

  // OUTPUT SGST (no space in SGST)
  doc.text(`OUTPUT SGST @ ${invoice.sgstRate || 1.5}%`, cols[1].x + 6, taxY + 22);
  doc.text(formatCurrency(invoice.sgstAmount), cols[6].x + 2, taxY + 22, { width: cols[6].w - 8, align: 'right' });

  // MAKING CHARGES (bottom of output cgst and output sgst text portion)
  doc.text('MAKING CHARGES', cols[1].x + 6, taxY + 38);
  doc.text(formatCurrency(invoice.makingCharges || 0), cols[6].x + 2, taxY + 38, { width: cols[6].w - 8, align: 'right' });

  // Round off row
  doc.font('Helvetica').fontSize(8);
  doc.text('ROUND OFF', cols[1].x + 6, taxY + 54);
  const roundOffVal = Number(invoice.roundOff) || 0;
  const roundOffText = roundOffVal >= 0 ? formatCurrency(roundOffVal) : `-${formatCurrency(Math.abs(roundOffVal))}`;
  doc.text(roundOffText, cols[6].x + 2, taxY + 54, { width: cols[6].w - 8, align: 'right' });

  currentY += itemsSectionHeight;

  // --- Total Goods Row (height = 20) ---
  const totalRowHeight = 20;
  doc.rect(startX, currentY, contentWidth, totalRowHeight).fillAndStroke('#f8f8f8', '#000000');

  // Dividers for total row
  cols.slice(1).forEach((c) => {
    doc.moveTo(c.x, currentY).lineTo(c.x, currentY + totalRowHeight).lineWidth(0.5).stroke('#000000');
  });

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
  doc.text('Total', cols[1].x + 6, currentY + 5.5);
  doc.text(totalQty.toFixed(3), cols[3].x + 2, currentY + 5.5, { width: cols[3].w - 8, align: 'right' });
  doc.text(items[0]?.per || 'gms', cols[5].x + 2, currentY + 5.5, { width: cols[5].w - 4, align: 'center' });

  // Total amount: rendered with official Indian Rupee currency logo
  const totalAmountStr = formatCurrency(invoice.totalAmount);
  if (rupeeFontAvailable) {
    doc.font('RupeeFont').fontSize(9.5).fillColor('#000000').text(`₹ ${totalAmountStr}`, cols[6].x + 2, currentY + 5, {
      width: cols[6].w - 8,
      align: 'right',
    });
  } else {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000');
    const amountW = doc.widthOfString(totalAmountStr);
    const rightEdge = cols[6].x + cols[6].w - 8;
    const textX = rightEdge - amountW;
    drawIndianRupee(doc, textX - 11, currentY + 5.5, 8.5);
    doc.text(totalAmountStr, textX, currentY + 5);
  }

  currentY += totalRowHeight;

  // ==========================================
  // 5. AMOUNT IN WORDS (height = 24)
  // ==========================================
  const wordsHeight = 24;
  doc.rect(startX, currentY, contentWidth, wordsHeight).lineWidth(0.75).stroke('#000000');
  doc.font('Helvetica').fontSize(6.5).fillColor('#555555').text('Amount Chargeable (in Words)', startX + 7, currentY + 3);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text(invoice.amountInWords || '—', startX + 7, currentY + 12);
  doc.font('Helvetica-Bold').fontSize(7.5).text('E. & O. E', rightX - 60, currentY + 7);

  currentY += wordsHeight;

  // ==========================================
  // 6. TAX BREAKDOWN TABLE (Full Official Two-Tier Compound Header)
  // ==========================================
  // Column widths (Sum = 555 exact)
  // 0: HSN/SAC       (80)  x = 20
  // 1: Taxable Value (100) x = 100
  // 2: CGST Rate     (45)  x = 200
  // 3: CGST Amount   (80)  x = 245  (Central Tax = 125)
  // 4: SGST Rate     (45)  x = 325
  // 5: SGST Amount   (80)  x = 370  (State Tax = 125)
  // 6: Total Tax     (125) x = 450
  const taxCols = [
    { x: startX, w: 80, align: 'center', label: 'HSN/SAC' },
    { x: startX + 80, w: 100, align: 'right', label: 'Taxable Value' },
    { x: startX + 80 + 100, w: 45, align: 'center', label: 'Rate' },
    { x: startX + 80 + 100 + 45, w: 80, align: 'right', label: 'Amount' },
    { x: startX + 80 + 100 + 45 + 80, w: 45, align: 'center', label: 'Rate' },
    { x: startX + 80 + 100 + 45 + 80 + 45, w: 80, align: 'right', label: 'Amount' },
    { x: startX + 80 + 100 + 45 + 80 + 45 + 80, w: 125, align: 'right', label: 'Total Tax Amount' },
  ];

  const taxHeadH = 26; // Two-tier header height
  doc.rect(startX, currentY, contentWidth, taxHeadH).fillAndStroke('#f3f3f3', '#000000');

  // Upper horizontal divider between Central/State group headers and Rate/Amount sub-headers
  doc.moveTo(startX + 180, currentY + 13).lineTo(startX + 430, currentY + 13).lineWidth(0.5).stroke('#000000');

  // Vertical dividers for the header
  doc.moveTo(startX + 80, currentY).lineTo(startX + 80, currentY + taxHeadH).lineWidth(0.5).stroke('#000000');
  doc.moveTo(startX + 180, currentY).lineTo(startX + 180, currentY + taxHeadH).lineWidth(0.5).stroke('#000000');
  doc.moveTo(startX + 225, currentY + 13).lineTo(startX + 225, currentY + taxHeadH).lineWidth(0.5).stroke('#000000');
  doc.moveTo(startX + 305, currentY).lineTo(startX + 305, currentY + taxHeadH).lineWidth(0.5).stroke('#000000');
  doc.moveTo(startX + 350, currentY + 13).lineTo(startX + 350, currentY + taxHeadH).lineWidth(0.5).stroke('#000000');
  doc.moveTo(startX + 430, currentY).lineTo(startX + 430, currentY + taxHeadH).lineWidth(0.5).stroke('#000000');

  // Header Texts
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
  doc.text('HSN/SAC', taxCols[0].x + 2, currentY + 9, { width: taxCols[0].w - 4, align: 'center' });
  doc.text('Taxable Value', taxCols[1].x + 2, currentY + 9, { width: taxCols[1].w - 8, align: 'right' });

  // Central Tax Group Header
  doc.text('Central Tax', startX + 180, currentY + 3, { width: 125, align: 'center' });
  doc.fontSize(7).text('Rate', taxCols[2].x + 2, currentY + 16, { width: taxCols[2].w - 4, align: 'center' });
  doc.text('Amount', taxCols[3].x + 2, currentY + 16, { width: taxCols[3].w - 8, align: 'right' });

  // State Tax Group Header
  doc.fontSize(7.5).text('State Tax', startX + 305, currentY + 3, { width: 125, align: 'center' });
  doc.fontSize(7).text('Rate', taxCols[4].x + 2, currentY + 16, { width: taxCols[4].w - 4, align: 'center' });
  doc.text('Amount', taxCols[5].x + 2, currentY + 16, { width: taxCols[5].w - 8, align: 'right' });

  doc.fontSize(7.5).text('Total Tax Amount', taxCols[6].x + 2, currentY + 9, { width: taxCols[6].w - 8, align: 'right' });

  currentY += taxHeadH;

  // --- Tax Body Row (height = 18) ---
  const taxBodyH = 18;
  doc.rect(startX, currentY, contentWidth, taxBodyH).lineWidth(0.75).stroke('#000000');

  // Complete vertical gridlines across data row
  [80, 180, 225, 305, 350, 430].forEach((offset) => {
    doc.moveTo(startX + offset, currentY).lineTo(startX + offset, currentY + taxBodyH).lineWidth(0.5).stroke('#000000');
  });

  const totalTaxAmount = (Number(invoice.cgstAmount) || 0) + (Number(invoice.sgstAmount) || 0);
  doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
  doc.text(items[0]?.hsnSac || '7113', taxCols[0].x + 2, currentY + 5, { width: taxCols[0].w - 4, align: 'center' });
  doc.text(formatCurrency(invoice.taxableAmount), taxCols[1].x + 2, currentY + 5, { width: taxCols[1].w - 8, align: 'right' });
  doc.text(`${invoice.cgstRate || 1.5}%`, taxCols[2].x + 2, currentY + 5, { width: taxCols[2].w - 4, align: 'center' });
  doc.text(formatCurrency(invoice.cgstAmount), taxCols[3].x + 2, currentY + 5, { width: taxCols[3].w - 8, align: 'right' });
  doc.text(`${invoice.sgstRate || 1.5}%`, taxCols[4].x + 2, currentY + 5, { width: taxCols[4].w - 4, align: 'center' });
  doc.text(formatCurrency(invoice.sgstAmount), taxCols[5].x + 2, currentY + 5, { width: taxCols[5].w - 8, align: 'right' });
  doc.font('Helvetica-Bold').text(formatCurrency(totalTaxAmount), taxCols[6].x + 2, currentY + 5, {
    width: taxCols[6].w - 8,
    align: 'right',
  });

  currentY += taxBodyH;

  // --- Tax Summary / Total Row (height = 18) ---
  const taxTotalH = 18;
  doc.rect(startX, currentY, contentWidth, taxTotalH).fillAndStroke('#fafafa', '#000000');

  // Complete vertical gridlines across total row
  [80, 180, 225, 305, 350, 430].forEach((offset) => {
    doc.moveTo(startX + offset, currentY).lineTo(startX + offset, currentY + taxTotalH).lineWidth(0.5).stroke('#000000');
  });

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
  doc.text('Total', taxCols[0].x + 2, currentY + 5, { width: taxCols[0].w - 4, align: 'center' });
  doc.text(formatCurrency(invoice.taxableAmount), taxCols[1].x + 2, currentY + 5, { width: taxCols[1].w - 8, align: 'right' });
  doc.font('Helvetica').fontSize(8).text('—', taxCols[2].x + 2, currentY + 5, { width: taxCols[2].w - 4, align: 'center' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.cgstAmount), taxCols[3].x + 2, currentY + 5, { width: taxCols[3].w - 8, align: 'right' });
  doc.font('Helvetica').text('—', taxCols[4].x + 2, currentY + 5, { width: taxCols[4].w - 4, align: 'center' });
  doc.font('Helvetica-Bold').text(formatCurrency(invoice.sgstAmount), taxCols[5].x + 2, currentY + 5, { width: taxCols[5].w - 8, align: 'right' });
  doc.text(formatCurrency(totalTaxAmount), taxCols[6].x + 2, currentY + 5, { width: taxCols[6].w - 8, align: 'right' });

  currentY += taxTotalH;

  // ==========================================
  // 7. TAX AMOUNT IN WORDS (height = 18)
  // ==========================================
  const taxWordsH = 18;
  doc.rect(startX, currentY, contentWidth, taxWordsH).lineWidth(0.75).stroke('#000000');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
  doc.text('Tax Amount (in words) : ', startX + 7, currentY + 5, { continued: true });
  doc.font('Helvetica').text(invoice.taxAmountInWords || '—');

  currentY += taxWordsH;

  // ==========================================
  // 8. DECLARATION & BANK DETAILS / SIGNATURE (height = 92)
  // ==========================================
  const footerBoxH = 92;
  doc.rect(startX, currentY, contentWidth, footerBoxH).lineWidth(0.75).stroke('#000000');
  doc.moveTo(startX + 295, currentY).lineTo(startX + 295, currentY + footerBoxH).lineWidth(0.75).stroke('#000000');

  // Left Column: Declaration
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text('Declaration', startX + 7, currentY + 6, { underline: true });
  doc.font('Helvetica').fontSize(7).fillColor('#333333').text(
    'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    startX + 7,
    currentY + 20,
    { width: 280, lineGap: 2 }
  );
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text("Customer's Seal and Signature", startX + 7, currentY + 75);

  // Right Column: Bank Details & Authorized Signatory with ample signature clearance
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text("Company's Bank Details", startX + 302, currentY + 6);
  doc.font('Helvetica').fontSize(7.5).fillColor('#333333');
  doc.text(`Bank Name  :  ${seller.bankName || 'Branch Lauhati'}`, startX + 302, currentY + 18);
  doc.font('Helvetica-Bold').text(`A/c No.        :  ${seller.accountNo || '36540395042'}`, startX + 302, currentY + 29);
  doc.text(`IFSC Code   :  ${seller.ifscCode || 'SBIN0006208'}`, startX + 302, currentY + 40);

  // Signatory: Clear 22pt gap between "For. Shop" and "Authorised Signatory"
  doc.font('Helvetica-Bold').fontSize(8.5).text(`For. ${seller.shopName || 'HOSSAIN JEWELLERS'}`, startX + 302, currentY + 54, {
    width: contentWidth - 308,
    align: 'right',
  });
  doc.font('Helvetica-Bold').fontSize(8).text('Authorised Signatory', startX + 302, currentY + 75, {
    width: contentWidth - 308,
    align: 'right',
  });

  currentY += footerBoxH;

  // ==========================================
  // 9. FOOTER NOTICE
  // ==========================================
  doc.font('Helvetica-Oblique').fontSize(7).fillColor('#666666').text(
    'This is a Computer Generated Invoice',
    startX,
    currentY + 6,
    { width: contentWidth, align: 'center' }
  );

  doc.end();
}

module.exports = { buildInvoicePDF };
