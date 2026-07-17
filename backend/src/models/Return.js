const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  type: { type: String, enum: ['sale', 'purchase'], required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'referenceModel' },
  referenceModel: { type: String, enum: ['Sale', 'PurchaseOrder'] },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
    reason: String,
  }],
  total: { type: Number, required: true },
  refundMethod: { type: String, enum: ['cash', 'credit', 'exchange'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
