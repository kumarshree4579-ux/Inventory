const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: String,
  address: String,
  birthday: Date,
  membership: { type: String, enum: ['none', 'silver', 'gold', 'platinum'], default: 'none' },
  rewardPoints: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  nameHistory: [{
    from: String,
    to: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

customerSchema.index({ name: 1 });
customerSchema.index({ branch: 1, status: 1 });
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
