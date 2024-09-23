const asyncHandler = require('express-async-handler');
const Reservation = require('../models/reservationModel');
const Payment = require('../models/PaymentModel');
const User = require('../models/userModel');
const Terrain = require('../models/terrainModel');
const { SmsOrange } = require('smsorange');
const crypto = require('crypto');  // Pour générer un code unique
const { requestPayment } = require('./paytechController'); // Importer le contrôleur PayTech

// Configurer l'API Orange SMS avec les variables d'environnement
const smsWrapper = new SmsOrange({
  authorization_header: process.env.ORANGE_API_AUTH_HEADER,
  yourNumber: process.env.ORANGE_API_YOUR_NUMBER,
  senderName: process.env.ORANGE_API_SENDER_NAME,
});

// Fonction pour générer un code de réservation unique
const generateReservationCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();  // Par exemple : "A1B2C3D4"
};

// Fonction pour calculer le prix total de la réservation
const calculatePrice = (startTime, endTime, pricePerHour) => {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const hours = endHour - startHour;
  return hours * pricePerHour;
};


exports.createReservation = asyncHandler(async (req, res) => {
  const {  fieldId, date, startTime, endTime, telephone, paymentMethod, paidAmount } = req.body;

  // Empêcher la création de réservations pour des dates passées
  const currentDate = new Date();
  if (new Date(date) < currentDate) {
    return res.status(400).json({ success: false, message: 'Impossible de réserver pour une date passée.' });
  }

  // Récupérer les détails de l'utilisateur et du terrain
  // const userInfo = await User.findById(user);
  const terrain = await Terrain.findById(fieldId);

  if (!terrain) {
    return res.status(404).json({ success: false, message: 'Utilisateur ou terrain non trouvé' });
  }

  // Calculer le prix total et générer un code de réservation unique
  const totalPrice = calculatePrice(startTime, endTime, terrain.pricePerHour);
  const reservationCode = generateReservationCode();

  // Vérifier que l'utilisateur a payé au moins 50% du total
  const minimumPayment = totalPrice / 2;
  if (paidAmount < minimumPayment) {
    return res.status(400).json({ success: false, message: `Le paiement minimum requis est de ${minimumPayment}.` });
  }

  // Créer la réservation
  const reservation = new Reservation({
   
    fieldId,
    date,
    startTime,
    endTime,
    telephone,
    paymentMethod,
    totalPrice,
    status: paidAmount >= minimumPayment ? 'confirmed' : 'pending',
    reservationCode
  });

  const createdReservation = await reservation.save();

  // Si l'utilisateur choisit de payer en ligne, initier le paiement via PayTech
  if (paymentMethod === 'pay_online') {
    const paymentRequestBody = {
      item_name: `Réservation pour le terrain ${terrain.name}`,
      item_price: minimumPayment,
      ref_command: reservationCode, // Utiliser le code de réservation comme référence de commande
      command_name: 'Paiement Réservation Terrain',
      env: 'prod',
      currency: "XOF", // Assurez-vous que la devise est incluse
    };

    const paymentResponse = await requestPayment({
      body: { ...paymentRequestBody, reservationId: createdReservation._id },
      headers: req.headers,
    });

    // Afficher la réponse de PayTech pour le débogage
    console.log("Réponse PayTech:", paymentResponse);

    // Vérifier si la réponse contient les informations attendues
    if (paymentResponse && paymentResponse.success && paymentResponse.redirect_url && paymentResponse.token) {
      // Créer un paiement associé à la réservation
      const payment = new Payment({
        reservation: createdReservation._id,
        item_name: `Réservation pour le terrain ${terrain.name}`,
        item_price: totalPrice,
        ref_command: reservationCode, // Utiliser le code de réservation comme référence de commande
        command_name: 'Paiement Réservation Terrain',
        payment_status: 'pending',  // Le paiement est en attente
        token: paymentResponse.token,
        redirect_url: paymentResponse.redirect_url,
      });

      await payment.save();

      // Associer le paiement à la réservation
      createdReservation.payment = payment._id;
      await createdReservation.save();

      // Rediriger l'utilisateur vers l'URL de paiement PayTech
      return res.status(200).json({
        success: true,
        redirect_url: paymentResponse.redirect_url,
        reservation: createdReservation,
        payment: payment
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Erreur lors de la création du paiement.',
        details: paymentResponse || "Réponse PayTech manquante"
      });
    }
  }

  // Si l'utilisateur a payé sur place, la réservation est confirmée
  if (paymentMethod === 'pay_on_site') {
    // Créer un paiement marqué comme payé sur place
    const payment = new Payment({
      reservation: createdReservation._id,
      item_name: `Réservation pour le terrain ${terrain.name}`,
      item_price: totalPrice,
      ref_command: reservationCode,
      command_name: 'Paiement Réservation Terrain',
      payment_status: 'success'
    });

    await payment.save();

    // Associer le paiement à la réservation
    createdReservation.payment = payment._id;
    await createdReservation.save();

    // Envoyer un SMS de confirmation avec le code de réservation
    const message = `Bonjour  votre réservation a été confirmée. Code de réservation : ${reservationCode}`;
    await smsWrapper.sendSms({ numberTo: telephone, message });

    return res.status(201).json({ success: true, data: createdReservation, payment: payment });
  }

  res.status(201).json({ success: true, data: createdReservation });
});

