const express = require('express');
const { createReservation, updateReservation, deleteReservation, getFieldAvailability, getReservations, getReservationCounts, getReservationByCode, deletePendingReservations } = require('../controllers/reservationController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/',  createReservation);
router.put('/:reservationCode', protect, updateReservation);  // Modifier une réservation avec un code de réservation
router.delete('/:id', protect, admin, deleteReservation);  // Supprimer une réservation (admin)
// Route pour obtenir les réservations filtrées
router.get('/reservations', getReservations);

// Route pour obtenir les statistiques des réservations
router.get('/reservations/stats',  getReservationCounts);

router.get('/code/:reservationCode',  getReservationByCode);
router.get('/:id/availability', getFieldAvailability);
router.delete('/pending/cleanup', deletePendingReservations);  // Nettoyage des réservations "pending"

module.exports = router;
