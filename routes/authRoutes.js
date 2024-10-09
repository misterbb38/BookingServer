const express = require('express');
const { registerUser, authUser, getUserProfile, getAllUsers, deleteUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Inscription
router.post('/register', registerUser);

// Connexion
router.post('/login', authUser);

// Profil utilisateur (nécessite authentification)
router.get('/profile', protect, getUserProfile);

router.get('/users', getAllUsers);

router.delete('/users/:id', deleteUser);


module.exports = router;
