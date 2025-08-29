const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const membershipController = require('../controllers/membershipController');
const paymentController = require('../controllers/paymentController');
const qrCodeController = require('../controllers/qrCodeController');

// Public routes for admin auth
router.post('/register', adminController.registerAdmin);
router.post('/login', adminController.loginAdmin);

// Admin controlling users - only admin can access
router.post('/user/create', authMiddleware, adminMiddleware, adminController.createUser);
router.get('/user', authMiddleware, adminMiddleware, adminController.getAllUsers);
router.put('/user/update/:id', authMiddleware, adminMiddleware, adminController.updateAnyUser);
router.delete('/user/delete/:id', authMiddleware, adminMiddleware, adminController.deleteAnyUser);
router.post('/user/mass-delete', authMiddleware, adminMiddleware, adminController.massDeleteAnyUsers);

// Membership Plans controllers - only admin
router.get('/plans', authMiddleware, adminMiddleware, membershipController.getAllPlansForAdmin);
router.post('/plans/create', authMiddleware, adminMiddleware, membershipController.createPlan);
router.put('/plans/:id', authMiddleware, adminMiddleware, membershipController.updatePlan);
router.delete('/plans/:id', authMiddleware, adminMiddleware, membershipController.deletePlan);

// Admin controlling payments - only admin
// router.get('/payments/user/:user_id', authMiddleware, adminMiddleware, paymentController.getPaymentsByUser);
router.post('/payments/verify', authMiddleware, adminMiddleware, paymentController.verifyPayment);
router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf } }), paymentController.handleWebhook);

// Admin controlling QR Codes - only admin
router.get('/qr-codes/user/:user_id', authMiddleware, adminMiddleware, qrCodeController.getQRCodeByUser);
router.put('/qr-codes/deactivate/:id', authMiddleware, adminMiddleware, qrCodeController.toggleAllQRCodesByAdmin);

module.exports = router;
