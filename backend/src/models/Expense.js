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

module.exports = mongoose.model('Expense', expenseSchema);
