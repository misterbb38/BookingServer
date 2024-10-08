const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// Fonction pour générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Inscription utilisateur
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, telephone, password, role } = req.body;

  const userExists = await User.findOne({ telephone });

  if (userExists) {
    return res.status(400).json({ success: false, message: 'Cet utilisateur existe déjà' });
  }

  const user = await User.create({ name, telephone, password, role });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      telephone: user.telephone,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ success: false, message: 'Données invalides' });
  }
});

// Connexion utilisateur
exports.authUser = asyncHandler(async (req, res) => {
  const { telephone, password } = req.body;

  const user = await User.findOne({ telephone });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      telephone: user.telephone,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ success: false, message: 'telephone ou mot de passe incorrect' });
  }
});

// Obtenir le profil utilisateur
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      telephone: user.telephone,
      role: user.role,
    });
  } else {
    res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
  }
});

// Obtenir tous les utilisateurs
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}); // Récupérer tous les utilisateurs
  if (users) {
    res.json(users);
  } else {
    res.status(404).json({ success: false, message: 'Aucun utilisateur trouvé' });
  }
});

// Supprimer un utilisateur
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await User.deleteOne({ _id: req.params.id }); // Utiliser deleteOne() pour supprimer l'utilisateur
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } else {
    res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
  }
});

