const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  sku:              { type: String, required: true, unique: true, uppercase: true, trim: true },
  barcode:          { type: String, unique: true, sparse: true, trim: true },
  brand:            { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  category:         { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subcategory:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  purchasePrice:    { type: Number, required: true, min: 0 },
  sellingPrice:     { type: Number, required: true, min: 0 },
  mrp:              { type: Number, min: 0 },
  gst:              { type: Number, default: 0, min: 0, max: 100 },
  hsn:              { type: String, trim: true },
  unit:             { type: String, default: 'pcs' },
  discount:         { type: Number, default: 0 },
  minStock:         { type: Number, default: 0 },
  maxStock:         { type: Number, default: 0 },
  openingStock:     { type: Number, default: 0 },
  priceIncludesGst: { type: Boolean, default: false },
  image:            String,
  description:      String,
  expiryDate:       Date,
  manufacturingDate:Date,
  batchNumber:      String,
  status:           { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

// Full-text search index for autocomplete
productSchema.index({ name: 'text', sku: 'text', barcode: 'text', hsn: 'text' });

// Compound indexes for common query patterns (supports 1L+ records)
productSchema.index({ status: 1, name: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
