const Invoice = require('../models/Invoice');
const { convertNumberToWordsIndian } = require('../utils/numberToWords');
const { buildInvoicePDF } = require('../utils/pdfGenerator');

// Helper to generate invoice number
const generateNextInvoiceNumber = async (userId) => {
  const count = await Invoice.countDocuments({ createdBy: userId });
  const year = new Date().getFullYear();
  const nextNumber = String(count + 1).padStart(4, '0');
  return `HJ/${year}/${nextNumber}`;
};

// Helper to calculate totals
const calculateInvoiceTotals = (
  items,
  customCgstRate = 1.5,
  customSgstRate = 1.5,
  customMakingCharges = 0
) => {
  let itemsTotal = 0;

  const processedItems = items.map((item, index) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemAmount = Math.round(qty * rate * 100) / 100;
    itemsTotal += itemAmount;

    return {
      slNo: item.slNo || index + 1,
      description: item.description || 'GOLD ORNAMENTS (916%)',
      hsnSac: item.hsnSac || '7113',
      quantity: qty,
      rate: rate,
      per: item.per || 'gms',
      amount: itemAmount,
    };
  });

  itemsTotal = Math.round(itemsTotal * 100) / 100;
  const makingCharges = Math.max(0, Math.round((Number(customMakingCharges) || 0) * 100) / 100);
  // Tax is not calculated on making charges; taxable amount is itemsTotal
  const taxableAmount = itemsTotal;

  const cgstRate = Number(customCgstRate) >= 0 ? Number(customCgstRate) : 1.5;
  const sgstRate = Number(customSgstRate) >= 0 ? Number(customSgstRate) : 1.5;

  const cgstAmount = Math.round(taxableAmount * (cgstRate / 100) * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * (sgstRate / 100) * 100) / 100;

  const totalTaxAmount = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  // Total amount includes taxable items + total taxes + making charges
  const rawTotal = taxableAmount + totalTaxAmount + makingCharges;
  const totalAmount = Math.round(rawTotal);
  const roundOff = Math.round((totalAmount - rawTotal) * 100) / 100;

  const amountInWords = convertNumberToWordsIndian(totalAmount);
  const taxAmountInWords = convertNumberToWordsIndian(totalTaxAmount);

  return {
    items: processedItems,
    makingCharges,
    itemsTotal,
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    roundOff,
    totalAmount,
    amountInWords,
    taxAmountInWords,
  };
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const {
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
      buyer,
      items,
      makingCharges,
      cgstRate,
      sgstRate,
      seller,
    } = req.body;

    if (!buyer || !buyer.name || !buyer.name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer / Buyer name is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required in the invoice',
      });
    }

    const calculated = calculateInvoiceTotals(items, cgstRate, sgstRate, makingCharges);

    const invNum =
      invoiceNumber && invoiceNumber.trim()
        ? invoiceNumber.trim()
        : await generateNextInvoiceNumber(req.user._id);

    const shopProfile = req.user.shopDetails || {};
    const finalSeller = {
      shopName: seller?.shopName || shopProfile.shopName || 'HOSSAIN JEWELLERS',
      address:
        seller?.address ||
        shopProfile.address ||
        'Machibhanga, Kashipur, 24 Pgs (S), Kolkata- 700135',
      gstin: seller?.gstin || shopProfile.gstin || '19EEFPM2064M1Z2',
      pan: seller?.pan || shopProfile.pan || 'EEFPM2064M',
      state: seller?.state || shopProfile.state || 'West Bengal',
      bankName: seller?.bankName || shopProfile.bankName || 'Branch Lauhati',
      accountNo: seller?.accountNo || shopProfile.accountNo || '36540395042',
      ifscCode: seller?.ifscCode || shopProfile.ifscCode || 'SBIN0006208',
    };

    const invoice = await Invoice.create({
      invoiceNumber: invNum,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      subTitle: subTitle || '(ORIGINAL FOR RECIPIENT)',
      deliveryNote: deliveryNote || '',
      paymentMode: paymentMode || 'Cash',
      supplierRef: supplierRef || '',
      otherReferences: otherReferences || '',
      buyerOrderNo: buyerOrderNo || '',
      buyerOrderDate: buyerOrderDate || '',
      despatchDocNo: despatchDocNo || '',
      deliveryNoteDate: deliveryNoteDate || '',
      despatchedThrough: despatchedThrough || '',
      destination: destination || '',
      termsOfDelivery: termsOfDelivery || '',
      buyer: {
        name: buyer.name.trim(),
        address: buyer.address ? buyer.address.trim() : '',
        phone: buyer.phone ? buyer.phone.trim() : '',
        gstin: buyer.gstin ? buyer.gstin.trim() : '',
        pan: buyer.pan ? buyer.pan.trim() : '',
        state: buyer.state ? buyer.state.trim() : 'West Bengal',
      },
      items: calculated.items,
      makingCharges: calculated.makingCharges,
      taxableAmount: calculated.taxableAmount,
      cgstRate: calculated.cgstRate,
      cgstAmount: calculated.cgstAmount,
      sgstRate: calculated.sgstRate,
      sgstAmount: calculated.sgstAmount,
      roundOff: calculated.roundOff,
      totalAmount: calculated.totalAmount,
      amountInWords: calculated.amountInWords,
      taxAmountInWords: calculated.taxAmountInWords,
      seller: finalSeller,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create invoice',
    });
  }
};

