const mongoose = require('mongoose');

const printerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['thermal', 'a4', 'label', 'barcode'], required: true },
  paperSize: { type: String, enum: ['58mm', '80mm', 'a4'], default: '80mm' },
  connection: { type: String, enum: ['usb', 'network', 'bluetooth'], default: 'usb' },
  ipAddress: String,
  port: Number,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  settings: {
    logo: String,
    header: String,
    footer: String,
    copies: { type: Number, default: 1 },
    autoPrint: { type: Boolean, default: false },
    showQR: { type: Boolean, default: true },
    cutPaper: { type: Boolean, default: true },
    margins: { top: Number, bottom: Number, left: Number, right: Number },
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Printer', printerSchema);
