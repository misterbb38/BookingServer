const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'Terrain', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // Format HH:mm
  endTime: { type: String, required: true },   // Format HH:mm
  telephone: { type: String, required: true},
  paymentMethod: { type: String, enum: ['pay_on_site', 'pay_online'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  reservationCode: { type: String, unique: true, required: true }, // Code de réservation unique
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },  // Référence au paiement
  totalPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
