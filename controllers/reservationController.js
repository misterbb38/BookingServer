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



// exports.createReservation = async (req, res) => {
//   try {
//     const { fieldId, date, startTime, endTime, telephone, paymentMethod } = req.body;

//     // Vérification de la date
//     const currentDate = new Date();
//     if (new Date(date) < currentDate) {
//       return res.status(400).json({ success: false, message: 'Impossible de réserver pour une date passée.' });
//     }

//     // Détails du terrain
//     const terrain = await Terrain.findById(fieldId);
//     if (!terrain) {
//       return res.status(404).json({ success: false, message: 'Terrain non trouvé' });
//     }

//     // Calcul du prix total
//     const totalPrice = calculatePrice(startTime, endTime, terrain.pricePerHour);
//     const reservationCode = generateReservationCode();

//     // Création de la réservation
//     const reservation = new Reservation({
//       fieldId,
//       date,
//       startTime,
//       endTime,
//       telephone,
//       totalPrice,
//       status: 'pending',
//       reservationCode,
//     });

//     await reservation.save();

//     let payments = [];

//     if (paymentMethod === 'pay_online') {
//       // Premier paiement (30%)
//       const firstPaymentAmount = totalPrice * 0.3;
//       const firstPaymentRefCommand = `${reservationCode}-A`;

//       const firstPaymentResponse = await requestPayment({
//         body: {
//           item_name: `Réservation pour le terrain ${terrain.name}`,
//           item_price: firstPaymentAmount,
//           ref_command: firstPaymentRefCommand,
//           command_name: 'Premier Paiement Réservation Terrain',
//           env: 'test',
//           currency: "XOF",
//           reservationId: reservation._id
//         },
//         headers: req.headers,
//       });

//       // if (firstPaymentResponse && firstPaymentResponse.success) {
//       //   const firstPayment = new Payment({
//       //     reservation: reservation._id,
//       //     item_name: `Réservation pour le terrain ${terrain.name}`,
//       //     item_price: firstPaymentAmount,
//       //     ref_command: firstPaymentRefCommand,
//       //     command_name: 'Premier Paiement Réservation Terrain',
//       //     payment_status: 'pending',
//       //     token: firstPaymentResponse.token,
//       //     redirect_url: firstPaymentResponse.redirect_url,
//       //   });

//       //   await firstPayment.save();
//       //   payments.push(firstPayment);
//       // }

//       // Deuxième paiement (70%)
//       const secondPaymentAmount = totalPrice * 0.7;
//       const secondPaymentRefCommand = `${reservationCode}-B`;

//       const secondPaymentResponse = await requestPayment({
//         body: {
//           item_name: `Réservation pour le terrain ${terrain.name}`,
//           item_price: secondPaymentAmount,
//           ref_command: secondPaymentRefCommand,
//           command_name: 'Deuxième Paiement Réservation Terrain',
//           env: 'test',
//           currency: "XOF",
//           reservationId: reservation._id
//         },
//         headers: req.headers,
//       });

//       // if (secondPaymentResponse && secondPaymentResponse.success) {
//       //   const secondPayment = new Payment({
//       //     reservation: reservation._id,
//       //     item_name: `Réservation pour le terrain ${terrain.name}`,
//       //     item_price: secondPaymentAmount,
//       //     ref_command: secondPaymentRefCommand,
//       //     command_name: 'Deuxième Paiement Réservation Terrain',
//       //     payment_status: 'pending',
//       //     token: secondPaymentResponse.token,
//       //     redirect_url: secondPaymentResponse.redirect_url,
//       //   });

//       //   await secondPayment.save();
//       //   payments.push(secondPayment);
//       // }
//     }

//     return res.status(200).json({
//       success: true,
//       reservation: reservation,
//       payments: payments
//     });

//   } catch (error) {
//     console.error("Erreur lors de la création de la réservation:", error);
//     return res.status(500).json({ success: false, message: 'Erreur technique lors de la création de la réservation.' });
//   }
// };


exports.createReservation = async (req, res) => {
  try {
    const { fieldId, date, startTime, endTime, telephone, paymentMethod } = req.body;

    // Vérification de la date
    const currentDate = new Date();
    if (new Date(date) < currentDate) {
      return res.status(400).json({ success: false, message: 'Impossible de réserver pour une date passée.' });
    }

    // Détails du terrain
    const terrain = await Terrain.findById(fieldId);
    if (!terrain) {
      return res.status(404).json({ success: false, message: 'Terrain non trouvé' });
    }

    // Calcul du prix total
    const totalPrice = calculatePrice(startTime, endTime, terrain.pricePerHour);
    const reservationCode = generateReservationCode();

    // Création de la réservation
    const reservation = new Reservation({
      fieldId,
      date,
      startTime,
      endTime,
      telephone,
      totalPrice,
      status: 'pending',
      reservationCode,
    });

    await reservation.save();

    let payments = [];

    if (paymentMethod === 'pay_online' || paymentMethod === 'pay_later') {
      // Premier paiement (30%)
      const firstPaymentAmount = totalPrice * 0.3;
      const firstPaymentRefCommand = `${reservationCode}-avance`;

      const firstPaymentResponse = await requestPayment({
        body: {
          item_name: `Avance pour réservation ${terrain.name}`,
          item_price: firstPaymentAmount,
          ref_command: firstPaymentRefCommand,
          command_name: 'Avance Réservation',
          env: 'prod',
          currency: "XOF",
          reservationId: reservation._id
        },
        headers: req.headers,
        
      });
      payments.push(firstPaymentResponse);

       // Deuxième paiement (70%)
      const secondPaymentAmount = totalPrice * 0.7;
      const secondPaymentRefCommand = `${reservationCode}-reste`;

      const secondPaymentResponse = await requestPayment({
        body: {
          item_name: `Reste pour réservation ${terrain.name}`,
          item_price: secondPaymentAmount,
          ref_command: secondPaymentRefCommand,
          command_name: 'Paiement Final Réservation',
          env: 'test',
          currency: "XOF",
          reservationId: reservation._id
        },
        headers: req.headers,
      });
      payments.push(secondPaymentResponse);

      
    }

    return res.status(200).json({
      success: true,
      reservation: reservation,
      payments: payments
    });

  } catch (error) {
    console.error("Erreur lors de la création de la réservation:", error);
    return res.status(500).json({ success: false, message: 'Erreur technique lors de la création de la réservation.' });
  }
};










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

