const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors')
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const terrainRoutes = require('./routes/terrainRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');


connectDB();

const app = express();

app.use(express.json());
app.use(cors());
// app.use(cors({
//     origin: 'https://hist-front-app.onrender.com', // Autoriser seulement cette origine à accéder à l'API
// }));


// Routes
app.use('/api/users', authRoutes); // Routes pour l'authentification
app.use('/api/terrains', terrainRoutes); // Routes pour les terrains
app.use('/api/reservations', reservationRoutes); // Routes pour les réservations
app.use('/api/payments', paymentRoutes); // Routes pour les paiements PayTech

// Correction pour définir une route racine
app.get('/', function (req, res) {
  return res.status(200).json({ message: 'Welcome to the API' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
