const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  coupon: String,
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'credit', 'split'], required: true },
  paymentDetails: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['completed', 'held', 'cancelled', 'returned'], default: 'completed' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
