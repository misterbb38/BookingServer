const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const terrainRoutes = require('./routes/terrainRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');


connectDB();

const app = express();

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes); // Routes pour l'authentification
app.use('/api/terrains', terrainRoutes); // Routes pour les terrains
app.use('/api/reservations', reservationRoutes); // Routes pour les réservations
app.use('/api/payments', paymentRoutes); // Routes pour les paiements PayTech

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
