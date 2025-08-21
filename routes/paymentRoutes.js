const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-order', authMiddleware, paymentController.createOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.get("/my-payments", authMiddleware, paymentController.getMyPayments);

module.exports = router;
