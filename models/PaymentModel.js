const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },  // Référence à la réservation
  item_name: { type: String, required: true },
  item_price: { type: String, required: true },
  currency: { type: String, default: 'XOF' },
  ref_command: { type: String, required: true },
  command_name: { type: String, required: true },
  env: { type: String, enum: ['test', 'prod'], default: 'test' }, // Ajout du champ 'env'
  payment_status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  token: { type: String },
  redirect_url: { type: String }
}, { timestamps: true }); // Ajout de l'option timestamps

module.exports = mongoose.model('Payment', PaymentSchema);
