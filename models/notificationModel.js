const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  ref_command: { type: String, required: true },
  payment_status: { type: String, enum: ['success', 'failed'], required: true },
  details: { type: String }, // Enregistrement des détails complets de la notification IPN
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
