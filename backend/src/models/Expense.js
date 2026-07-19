const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: { type: String, enum: ['electricity', 'rent', 'salary', 'office', 'travel', 'miscellaneous'], required: true },
  amount: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receipt: String,
}, { timestamps: true });

expenseSchema.index({ branch: 1, date: -1 });
expenseSchema.index({ branch: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
