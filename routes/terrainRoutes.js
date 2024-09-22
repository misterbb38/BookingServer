const express = require('express');
const {
  createTerrain,
  getAllTerrains,
  getTerrainById,
  updateTerrain,
  deleteTerrain
} = require('../controllers/terrainController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

// Routes CRUD pour les terrains (Admin uniquement)
router.post('/', protect, admin, createTerrain);
router.get('/', getAllTerrains); // Accessible à tous les utilisateurs
router.get('/:id', getTerrainById); // Accessible à tous les utilisateurs
router.put('/:id', protect, admin, updateTerrain); // Admin uniquement
router.delete('/:id', protect, admin, deleteTerrain); // Admin uniquement

module.exports = router;
