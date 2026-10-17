const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  slNo: {
    type: Number,
    required: true,
    default: 1,
  },
  description: {
    type: String,
    required: [true, 'Description of goods is required'],
    default: 'GOLD ORNAMENTS (916%)',
  },
  metal: {
    type: String,
    enum: ['gold', 'silver', 'other'],
  },
  hsnSac: {
    type: String,
    default: '7113',
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity/Weight is required'],
    min: [0, 'Quantity must be positive'],
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate must be positive'],
  },
  per: {
    type: String,
    default: 'gms',
  },
  amount: {
    type: Number,
    default: 0,
  },
});

const otherProductSchema = new mongoose.Schema({
  slNo: {
    type: Number,
    default: 1,
  },
  name: {
    type: String,
    required: [true, 'Other product name is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    subTitle: {
      type: String,
      default: '(ORIGINAL FOR RECIPIENT)',
    },
    // Logistics & References as displayed on the Tax Invoice
    deliveryNote: { type: String, default: '' },
    paymentMode: { type: String, default: 'Cash' },
    supplierRef: { type: String, default: '' },
    otherReferences: { type: String, default: '' },
    buyerOrderNo: { type: String, default: '' },
    buyerOrderDate: { type: String, default: '' },
    despatchDocNo: { type: String, default: '' },
    deliveryNoteDate: { type: String, default: '' },
    despatchedThrough: { type: String, default: '' },
    destination: { type: String, default: '' },
    termsOfDelivery: { type: String, default: '' },

    // Buyer Information
    buyer: {
      name: {
        type: String,
        required: [true, 'Customer/Buyer name is required'],
        trim: true,
      },
      address: {
        type: String,
        default: '',
        trim: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
      gstin: {
        type: String,
        default: '',
        trim: true,
      },
      pan: {
        type: String,
        default: '',
        trim: true,
      },
      state: {
        type: String,
        default: 'West Bengal',
        trim: true,
      },
    },

    // Items
    items: [invoiceItemSchema],

    // Making Charges
    makingCharges: {
      type: Number,
      default: 0,
      min: [0, 'Making charges cannot be negative'],
    },

    // Hallmark Amount / Charges (non-taxable, added directly to total amount)
    hallmarkAmount: {
      type: Number,
      default: 0,
      min: [0, 'Hallmark amount cannot be negative'],
    },

    // Other Products (non-taxable, added directly to total amount)
    otherProducts: [otherProductSchema],
    otherProductsTotal: {
      type: Number,
      default: 0,
    },

    // Tax & Totals
    taxableAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    cgstRate: {
      type: Number,
      default: 1.5,
    },
    cgstAmount: {
      type: Number,
      default: 0,
    },
    sgstRate: {
      type: Number,
      default: 1.5,
    },
    sgstAmount: {
      type: Number,
      default: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    amountInWords: {
      type: String,
      default: '',
    },
    taxAmountInWords: {
      type: String,
      default: '',
    },

    // Seller & Bank Details Snapshot
    seller: {
      shopName: {
        type: String,
        default: 'HOSSAIN JEWELLERS',
      },
      address: {
        type: String,
        default: 'Machibhanga, Kashipur, 24 Pgs (S), Kolkata- 700135',
      },
      gstin: {
        type: String,
        default: '19EEFPM2064M1Z2',
      },
      pan: {
        type: String,
        default: 'EEFPM2064M',
      },
      state: {
        type: String,
        default: 'West Bengal',
      },
      bankName: {
        type: String,
        default: 'Branch Lauhati',
      },
      accountNo: {
        type: String,
        default: '36540395042',
      },
      ifscCode: {
        type: String,
        default: 'SBIN0006208',
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast debounced searches on customer name and invoice date
invoiceSchema.index({ 'buyer.name': 'text' });
invoiceSchema.index({ 'buyer.name': 1, invoiceDate: -1 });
invoiceSchema.index({ createdBy: 1, invoiceDate: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
