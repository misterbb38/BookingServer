const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const Reservation = require('../models/reservationModel');
const Notification = require('../models/notificationModel'); // Assurez-vous d'importer le modèle Notification si ce n'est pas déjà fait
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
// exports.updatePaymentStatus = asyncHandler(async (req, res) => {
//   console.log("Headers:", req.headers);   // Afficher les en-têtes pour le débogage
//   console.log("IPN Body:", req.body);     // Afficher le contenu de la requête IPN

//   // Récupérer la valeur de `status` ou `success` depuis le corps de la requête
//   const { ref_command } = req.body;
//   const status = req.body.status || req.body.success; // Utiliser 'success' si 'status' est absent

//   // Si aucun champ n'est trouvé, retourner une erreur explicite
//   if (!status) {
//     return res.status(400).json({ success: false, message: "Aucun champ 'status' ou 'success' trouvé dans la requête IPN." });
//   }

//   // Vérifier si la transaction existe
//   const payment = await Payment.findOne({ ref_command });
//   if (!payment) {
//     return res.status(404).json({ success: false, message: 'Transaction non trouvée.' });
//   }

//   // Mettre à jour le statut de la transaction en fonction de la valeur de `status`
//   payment.payment_status = status === 1 ? 'success' : 'failed'; // Si 'status' ou 'success' vaut 1, c'est réussi
//   await payment.save();

//   // Enregistrer la notification IPN dans la base de données
//   const notification = new Notification({
//     ref_command: ref_command,
//     payment_status: payment.payment_status,
//     details: JSON.stringify(req.body) // Enregistrer les détails complets de l'IPN
//   });

//   await notification.save();

//   res.status(200).json({ success: true, message: 'Statut de paiement mis à jour et notification enregistrée' });
// });

// exports.updatePaymentStatus = asyncHandler(async (req, res) => {
//   console.log("Headers:", req.headers);   // Afficher les en-têtes pour le débogage
//   console.log("IPN Body:", req.body);     // Afficher le contenu de la requête IPN

//   // Récupérer la valeur de `status` ou `success` depuis le corps de la requête
//   const { ref_command } = req.body;
//   const status = req.body.status || req.body.success; // Utiliser 'success' si 'status' est absent

//   // Si aucun champ n'est trouvé, retourner une erreur explicite
//   if (typeof status === 'undefined') {
//     return res.status(400).json({ success: false, message: "Aucun champ 'status' ou 'success' trouvé dans la requête IPN." });
//   }

//   // Vérifier si la transaction existe et peupler la réservation associée
//   const payment = await Payment.findOne({ ref_command }).populate('reservation');
//   if (!payment) {
//     return res.status(404).json({ success: false, message: 'Transaction non trouvée.' });
//   }

//   // Mettre à jour le statut de la transaction en fonction de la valeur de `status`
//   payment.payment_status = status === 1 ? 'success' : 'failed'; // Si 'status' ou 'success' vaut 1, c'est réussi
//   await payment.save();

//   // Enregistrer la notification IPN dans la base de données
//   const notification = new Notification({
//     ref_command: ref_command,
//     payment_status: payment.payment_status,
//     details: JSON.stringify(req.body) // Enregistrer les détails complets de l'IPN
//   });

//   await notification.save();

//   // Mettre à jour le statut de la réservation en fonction du paiement
//   if (payment.payment_status === 'success' && payment.reservation) {
//     const reservation = payment.reservation;

//     if (ref_command.endsWith('-avance')) {
//       // Si l'avance est payée, mettre le statut à 'reserved' seulement si le statut actuel est 'pending'
//       if (reservation.status === 'pending') {
//         reservation.status = 'reserved';
//       }
//     } else if (ref_command.endsWith('-reste')) {
//       // Si le paiement final est payé, mettre le statut à 'confirmed'
//       reservation.status = 'confirmed';
//     }

//     await reservation.save();
//   }

//   res.status(200).json({ success: true, message: 'Statut de paiement mis à jour et notification enregistrée' });
// });

exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  console.log("Headers:", req.headers);   // Afficher les en-têtes pour le débogage
  console.log("IPN Body:", req.body);     // Afficher le contenu de la requête IPN

  // Récupérer la valeur de `ref_command` et `status` depuis le corps de la requête
  const { ref_command } = req.body;
  let status = req.body.status || req.body.success; // Utiliser 'success' si 'status' est absent

  // Si aucun champ n'est trouvé, retourner une erreur explicite
  if (typeof status === 'undefined') {
    return res.status(400).json({ success: false, message: "Aucun champ 'status' ou 'success' trouvé dans la requête IPN." });
  }

  // Convertir status en nombre si nécessaire
  const statusValue = Number(status);

  // Vérifier si la transaction existe et peupler la réservation associée
  const payment = await Payment.findOne({ ref_command }).populate('reservation');
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Transaction non trouvée.' });
  }

  // Mettre à jour le statut de la transaction en fonction de la valeur de `status`
  payment.payment_status = statusValue === 1 ? 'success' : 'failed';
  await payment.save();

  // Enregistrer la notification IPN dans la base de données
  const notification = new Notification({
    ref_command: ref_command,
    payment_status: payment.payment_status,
    details: JSON.stringify(req.body) // Enregistrer les détails complets de l'IPN
  });

  await notification.save();

  // Mettre à jour le statut de la réservation en fonction du paiement
  if (payment.payment_status === 'success') {
    if (payment.reservation) {
      const reservation = payment.reservation;

      if (ref_command.endsWith('-avance')) {
        // Si l'avance est payée, mettre le statut à 'reserved' seulement si le statut actuel est 'pending'
        if (reservation.status === 'pending') {
          reservation.status = 'reserved';
          await reservation.save();
        } else {
          console.warn(`La réservation ${reservation._id} n'est pas au statut 'pending' (statut actuel: '${reservation.status}').`);
        }
      } else if (ref_command.endsWith('-reste')) {
        // Si le paiement final est payé, mettre le statut à 'confirmed' seulement si le statut actuel est 'reserved' ou 'pending'
        if (reservation.status === 'reserved' || reservation.status === 'pending') {
          reservation.status = 'confirmed';
          await reservation.save();
        } else {
          console.warn(`La réservation ${reservation._id} n'est pas au statut 'reserved' ou 'pending' (statut actuel: '${reservation.status}').`);
        }
      } else {
        console.warn(`Format de ref_command inattendu : ${ref_command}`);
      }
    } else {
      console.warn(`La transaction avec ref_command ${ref_command} n'a pas de réservation associée.`);
    }
  }

  res.status(200).json({ success: true, message: 'Statut de paiement mis à jour et notification enregistrée' });
});