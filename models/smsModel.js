const mongoose = require('mongoose');

const SmsSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SMS', SmsSchema);