exports.getReservationByCode = asyncHandler(async (req, res) => {
  const { reservationCode } = req.params;

  // Rechercher la réservation par le code
  const reservation = await Reservation.findOne({ reservationCode }).populate('user fieldId');

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Réservation non trouvée.' });
  }

  res.status(200).json({ success: true, data: reservation });
});

// Mettre à jour une réservation avec le code de réservation
exports.updateReservation = asyncHandler(async (req, res) => {
  const { reservationCode } = req.params;
  const { startTime, endTime, paymentMethod } = req.body;

  const reservation = await Reservation.findOne({ reservationCode });

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Réservation non trouvée.' });
  }

  // Ne pas autoriser les modifications de réservations passées
  if (new Date(reservation.date) < new Date()) {
    return res.status(400).json({ success: false, message: 'Impossible de modifier une réservation passée.' });
  }

  reservation.startTime = startTime || reservation.startTime;
  reservation.endTime = endTime || reservation.endTime;
  reservation.paymentMethod = paymentMethod || reservation.paymentMethod;

  const updatedReservation = await reservation.save();
  res.status(200).json({ success: true, data: updatedReservation });
});

// Supprimer une réservation (admin uniquement)
exports.deleteReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Chercher la réservation par son ID
  const reservation = await Reservation.findById(id);

  if (!reservation) {
    return res.status(404).json({ success: false, message: 'Réservation non trouvée.' });
  }

  // Vérifier si la réservation a déjà été confirmée ou annulée
  if (reservation.status === 'confirmed' || reservation.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Impossible de supprimer une réservation confirmée ou annulée.',
    });
  }

  // Supprimer la réservation
  await Reservation.findByIdAndDelete(id);

  res.status(200).json({ success: true, message: 'Réservation supprimée avec succès.' });
});


// Supprimer les réservations "pending" après 48 heures
exports.deletePendingReservations = asyncHandler(async (req, res) => {
  const currentDate = new Date();

  // Trouver les réservations "pending" créées il y a plus de 48 heures
  const expiredReservations = await Reservation.find({
    status: 'pending',
    createdAt: { $lt: new Date(currentDate.getTime() - 48 * 60 * 60 * 1000) }
  });

  const deletedReservations = await Reservation.deleteMany({ _id: { $in: expiredReservations.map(res => res._id) } });

  res.status(200).json({
    success: true,
    message: `Réservations "pending" supprimées: ${deletedReservations.deletedCount}`
  });
});

// Vérifier la disponibilité d'un terrain pour une date donnée
// exports.getFieldAvailability = asyncHandler(async (req, res) => {
//   const fieldId = req.params.id;
//   const date = req.query.date;

//   if (!date) {
//     return res.status(400).json({ success: false, message: 'La date est requise.' });
//   }

//   const reservations = await Reservation.find({ fieldId, date });

//   const reservedTimes = reservations.map(reservation => ({
//     startTime: reservation.startTime,
//     endTime: reservation.endTime,
//   }));

//   res.status(200).json({ success: true, reservedTimes });
// });
// Fonction pour générer une liste d'heures dans une journée donnée
const generateTimeSlots = (start, end) => {
  const timeSlots = [];
  let currentTime = start;

  while (currentTime < end) {
    const nextTime = new Date(currentTime.getTime() + 60 * 60 * 1000); // Ajout de 1 heure
    timeSlots.push({
      startTime: currentTime.toTimeString().substring(0, 5),
      endTime: nextTime.toTimeString().substring(0, 5)
    });
    currentTime = nextTime;
  }

  return timeSlots;
};

exports.getFieldAvailability = asyncHandler(async (req, res) => {
  const fieldId = req.params.id;
  const date = req.query.date;

  if (!date) {
    return res.status(400).json({ success: false, message: 'La date est requise.' });
  }

  // Vérification que la date est au format correct
  const selectedDate = new Date(date);
  if (isNaN(selectedDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Format de la date invalide.' });
  }

  // Récupérer toutes les réservations pour le terrain donné à la date spécifiée
  const reservations = await Reservation.find({
    fieldId,
    date: { $eq: selectedDate.toISOString().split('T')[0] }
  });

  console.log("Réservations récupérées :", reservations);

  // Définir une plage horaire (ex: de 08:00 à 22:00)
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(8, 0, 0); // 08:00

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(22, 0, 0); // 22:00

  // Générer toutes les plages horaires de la journée
  const allTimeSlots = generateTimeSlots(startOfDay, endOfDay);

  // Marquer les créneaux réservés
  const reservedTimes = reservations.map(reservation => ({
    startTime: reservation.startTime,
    endTime: reservation.endTime,
  }));

  // Vérifier la disponibilité de chaque créneau
  const availableTimeSlots = allTimeSlots.map(slot => {
    const isReserved = reservedTimes.some(reserved => 
      (slot.startTime >= reserved.startTime && slot.startTime < reserved.endTime) ||
      (slot.endTime > reserved.startTime && slot.endTime <= reserved.endTime)
    );
    
    return {
      ...slot,
      isReserved
    };
  });

  res.status(200).json({ success: true, availableTimeSlots });
});

