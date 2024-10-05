const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Créer une demande de paiement via PayTech


exports.requestPayment = async (params) => {
  const paymentRequestUrl = "https://paytech.sn/api/payment/request-payment";

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
      headers: headers,
    });

    const jsonResponse = await response.json();

    // Vérifier que la réponse contient le champ "success" avec la valeur 1
    if (jsonResponse && jsonResponse.success === 1) {
      // Retourner l'objet JSON de réponse
      return jsonResponse;
    } else {
      return { success: false, message: "Erreur lors de la requête de paiement" };
    }
  } catch (error) {
    console.error("Erreur lors de la requête à PayTech:", error);
    throw new Error("Erreur lors de la requête à PayTech.");
  }
};





// Gérer les notifications IPN
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  console.log("Headers:", req.headers);   // Afficher les en-têtes pour le débogage
  console.log("IPN Body:", req.body);     // Afficher le contenu de la requête IPN

  // Récupérer la valeur de `status` ou `success` depuis le corps de la requête
  const { ref_command } = req.body;
  const status = req.body.status || req.body.success; // Utiliser 'success' si 'status' est absent

  // Si aucun champ n'est trouvé, retourner une erreur explicite
  if (!status) {
    return res.status(400).json({ success: false, message: "Aucun champ 'status' ou 'success' trouvé dans la requête IPN." });
  }

  // Vérifier si la transaction existe
  const payment = await Payment.findOne({ ref_command });
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Transaction non trouvée.' });
  }

  // Mettre à jour le statut de la transaction en fonction de la valeur de `status`
  payment.payment_status = status === 1 ? 'success' : 'failed'; // Si 'status' ou 'success' vaut 1, c'est réussi
  await payment.save();

  // Enregistrer la notification IPN dans la base de données
  const notification = new Notification({
    ref_command: ref_command,
    payment_status: payment.payment_status,
    details: JSON.stringify(req.body) // Enregistrer les détails complets de l'IPN
  });

  await notification.save();

  res.status(200).json({ success: true, message: 'Statut de paiement mis à jour et notification enregistrée' });
});