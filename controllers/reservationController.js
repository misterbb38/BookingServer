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

//     if (paymentMethod === 'pay_online' || paymentMethod === 'pay_later') {
//       // Premier paiement (30%)
//       const firstPaymentAmount = totalPrice * 0.3;
//       const firstPaymentRefCommand = `${reservationCode}-avance`;

//       const firstPaymentResponse = await requestPayment({
//         body: {
//           item_name: `Avance pour réservation ${terrain.name}`,
//           item_price: firstPaymentAmount,
//           ref_command: firstPaymentRefCommand,
//           command_name: 'Avance Réservation',
//           env: 'prod',
//           currency: "XOF",
//           reservationId: reservation._id
//         },
//         headers: req.headers,
        
//       });
//       payments.push(firstPaymentResponse);

//        // Deuxième paiement (70%)
//       const secondPaymentAmount = totalPrice * 0.7;
//       const secondPaymentRefCommand = `${reservationCode}-reste`;

//       const secondPaymentResponse = await requestPayment({
//         body: {
//           item_name: `Reste pour réservation ${terrain.name}`,
//           item_price: secondPaymentAmount,
//           ref_command: secondPaymentRefCommand,
//           command_name: 'Paiement Final Réservation',
//           env: 'prod',
//           currency: "XOF",
//           reservationId: reservation._id
//         },
//         headers: req.headers,
//       });
//       payments.push(secondPaymentResponse);

      
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
// controllers/reservationController.js

// controllers/reservationController.js


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
      payments: [], // Initialisation du tableau de paiements
    });

    await reservation.save();

    let payments = [];

    if (paymentMethod === 'pay_online' || paymentMethod === 'pay_later') {
      // Premier paiement (30%)
      const firstPaymentAmount = totalPrice * 0.3;
      const firstPaymentRefCommand = `${reservationCode}-avance`;

      // Préparation des paramètres pour la requête à PayTech
      const firstPaymentParams = {
        item_name: `Avance pour réservation ${terrain.name}`,
        item_price: firstPaymentAmount,
        ref_command: firstPaymentRefCommand,
        command_name: 'Avance Réservation',
        env: 'test',
        currency: "XOF",
        reservationId: reservation._id,
        ipn_url: process.env.PAYTECH_IPN_URL,
        success_url: process.env.PAYTECH_SUCCESS_URL,
        cancel_url: process.env.PAYTECH_CANCEL_URL,
      };

      // Appel à requestPayment
      const firstPaymentResponse = await requestPayment(firstPaymentParams);

      if (firstPaymentResponse && firstPaymentResponse.success === 1) {
        // Création du premier paiement
        const firstPayment = new Payment({
          reservation: reservation._id,
          item_name: firstPaymentParams.item_name,
          item_price: firstPaymentParams.item_price,
          currency: "XOF",
          ref_command: firstPaymentParams.ref_command,
          command_name: firstPaymentParams.command_name,
          env: firstPaymentParams.env,
          payment_status: 'pending',
          token: firstPaymentResponse.token,
          redirect_url: firstPaymentResponse.redirect_url,
        });

        await firstPayment.save();
        payments.push(firstPayment);

        // Ajouter l'ID du premier paiement à la réservation
        reservation.payments.push(firstPayment._id);
      } else {
        throw new Error('Erreur lors de la création du premier paiement.');
      }

      // Deuxième paiement (70%)
      const secondPaymentAmount = totalPrice * 0.7;
      const secondPaymentRefCommand = `${reservationCode}-reste`;

      const secondPaymentParams = {
        item_name: `Reste pour réservation ${terrain.name}`,
        item_price: secondPaymentAmount,
        ref_command: secondPaymentRefCommand,
        command_name: 'Paiement Final Réservation',
        env: 'test',
        currency: "XOF",
        reservationId: reservation._id,
        ipn_url: process.env.PAYTECH_IPN_URL,
        success_url: process.env.PAYTECH_SUCCESS_URL,
        cancel_url: process.env.PAYTECH_CANCEL_URL,
      };

      const secondPaymentResponse = await requestPayment(secondPaymentParams);

      if (secondPaymentResponse && secondPaymentResponse.success === 1) {
        // Création du second paiement
        const secondPayment = new Payment({
          reservation: reservation._id,
          item_name: secondPaymentParams.item_name,
          item_price: secondPaymentParams.item_price,
          currency: "XOF",
          ref_command: secondPaymentParams.ref_command,
          command_name: secondPaymentParams.command_name,
          env: secondPaymentParams.env,
          payment_status: 'pending',
          token: secondPaymentResponse.token,
          redirect_url: secondPaymentResponse.redirect_url,
        });

        await secondPayment.save();
        payments.push(secondPayment);

        // Ajouter l'ID du second paiement à la réservation
        reservation.payments.push(secondPayment._id);
      } else {
        throw new Error('Erreur lors de la création du second paiement.');
      }

      // Sauvegarder la réservation avec les paiements mis à jour
      await reservation.save();
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

// controllers/reservationController.js

exports.getReservations = asyncHandler(async (req, res) => {
  try {
    const { date, status } = req.query;

    let query = {};

    if (date) {
      // Convertir la date en début et fin de journée
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (status) {
      query.status = status;
    }

    // Récupérer les réservations en fonction des filtres
    const reservations = await Reservation.find(query)
    .populate({
      path: 'fieldId',
      select: 'name',
    })
      .select(' reservationCode date startTime endTime telephone status '); // Sélectionner les champs nécessaires

    res.status(200).json({ success: true, data: reservations });

  } catch (error) {
    console.error("Erreur lors de la récupération des réservations :", error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des réservations.' });
  }
});

// controllers/reservationController.js

exports.getReservationCounts = asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    let matchStage = {};

    // Par défaut, on considère les réservations avec le statut 'confirmed'
    if (status) {
      matchStage.status = status;
    } else {
      matchStage.status = 'pending';
    }

    // Filtrage par plage de dates si fourni
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Compter les réservations par jour
    const dailyCounts = await Reservation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Compter les réservations par semaine
    const weeklyCounts = await Reservation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$date" },
            week: { $isoWeek: "$date" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    // Compter les réservations par mois
    const monthlyCounts = await Reservation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$date" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      dailyCounts,
      weeklyCounts,
      monthlyCounts
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques de réservations :", error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques de réservations.' });
  }
});



exports.getReservationByCode = asyncHandler(async (req, res) => {
  const { reservationCode } = req.params;

  // Rechercher la réservation par le code
  const reservation = await Reservation.findOne({ reservationCode })
    .populate('user fieldId')
    .populate('payments'); // Peupler le tableau des paiements

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

