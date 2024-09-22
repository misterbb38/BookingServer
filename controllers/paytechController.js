const asyncHandler = require('express-async-handler');
const Payment = require('../models/paymentModel');
const Notification = require('../models/notificationModel');

// Utiliser import() dynamique pour node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Créer une demande de paiement via PayTech
exports.requestPayment = asyncHandler(async (req, res) => {
  const paymentRequestUrl = "https://paytech.sn/api/payment/request-payment";
  const params = {
    item_name: req.body.item_name || "Réservation terrain",
    item_price: req.body.item_price || "10000",
    currency: "XOF",
    ref_command: req.body.ref_command || "REF123456",
    command_name: req.body.command_name || "Paiement via PayTech",
    env: "test",
    ipn_url: "https://votre-domaine.com/ipn", // URL où PayTech enverra les notifications IPN
    success_url: "https://votre-domaine.com/success",
    cancel_url: "https://votre-domaine.com/cancel",
  };

  const headers = {
    Accept: "application/json",
    'Content-Type': "application/json",
    API_KEY: process.env.PAYTECH_API_KEY,
    API_SECRET: process.env.PAYTECH_API_SECRET,
  };

  try {
    const response = await fetch(paymentRequestUrl, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: headers
    });

    const jsonResponse = await response.json();

    if (jsonResponse.success) {
      const payment = new Payment({
        item_name: params.item_name,
        item_price: params.item_price,
        ref_command: params.ref_command,
        command_name: params.command_name,
        payment_status: 'pending',
        token: jsonResponse.token,
        redirect_url: jsonResponse.redirect_url,
      });

      await payment.save();

      res.status(200).json({
        success: true,
        redirect_url: jsonResponse.redirect_url,
        token: jsonResponse.token
      });
    } else {
      res.status(400).json({ success: false, message: "Erreur lors de la requête de paiement" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'initialisation du paiement" });
  }
});

// Gérer les notifications IPN
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { ref_command, status } = req.body;

  const payment = await Payment.findOne({ ref_command });

  if (!payment) {
    res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    return;
  }

  // Mettre à jour le statut de la transaction
  payment.payment_status = status;
  await payment.save();

  // Enregistrer la notification IPN dans la base de données
  const notification = new Notification({
    ref_command: ref_command,
    payment_status: status,
    details: JSON.stringify(req.body) // Enregistrer les détails complets de l'IPN
  });

  await notification.save();

  res.status(200).json({ success: true, message: 'Statut de paiement mis à jour et notification enregistrée' });
});
