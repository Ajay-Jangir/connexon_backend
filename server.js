const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
// const publicRoutes = require('./routes/publicRoutes');
const qrCodeRoutes = require('./routes/qrCodeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());


// Routes placeholder
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
// app.use('/', publicRoutes);
app.use('/api/qr-code', qrCodeRoutes);


// Start server
app.listen(PORT, host,() => {
    console.log(`Server running on http://localhost:${PORT} and http://${host}:${PORT}`);
});
