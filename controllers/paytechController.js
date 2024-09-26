const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Créer une demande de paiement via PayTech
exports.requestPayment = async (req, res) => {
  const paymentRequestUrl = "https://paytech.sn/api/payment/request-payment";
  const { reservationId } = req.body; // Récupérer l'ID de la réservation
  const params = {
    item_name: req.body.item_name || "Réservation terrain",
    item_price: req.body.item_price || "10000",
    currency: "XOF",
    ref_command: req.body.ref_command || "REF12345600",
    command_name: req.body.command_name || "Paiement via PayTech",
    env: "Prod",
    ipn_url: process.env.PAYTECH_IPN_URL,
    success_url: process.env.PAYTECH_SUCCESS_URL,
    cancel_url: process.env.PAYTECH_CANCEL_URL,
  };


  const headers = {
    Accept: "application/json",
    'Content-Type': "application/json",
    API_KEY: process.env.PAYTECH_API_KEY,
    API_SECRET: process.env.PAYTECH_API_SECRET,
  };
  // Afficher les informations avant l'envoi de la requête
console.log("Paramètres envoyés à PayTech:", params);
console.log("En-têtes envoyés à PayTech:", headers);
  try {
    const response = await fetch(paymentRequestUrl, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: headers,
    });

    const jsonResponse = await response.json();

    // Vérifier que la réponse contient le champ "success" avec la valeur 1
    if (jsonResponse && jsonResponse.success === 1) {
      const payment = new Payment({
        reservation: reservationId, // Assigner la réservation associée
        item_name: params.item_name,
        item_price: params.item_price,
        ref_command: params.ref_command,
        command_name: params.command_name,
        env:'test',
         currency: "XOF", // Assurez-vous que la devise est incluse
        payment_status: 'pending',
        token: jsonResponse.token,
        redirect_url: jsonResponse.redirect_url,
      });

      await payment.save();

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

// exports.requestPayment = async (req, res) => {
//   try {
//     const { reservationId, item_name, item_price, ref_command, command_name } = req.body;

//     if (!reservationId) {
//       return res.status(400).json({ success: false, message: 'Reservation ID is required.' });
//     }

//     const paymentRequestUrl = "https://paytech.sn/api/payment/request-payment";
//     const params = {
//       item_name: item_name || "Réservation terrain",
//       item_price: item_price || "10000",
//       currency: "XOF",
//       ref_command: ref_command || "REF12345600",
//       command_name: command_name || "Paiement via PayTech",
//       env: "test",
//       ipn_url: process.env.PAYTECH_IPN_URL,
//       success_url: process.env.PAYTECH_SUCCESS_URL,
//       cancel_url: process.env.PAYTECH_CANCEL_URL,
//     };

//     const headers = {
//       Accept: "application/json",
//       'Content-Type': "application/json",
//       API_KEY: process.env.PAYTECH_API_KEY,
//       API_SECRET: process.env.PAYTECH_API_SECRET,
//     };

//     const response = await fetch(paymentRequestUrl, {
//       method: 'POST',
//       body: JSON.stringify(params),
//       headers,
//     });

//     const jsonResponse = await response.json();

//     if (jsonResponse && jsonResponse.success === 1) {
//       const payment = new Payment({
//         reservation: reservationId,
//         item_name: params.item_name,
//         item_price: params.item_price,
//         ref_command: params.ref_command,
//         command_name: params.command_name,
//         payment_status: 'pending',
//         token: jsonResponse.token,
//         redirect_url: jsonResponse.redirect_url,
//       });

//       await payment.save();

//       return res.status(200).json({ success: true, redirect_url: jsonResponse.redirect_url });
//     } else {
//       return res.status(400).json({ success: false, message: 'Erreur lors de la requête de paiement.' });
//     }
//   } catch (error) {
//     console.error("Erreur lors de la requête à PayTech:", error);
//     return res.status(500).json({ success: false, message: 'Erreur lors de la requête à PayTech.' });
//   }
// };




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