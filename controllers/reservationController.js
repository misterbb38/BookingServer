const asyncHandler = require('express-async-handler');
const Reservation = require('../models/reservationModel');
const SMS = require('../models/smsModel');
const { SmsOrange } = require('smsorange');

// Configurer l'API Orange SMS avec les variables d'environnement
const smsWrapper = new SmsOrange({
  authorization_header: process.env.ORANGE_API_AUTH_HEADER,
  yourNumber: process.env.ORANGE_API_YOUR_NUMBER,
  senderName: process.env.ORANGE_API_SENDER_NAME,
});


// Fonction pour calculer le prix total de la réservation
const calculatePrice = (startTime, endTime, pricePerHour) => {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const hours = endHour - startHour;
  return hours * pricePerHour; // Calcul du prix par heure
};

// Créer une réservation et envoyer un SMS de confirmation
exports.createReservation = asyncHandler(async (req, res) => {
  const { user, fieldId, date, startTime, endTime, paymentMethod, pricePerHour } = req.body;

  // Calculer le prix total en fonction du créneau horaire
  const totalPrice = calculatePrice(startTime, endTime, pricePerHour);

  // Créer une nouvelle réservation
  const reservation = new Reservation({
    user,
    fieldId,
    date,
    startTime,
    endTime,
    paymentMethod,
    totalPrice,
  });

  // Sauvegarder la réservation dans la base de données
  await reservation.save();

  // Préparer le message SMS de confirmation
  const message = `Bonjour ${user.firstName}, 
Votre réservation pour le terrain le ${date} de ${startTime} à ${endTime} a été confirmée.`;

  try {
    // Envoyer le SMS via l'API Orange
    const smsResponse = await smsWrapper.sendSms({
      numberTo: user.phoneNumber,
      message: message,
    });

    // Enregistrer le SMS envoyé dans la base de données
    const sms = new SMS({
      phoneNumber: user.phoneNumber,
      message,
      status: 'sent',
      reservationId: reservation._id,
    });
    await sms.save();

    // Retourner la réponse avec succès
    res.status(201).json({ success: true, data: reservation, smsResponse });
  } catch (error) {
    // Enregistrer un SMS échoué dans la base de données en cas d'erreur d'envoi
    const sms = new SMS({
      phoneNumber: user.phoneNumber,
      message,
      status: 'failed',
      reservationId: reservation._id,
    });
    await sms.save();

    // Retourner la réponse de la réservation avec un message d'échec d'envoi de SMS
    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Réservation réussie, mais envoi du SMS échoué.',
    });
  }
});

// Vérifier la disponibilité d'un terrain pour une date donnée
exports.getFieldAvailability = asyncHandler(async (req, res) => {
  const fieldId = req.params.id;
  const date = req.query.date; // Format attendu : YYYY-MM-DD

  // Vérifier si la date est fournie
  if (!date) {
    res.status(400).json({ success: false, message: 'La date est requise.' });
    return;
  }

  try {
    // Rechercher toutes les réservations pour ce terrain et cette date
    const reservations = await Reservation.find({ fieldId, date });

    // Extraire les créneaux horaires déjà réservés
    const reservedTimes = reservations.map(reservation => ({
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    }));

    // Répondre avec les créneaux réservés
    res.status(200).json({
      success: true,
      reservedTimes,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des disponibilités :', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des disponibilités.',
    });
  }
});
