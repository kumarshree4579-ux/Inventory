const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  name: { type: String, required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  printer: { type: mongoose.Schema.Types.ObjectId, ref: 'Printer' },
  openingCash: { type: Number, default: 0 },
  currentCash: { type: Number, default: 0 },
  closingCash: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed', 'inactive'], default: 'closed' },
  openedAt: Date,
  closedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Counter', counterSchema);
