const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String },
  city: String,
  state: String,
  pincode: String,
  phone: String,
  email: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gstNumber: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
