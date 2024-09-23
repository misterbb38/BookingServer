const express = require('express');
const { createReservation, updateReservation, deleteReservation, getFieldAvailability, getReservationByCode, deletePendingReservations } = require('../controllers/reservationController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/',  createReservation);
router.put('/:reservationCode', protect, updateReservation);  // Modifier une réservation avec un code de réservation
router.delete('/:id', protect, admin, deleteReservation);  // Supprimer une réservation (admin)
router.get('/code/:reservationCode', protect, getReservationByCode);
router.get('/:id/availability', getFieldAvailability);
router.delete('/pending/cleanup', deletePendingReservations);  // Nettoyage des réservations "pending"

module.exports = router;
