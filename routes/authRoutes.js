const express = require('express');
const { registerUser, authUser, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Inscription
router.post('/register', registerUser);

// Connexion
router.post('/login', authUser);

// Profil utilisateur (nécessite authentification)
router.get('/profile', protect, getUserProfile);

module.exports = router;
