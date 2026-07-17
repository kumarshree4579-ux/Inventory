const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  branch:    { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  available: { type: Number, default: 0 },
  reserved:  { type: Number, default: 0 },
  damaged:   { type: Number, default: 0 },
  expired:   { type: Number, default: 0 },
}, { timestamps: true });

stockSchema.index({ product: 1, branch: 1 }, { unique: true });
stockSchema.index({ branch: 1, available: 1 });   // low-stock queries
stockSchema.index({ branch: 1 });

const stockTransactionSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  branch:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  type:        { type: String, enum: ['inward', 'outward', 'transfer', 'adjustment', 'damage', 'return', 'expired', 'opening'], required: true },
  quantity:    { type: Number, required: true },
  reference:   String,
  referenceId: mongoose.Schema.Types.ObjectId,
  note:        String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
}, { timestamps: true });

// Indexes for transaction history queries on large datasets
stockTransactionSchema.index({ branch: 1, createdAt: -1 });
stockTransactionSchema.index({ product: 1, branch: 1, createdAt: -1 });
stockTransactionSchema.index({ type: 1, branch: 1 });
stockTransactionSchema.index({ referenceId: 1 });

const Stock = mongoose.model('Stock', stockSchema);
const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);

module.exports = { Stock, StockTransaction };
