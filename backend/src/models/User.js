const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  mobile: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  refreshToken: { type: String, select: false },
  lastLogin: Date,
  deviceInfo: [{ device: String, ip: String, browser: String, lastUsed: Date }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
