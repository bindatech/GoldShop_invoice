const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    name: {
      type: String,
      default: 'Shopkeeper',
      trim: true,
    },
    shopDetails: {
      shopName: {
        type: String,
        default: 'BINDA JEWELLERS',
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
  },
  {
    timestamps: true,
  }
);

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
