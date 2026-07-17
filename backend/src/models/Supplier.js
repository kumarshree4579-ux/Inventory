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

module.exports = mongoose.model('Supplier', supplierSchema);
