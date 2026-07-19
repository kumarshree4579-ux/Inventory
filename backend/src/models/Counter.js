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

counterSchema.index({ branch: 1, status: 1 });
counterSchema.index({ branch: 1, number: 1 });

module.exports = mongoose.model('Counter', counterSchema);