// @desc    Get all invoices with debounced search & optional date filter
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const { search, date, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { createdBy: req.user._id };

    // Search by customer name or invoice number
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'buyer.name': searchRegex },
        { invoiceNumber: searchRegex },
        { 'buyer.phone': searchRegex },
      ];
    }

    // Optional Date filtering
    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        query.invoiceDate = { $gte: startOfDay, $lte: endOfDay };
      }
    } else if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        query.invoiceDate.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = eDate;
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Invoice.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      invoices,
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoices',
    });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice',
    });
  }
};

// @desc    Edit / Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const {
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
      buyer,
      items,
      makingCharges,
      cgstRate,
      sgstRate,
      seller,
    } = req.body;

    if (buyer && buyer.name) {
      invoice.buyer = {
        name: buyer.name.trim(),
        address: buyer.address ? buyer.address.trim() : invoice.buyer.address,
        phone: buyer.phone ? buyer.phone.trim() : invoice.buyer.phone,
        gstin: buyer.gstin ? buyer.gstin.trim() : invoice.buyer.gstin,
        pan: buyer.pan ? buyer.pan.trim() : invoice.buyer.pan,
        state: buyer.state ? buyer.state.trim() : invoice.buyer.state,
      };
    }

    if (invoiceNumber) invoice.invoiceNumber = invoiceNumber.trim();
    if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
    if (subTitle !== undefined) invoice.subTitle = subTitle;
    if (deliveryNote !== undefined) invoice.deliveryNote = deliveryNote;
    if (paymentMode !== undefined) invoice.paymentMode = paymentMode;
    if (supplierRef !== undefined) invoice.supplierRef = supplierRef;
    if (otherReferences !== undefined) invoice.otherReferences = otherReferences;
    if (buyerOrderNo !== undefined) invoice.buyerOrderNo = buyerOrderNo;
    if (buyerOrderDate !== undefined) invoice.buyerOrderDate = buyerOrderDate;
    if (despatchDocNo !== undefined) invoice.despatchDocNo = despatchDocNo;
    if (deliveryNoteDate !== undefined) invoice.deliveryNoteDate = deliveryNoteDate;
    if (despatchedThrough !== undefined) invoice.despatchedThrough = despatchedThrough;
    if (destination !== undefined) invoice.destination = destination;
    if (termsOfDelivery !== undefined) invoice.termsOfDelivery = termsOfDelivery;

    if (seller) {
      invoice.seller = {
        ...invoice.seller.toObject(),
        ...seller,
      };
    }

    if (
      (items && Array.isArray(items) && items.length > 0) ||
      makingCharges !== undefined
    ) {
      const itemsToCalculate = items && Array.isArray(items) && items.length > 0 ? items : invoice.items;
      const calculated = calculateInvoiceTotals(
        itemsToCalculate,
        cgstRate !== undefined ? cgstRate : invoice.cgstRate,
        sgstRate !== undefined ? sgstRate : invoice.sgstRate,
        makingCharges !== undefined ? makingCharges : invoice.makingCharges
      );

      invoice.items = calculated.items;
      invoice.makingCharges = calculated.makingCharges;
      invoice.taxableAmount = calculated.taxableAmount;
      invoice.cgstRate = calculated.cgstRate;
      invoice.cgstAmount = calculated.cgstAmount;
      invoice.sgstRate = calculated.sgstRate;
      invoice.sgstAmount = calculated.sgstAmount;
      invoice.roundOff = calculated.roundOff;
      invoice.totalAmount = calculated.totalAmount;
      invoice.amountInWords = calculated.amountInWords;
      invoice.taxAmountInWords = calculated.taxAmountInWords;
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      invoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update invoice',
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
    });
  }
};

// @desc    Debounced search for existing customers
// @route   GET /api/invoices/customers/search
// @access  Private
exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, customers: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const matchingInvoices = await Invoice.aggregate([
      {
        $match: {
          createdBy: req.user._id,
          'buyer.name': regex,
        },
      },
      {
        $group: {
          _id: { $toLower: '$buyer.name' },
          name: { $first: '$buyer.name' },
          address: { $first: '$buyer.address' },
          phone: { $first: '$buyer.phone' },
          gstin: { $first: '$buyer.gstin' },
          pan: { $first: '$buyer.pan' },
          state: { $first: '$buyer.state' },
          lastInvoiceDate: { $max: '$invoiceDate' },
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: { lastInvoiceDate: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      customers: matchingInvoices,
    });
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search customers',
    });
  }
};

// @desc    Download invoice as official PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
exports.downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const safeNumber = (invoice.invoiceNumber || 'TAX').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `Invoice_${safeNumber}.pdf`;

    // Ensure calculation is strictly without tax on making charges
    const calculated = calculateInvoiceTotals(
      invoice.items,
      invoice.cgstRate,
      invoice.sgstRate,
      invoice.makingCharges
    );

    const normalizedInvoice = {
      ...invoice.toObject(),
      items: calculated.items,
      makingCharges: calculated.makingCharges,
      taxableAmount: calculated.taxableAmount,
      cgstRate: calculated.cgstRate,
      cgstAmount: calculated.cgstAmount,
      sgstRate: calculated.sgstRate,
      sgstAmount: calculated.sgstAmount,
      roundOff: calculated.roundOff,
      totalAmount: calculated.totalAmount,
      amountInWords: calculated.amountInWords,
      taxAmountInWords: calculated.taxAmountInWords,
    };

    // Set Content-Type header to application/pdf
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream PDF directly to client response
    buildInvoicePDF(normalizedInvoice, res);
  } catch (error) {
    console.error('Download PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate PDF',
      });
    }
  }
};
