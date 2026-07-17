const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', unique: true },
  storeName: String,
  storeAddress: String,
  storePhone: String,
  storeEmail: String,
  gstNumber: String,
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  invoicePrefix: { type: String, default: 'INV' },
  invoiceFormat: String,
  taxInclusive: { type: Boolean, default: false },
  logo: String,
  theme: { type: String, default: 'light' },
  sessionTimeout: { type: Number, default: 30 },
  lowStockThreshold: { type: Number, default: 10 },
  smtp: { host: String, port: Number, user: String, pass: String },
  sms: { provider: String, apiKey: String, senderId: String },
  whatsapp: { apiKey: String, phone: String },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
