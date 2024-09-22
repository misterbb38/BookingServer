const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  item_name: { type: String, required: true },
  item_price: { type: String, required: true },
  currency: { type: String, default: 'XOF' },
  ref_command: { type: String, unique: true, required: true },
  command_name: { type: String, required: true },
  payment_status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  token: { type: String },
  redirect_url: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
