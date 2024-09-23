const asyncHandler = require('express-async-handler');
const Terrain = require('../models/terrainModel');

// Créer un terrain
exports.createTerrain = asyncHandler(async (req, res) => {
  const { name, location, description, pricePerHour } = req.body;

  const terrain = new Terrain({
    name,
    location,
    description,
    pricePerHour,
  });

  const createdTerrain = await terrain.save();
  res.status(201).json({ success: true, data: createdTerrain });
});

// Obtenir tous les terrains
exports.getAllTerrains = asyncHandler(async (req, res) => {
  const terrains = await Terrain.find({});
  res.status(200).json({ success: true, data: terrains });
});

// Obtenir un terrain par ID
exports.getTerrainById = asyncHandler(async (req, res) => {
  const terrain = await Terrain.findById(req.params.id);

  if (!terrain) {
    res.status(404).json({ success: false, message: 'Terrain non trouvé' });
    return;
  }

  res.status(200).json({ success: true, data: terrain });
});

// Mettre à jour un terrain
exports.updateTerrain = asyncHandler(async (req, res) => {
  const { name, location, description, pricePerHour } = req.body;

  const terrain = await Terrain.findById(req.params.id);

  if (!terrain) {
    res.status(404).json({ success: false, message: 'Terrain non trouvé' });
    return;
  }

  terrain.name = name || terrain.name;
  terrain.location = location || terrain.location;
  terrain.description = description || terrain.description;
  terrain.pricePerHour = pricePerHour || terrain.pricePerHour;

  const updatedTerrain = await terrain.save();
  res.status(200).json({ success: true, data: updatedTerrain });
});

// Supprimer un terrain
exports.deleteTerrain = asyncHandler(async (req, res) => {
  const terrain = await Terrain.findById(req.params.id);

  if (!terrain) {
    return res.status(404).json({ success: false, message: 'Terrain non trouvé' });
  }

  await Terrain.findByIdAndDelete(req.params.id); // Remplace remove() par findByIdAndDelete()

  res.status(200).json({ success: true, message: 'Terrain supprimé avec succès' });
});
