const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: String,
  email: String,
  phone: { type: String, required: true },
  address: String,
  city: String,
  state: String,
  pincode: String,
  gstNumber: String,
  outstandingBalance: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Supplier', supplierSchema);
