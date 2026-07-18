const mongoose = require('mongoose');

const cashDrawerSchema = new mongoose.Schema({
  counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  date: { type: Date, default: Date.now },
  openingCash: { type: Number, required: true },
  cashIn: { type: Number, default: 0 },
  cashOut: { type: Number, default: 0 },
  expenses: { type: Number, default: 0 },
  closingCash: { type: Number, default: 0 },
  expectedCash: { type: Number, default: 0 },
  difference: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed', 'approved'], default: 'open' },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('CashDrawer', cashDrawerSchema);
