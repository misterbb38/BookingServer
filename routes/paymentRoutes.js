const express = require('express');
const { requestPayment, updatePaymentStatus } = require('../controllers/paytechController');
const router = express.Router();

// Initier un paiement (authentification requise)
router.post('/initiate-payment', requestPayment);

// IPN pour mettre à jour le statut du paiement (accessible par PayTech)
 router.post('/ipn', updatePaymentStatus);

module.exports = router;
