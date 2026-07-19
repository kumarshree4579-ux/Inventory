const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  logo: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

brandSchema.index({ status: 1 });

module.exports = mongoose.model('Brand', brandSchema);
