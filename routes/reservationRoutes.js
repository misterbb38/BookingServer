const express = require('express');
const { createReservation, getFieldAvailability } = require('../controllers/reservationController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Créer une réservation (nécessite authentification)
router.post('/', protect, createReservation);

// Vérifier la disponibilité d'un terrain pour une date donnée (accessible à tous)
router.get('/:id/availability', getFieldAvailability);

module.exports = router;
